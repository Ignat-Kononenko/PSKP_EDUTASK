const { fn, col } = require('sequelize');
const { User, Task, Test, TestSession, TaskAttempt } = require('../models/models');
const {
  getIdOrRespond,
  ensureTeacherOwnsTest,
  ensureTaskIdsExist,
  validateTestLimits,
  ensureTestEditable,
  ensureDeadlineInFuture,
  parseAvailableUntilOrThrow,
  buildSessionPayload,
  sortTestTasks
} = require('./helpers');

const getTeacherTests = async (req, res) => {
  const teacher_id = req.user.id;
  const tests = await Test.findAll({
    where: { teacher_id, is_archived: false },
    include: [{ model: Task, attributes: ['id'], through: { attributes: [] } }],
    order: [['createdAt', 'DESC']]
  });

  const sessionsCountRaw = await TestSession.findAll({
    attributes: ['test_id', [fn('COUNT', col('id')), 'count']],
    group: ['test_id'],
    where: { test_id: tests.map(t => t.id) },
    raw: true
  });
  const sessionsCountMap = sessionsCountRaw.reduce((acc, row) => {
    acc[row.test_id] = Number(row.count);
    return acc;
  }, {});

  return res.json(tests.map(test => ({
    id: test.id,
    title: test.title,
    time_limit: test.time_limit,
    passing_score: test.passing_score,
    taskCount: test.tasks.length,
    createdAt: test.createdAt,
    sessionsCount: sessionsCountMap[test.id] || 0
  })));
};

const getTeacherTestById = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const test = await Test.findByPk(id, {
    include: [{
      model: Task,
      where: { is_archived: false },
      required: false,
      through: { attributes: [] }
    }]
  });

  if (!test || test.is_archived) {
    return res.status(404).json({ message: 'Тест не найден' });
  }

  try {
    ensureTeacherOwnsTest(req, test);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Ошибка доступа' });
  }

  return res.json({
    id: test.id,
    title: test.title,
    time_limit: test.time_limit,
    passing_score: test.passing_score,
    tasks: (test.tasks || []).map(task => ({
      id: task.id,
      title: task.title,
      content: task.content,
      topic_id: task.topic_id,
      is_public: task.is_public,
      author_id: task.author_id
    }))
  });
};

const createTest = async (req, res) => {
  const teacher_id = req.user.id;
  const { title, task_ids = [], time_limit, passing_score } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Название теста обязательно' });
  }

  let normalizedTaskIds;
  try {
    normalizedTaskIds = await ensureTaskIdsExist(task_ids);
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const normalizedTimeLimit = Number(time_limit || normalizedTaskIds.length * 3);
  const normalizedPassingScore = Number(passing_score ?? normalizedTaskIds.length);

  try {
    validateTestLimits({ taskCount: normalizedTaskIds.length, timeLimit: normalizedTimeLimit, passingScore: normalizedPassingScore });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const test = await Test.create({
    title: title.trim(),
    teacher_id,
    time_limit: normalizedTimeLimit,
    passing_score: normalizedPassingScore,
    is_archived: false
  });
  await test.setTasks(normalizedTaskIds);
  return res.json(test);
};

const updateTest = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;

  try {
    const test = await Test.findByPk(id, {
      include: [{ model: Task, attributes: ['id'], through: { attributes: [] } }]
    });
    if (!test || test.is_archived) throw { status: 404, message: 'Тест не найден' };

    ensureTeacherOwnsTest(req, test);
    await ensureTestEditable(id);

    const { title, task_ids, time_limit, passing_score } = req.body;
    const payload = {};

    if (title !== undefined) {
      if (!title || !title.trim()) throw { status: 400, message: 'Название теста не может быть пустым' };
      payload.title = title.trim();
    }
    if (time_limit !== undefined) payload.time_limit = Number(time_limit);
    if (passing_score !== undefined) payload.passing_score = Number(passing_score);

    const targetTaskCount = Array.isArray(task_ids) ? task_ids.length : (test.tasks?.length || 0);

    validateTestLimits({
      taskCount: targetTaskCount,
      timeLimit: payload.time_limit || test.time_limit,
      passingScore: payload.passing_score || test.passing_score
    });

    await test.update(payload);
    if (Array.isArray(task_ids)) {
      const normalizedTaskIds = await ensureTaskIdsExist(task_ids);
      await test.setTasks(normalizedTaskIds);
    }
    return res.json(test);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Ошибка при обновлении теста';
    return res.status(status).json({ message });
  }
};

