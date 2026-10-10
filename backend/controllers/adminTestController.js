const { fn, col } = require('sequelize');
const { User, Task, Test, TestSession } = require('../models/models');
const { getIdOrRespond } = require('./helpers');

const getAdminTests = async (req, res) => {
  const tests = await Test.findAll({
    where: { is_archived: false },
    include: [
      { model: User, as: 'teacher', attributes: ['id', 'full_name', 'email'] },
      { model: Task, attributes: ['id'], through: { attributes: [] } }
    ],
    order: [['createdAt', 'DESC']]
  });

  const sessionsCountRaw = await TestSession.findAll({
    attributes: ['test_id', [fn('COUNT', col('id')), 'count']],
    group: ['test_id'],
    raw: true
  });
  const sessionsCount = sessionsCountRaw.reduce((acc, row) => {
    acc[row.test_id] = Number(row.count);
    return acc;
  }, {});

  const formatted = tests.map(test => ({
    id: test.id,
    title: test.title,
    time_limit: test.time_limit,
    createdAt: test.createdAt,
    taskCount: test.tasks.length,
    sessionsCount: sessionsCount[test.id] || 0,
    teacher: test.teacher
  }));

  return res.json(formatted);
};

const deleteTestByAdmin = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;

  const test = await Test.findByPk(id);
  if (!test) {
    return res.status(404).json({ message: 'Тест не найден' });
  }

  if (test.is_archived) {
    return res.json({ message: 'Тест уже в архиве' });
  }

  test.is_archived = true;
  await test.save();
  return res.json({ message: 'Тест перемещен в архив' });
};

module.exports = {
  getAdminTests,
  deleteTestByAdmin
};
