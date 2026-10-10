const { Op } = require('sequelize');
const { Test, TestSession, Task, TaskAttempt } = require('../models/models');
const { buildSessionPayload, sortTestTasks } = require('./helpers');

const getMyTests = async (req, res) => {
  const student_id = req.user.id;
  const sessions = await TestSession.findAll({
    where: { student_id },
    include: [{
      model: Test,
      required: true,
      include: [{ model: Task, attributes: ['id'], through: { attributes: [] } }]
    }],
    order: [['createdAt', 'DESC']]
  });

  const formatted = sessions.map(session => {
    const maxScore = session.test?.tasks?.length || 0;
    return {
      id: session.id,
      status: session.status,
      score: session.score,
      is_passed: session.is_passed,
      available_until: session.available_until,
      started_at: session.started_at,
      completed_at: session.completed_at,
      test: session.test ? {
        id: session.test.id,
        title: session.test.title,
        time_limit: session.test.time_limit,
        passing_score: session.test.passing_score ?? maxScore,
        max_score: maxScore
      } : null
    };
  });

  const pendingCount = formatted.filter(item => item.status === 'pending').length;

  return res.json({
    sessions: formatted,
    pending_count: pendingCount
  });
};

const startTestSession = async (req, res) => {
  const { session_id } = req.body;
  const session = await TestSession.findByPk(session_id, {
    include: [{
      model: Test,
      include: [{ model: Task, through: { attributes: ['order_index'] } }]
    }]
  });

  if (!session || session.student_id !== req.user.id) {
    return res.status(403).json({ message: 'Нет доступа к тесту' });
  }

  if (session.status === 'closed') {
    return res.status(403).json({ message: 'Тест закрыт администратором' });
  }

  if (session.status === 'in_progress') {
    await session.reload({
      include: [{
        model: Test,
        include: [{ model: Task, through: { attributes: ['order_index'] } }]
      }]
    });
    return res.json(buildSessionPayload(session));
  }

  if (session.available_until && new Date(session.available_until) < new Date()) {
    return res.status(400).json({ message: 'Истек срок доступности теста' });
  }

  if (session.status !== 'pending') {
    return res.status(400).json({ message: 'Тест уже начат или завершен' });
  }

  const existingActiveSession = await TestSession.findOne({
    where: {
      student_id: session.student_id,
      test_id: session.test_id,
      status: 'in_progress',
      id: { [Op.ne]: session.id }
    }
  });
  if (existingActiveSession) {
    return res.status(400).json({ message: 'Нельзя начать несколько активных попыток одного теста' });
  }

  session.status = 'in_progress';
  session.started_at = new Date();
  await session.save();

  await session.reload({
    include: [{
      model: Test,
      include: [{ model: Task, through: { attributes: ['order_index'] } }]
    }]
  });

  return res.json(buildSessionPayload(session));
};

const submitTestSession = async (req, res) => {
  const { session_id, answers } = req.body;
  const session = await TestSession.findByPk(session_id, {
    include: [{
      model: Test,
      include: [{ model: Task, through: { attributes: ['order_index'] } }]
    }]
  });

  if (!session || session.student_id !== req.user.id) {
    return res.status(403).json({ message: 'Нет доступа' });
  }

  if (session.status === 'closed') {
    return res.status(403).json({ message: 'Тест закрыт администратором' });
  }

  if (session.status === 'completed') {
    return res.status(400).json({ message: 'Сессия уже завершена' });
  }

  if (session.status !== 'in_progress') {
    return res.status(400).json({ message: 'Сначала начните тест' });
  }

  let score = 0;
  const tasks = sortTestTasks(session.test?.tasks || []);

  for (const task of tasks) {
    const studentAnswer = answers[task.id] || '';
    const isCorrect = (task.answer || '').trim().toLowerCase() === studentAnswer.trim().toLowerCase();

    if (isCorrect) score++;

    await TaskAttempt.create({
      student_id: req.user.id,
      problem_id: task.id,
      test_session_id: session.id,
      answer_text: studentAnswer,
      is_correct: isCorrect
    });
  }

  const maxScore = tasks.length;
  const passingScore = session.test.passing_score ?? maxScore;
  const isPassed = maxScore === 0 ? true : score >= passingScore;

  session.status = 'completed';
  session.completed_at = new Date();
  session.score = score;
  session.is_passed = isPassed;
  await session.save();

  return res.json({ score, total: tasks.length, is_passed: isPassed, passing_score: passingScore });
};

module.exports = {
  getMyTests,
  startTestSession,
  submitTestSession
};