const deleteTest = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const test = await Test.findByPk(id);
  if (!test) return res.status(404).json({ message: 'Тест не найден' });

  try {
    ensureTeacherOwnsTest(req, test);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Ошибка доступа' });
  }

  const blocking = await TestSession.findOne({ where: { test_id: id, status: 'in_progress' } });
  if (blocking) {
    return res.status(409).json({ message: 'Нельзя архивировать тест с активными попытками' });
  }

  test.is_archived = true;
  await test.save();
  return res.json({ message: 'Тест перемещен в архив' });
};

const validateStudent = async (studentId, teacherId) => {
  const student = await User.findOne({
    where: { id: studentId, teacher_id: teacherId, role: 'STUDENT', is_graduated: false }
  });
  if (!student) {
    throw new Error(`Ученик с ID ${studentId} не найден или не принадлежит вам`);
  }
  return student.id;
};

const createTestSession = (testId, studentId, deadline) => {
  return TestSession.create({
    test_id: testId,
    student_id: studentId,
    available_until: deadline,
    status: 'pending'
  });
};

const assignTest = async (req, res) => {
  const { test_id, student_ids: rawStudentIds, available_until } = req.body;
  const teacher_id = req.user.id;

  const test = await Test.findByPk(test_id);
  if (!test || test.teacher_id !== teacher_id) {
    return res.status(403).json({ message: 'Нет доступа к тесту' });
  }

  if (!Array.isArray(rawStudentIds) || rawStudentIds.length === 0) {
    return res.status(400).json({ message: 'Выберите учеников для назначения' });
  }

  let deadline;
  try {
    deadline = ensureDeadlineInFuture(parseAvailableUntilOrThrow(available_until));
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || 'Некорректная дата' });
  }

  try {
    const resolvedStudentIds = await Promise.all(rawStudentIds.map(id => validateStudent(id, teacher_id)));
    const sessions = await Promise.all(resolvedStudentIds.map(id => createTestSession(test_id, id, deadline)));
    return res.json(sessions);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const cancelTestAssignment = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;

  const session = await TestSession.findByPk(id, {
    include: [{ model: Test, attributes: ['id', 'teacher_id'] }]
  });

  if (!session) {
    return res.status(404).json({ message: 'Назначение не найдено' });
  }

  if (!session.test || session.test.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'Нет доступа к назначению' });
  }

  if (session.status !== 'pending') {
    return res.status(400).json({ message: 'Можно отменить только тест, который ученик ещё не начал' });
  }

  await session.destroy();
  return res.json({ message: 'Назначение отменено' });
};

const getTestSessionAnswers = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;

  const session = await TestSession.findByPk(id, {
    include: [
      { model: Test, include: [{ model: Task, through: { attributes: ['order_index'] } }] },
      { model: User, attributes: ['id', 'full_name', 'email'] },
      { model: TaskAttempt, attributes: ['id', 'problem_id', 'answer_text', 'is_correct', 'createdAt'] }
    ]
  });

  if (!session) return res.status(404).json({ message: 'Сессия не найдена' });
  if (session.test.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'Нет доступа к ответам' });
  }

  const attemptsMap = buildAttemptsMap(session.task_attempts);
  const answers = formatTestAnswers(session.test.tasks || [], attemptsMap);

  return res.json({
    session: {
      id: session.id,
      status: session.status,
      score: session.score,
      is_passed: session.is_passed,
      completed_at: session.completed_at
    },
    test: {
      id: session.test.id,
      title: session.test.title,
      passing_score: session.test.passing_score,
      max_score: session.test.tasks.length
    },
    student: session.user,
    answers
  });
};

module.exports = {
  getTeacherTests,
  getTeacherTestById,
  createTest,
  updateTest,
  deleteTest,
  assignTest,
  cancelTestAssignment,
  getTestSessionAnswers
};
