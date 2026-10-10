const { User } = require('../models/models');
const { getIdOrRespond, buildStudentProgressPayload } = require('./helpers');

const getMyStudents = async (req, res) => {
  const teacher_id = req.user.id;
  const students = await User.findAll({
    where: {
      teacher_id,
      role: 'STUDENT',
      is_graduated: false
    }
  });
  return res.json(students);
};

const detachStudent = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;

  const where = { id, role: 'STUDENT' };
  
  if (req.user.role !== 'ADMIN') {
    where.teacher_id = req.user.id;
  }

  const [updatedCount] = await User.update({ is_graduated: true }, { where });
  if (updatedCount === 0) {
    return res.status(404).json({ message: 'Ученик не найден или недоступен для завершения' });
  }
  return res.json({ message: 'Ученик завершил обучение' });
};

const getStudentProgress = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const teacher_id = req.user.id;

  const payload = await buildStudentProgressPayload({ studentId: id, teacherId: teacher_id });
  if (!payload) {
    return res.status(404).json({ message: 'Ученик не найден или не ваш' });
  }

  return res.json(payload);
};

module.exports = {
  getMyStudents,
  detachStudent,
  getStudentProgress
};
