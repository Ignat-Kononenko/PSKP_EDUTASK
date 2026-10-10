const { User, Topic, Task, Test, TestTask, TestSession, TaskAttempt } = require('../models/models');
const { Op, fn, col } = require('sequelize');
const crypto = require('crypto');

const MIN_TEST_TASKS = 5;
const MAX_TEST_TASKS = 60;
const MINUTES_PER_TASK = 3;
const MAX_TEST_TIME_LIMIT = 180;
const MIN_ASSIGNMENT_OFFSET_HOURS = 4;

const escapeHtmlString = (value) => {
  if (value === null || value === undefined) return value;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const parseAvailableUntilOrThrow = (value) => {
  if (!value) {
    const error = new Error('Укажите крайний срок доступности теста');
    error.status = 400;
    throw error;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('Некорректный формат даты доступности');
    error.status = 400;
    throw error;
  }
  return parsed;
};

const ensureDeadlineInFuture = (deadline) => {
  const now = new Date();
  const minDate = new Date(now.getTime() + MIN_ASSIGNMENT_OFFSET_HOURS * 60 * 60 * 1000);
  if (deadline < minDate) {
    const error = new Error('Дата "доступен до" должна быть минимум через 4 часа от текущего времени');
    error.status = 400;
    throw error;
  }
  return deadline;
};

const sanitizeTaskHtmlFields = (payload = {}) => {
  const sanitized = {};
  ['content', 'hint', 'solution'].forEach((field) => {
    if (payload[field] !== undefined) {
      sanitized[field] = payload[field] === null ? null : escapeHtmlString(payload[field]);
    }
  });
  return sanitized;
};

const ensureTeacherOwnsTask = (req, task) => {
  if (!task) {
    const error = new Error('Задача не найдена');
    error.status = 404;
    throw error;
  }
  if (req.user.role === 'ADMIN') return;
  if (req.user.role === 'TEACHER') return;
  // if (req.user.role !== 'TEACHER' || task.author_id !== req.user.id) {
  //   const error = new Error('Можно управлять только своими задачами');
  //   error.status = 403;
  //   throw error;
  // }
};

const ensureTeacherOwnsTest = (req, test) => {
  if (!test) {
    const error = new Error('Тест не найден');
    error.status = 404;
    throw error;
  }
  if (req.user.role === 'ADMIN') return;
  if (req.user.role !== 'TEACHER' || test.teacher_id !== req.user.id) {
    const error = new Error('Можно управлять только своими тестами');
    error.status = 403;
    throw error;
  }
};

const resolveAuthorId = (req, explicitAuthorId) => {
  if (explicitAuthorId !== undefined) return explicitAuthorId;
  if (req.user.role === 'TEACHER') return req.user.id;
  return null;
};

const buildParamError = (label) => {
  const error = new Error(`Параметр ${label} должен быть положительным числом`);
  error.status = 400;
  return error;
};

const parseIdParam = (value, label = 'id') => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw buildParamError(label);
  }
  return parsed;
};

const getIdOrRespond = (req, res, key = 'id') => {
  try {
    return parseIdParam(req.params[key], key);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message || 'Некорректный идентификатор' });
    return null;
  }
};

const buildTaskVisibilityClause = (user) => {
  if (!user || user.role === 'STUDENT') {
    return { is_public: true };
  }
  if (user.role === 'ADMIN') {
    return {};
  }
  if (user.role === 'TEACHER') {
    return {
      [Op.or]: [
        { is_public: true },
        { author_id: user.id }
      ]
    };
  }
  return { is_public: true };
};

const canUserAccessTask = (user, task) => {
  if (!task) return false;
  if (task.is_public) return true;
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'TEACHER' && task.author_id === user.id) return true;
  return false;
};

const buildValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const normalizeTaskIdsInput = (ids = []) => {
  if (!Array.isArray(ids)) return [];
  return Array.from(new Set(ids.map((value) => Number(value)))).filter((id) => Number.isInteger(id) && id > 0);
};

const ensureTaskIdsExist = async (taskIds = []) => {
  const normalized = normalizeTaskIdsInput(taskIds);
  if (!normalized.length) {
    throw buildValidationError('Укажите задачи теста (минимум 5, максимум 60)');
  }
  if (normalized.length < MIN_TEST_TASKS) {
    throw buildValidationError(`Нужно минимум ${MIN_TEST_TASKS} уникальных задач. Сейчас выбрано ${normalized.length}.`);
  }
  if (normalized.length > MAX_TEST_TASKS) {
    throw buildValidationError(`Слишком много задач: выбрано ${normalized.length}, максимум ${MAX_TEST_TASKS}.`);
  }
  const foundCount = await Task.count({ where: { id: normalized, is_archived: false } });
  if (foundCount !== normalized.length) {
    throw buildValidationError('Некоторые задачи не найдены. Проверьте список задач.');
  }
  return normalized;
};

const validateTestLimits = ({ taskCount, timeLimit, passingScore }) => {
  if (taskCount < MIN_TEST_TASKS || taskCount > MAX_TEST_TASKS) {
    throw buildValidationError(`Количество задач в тесте должно быть от ${MIN_TEST_TASKS} до ${MAX_TEST_TASKS}`);
  }
  if (!Number.isInteger(timeLimit) || timeLimit <= 0) {
    throw buildValidationError('time_limit должен быть целым положительным числом (в минутах)');
  }
  const minTime = taskCount * MINUTES_PER_TASK;
  if (timeLimit < minTime) {
    throw buildValidationError(`Минимальное время для ${taskCount} задач: ${minTime} минут`);
  }
  if (timeLimit > MAX_TEST_TIME_LIMIT) {
    throw buildValidationError('Время теста не может превышать 180 минут');
  }
  if (!Number.isInteger(passingScore) || passingScore < 1 || passingScore > taskCount) {
    throw buildValidationError(`passing_score должен быть в диапазоне от 1 до ${taskCount}`);
  }
  return { timeLimit, passingScore };
};

const sortTestTasks = (tasks = []) => {
  return [...tasks].sort((a, b) => {
    const orderA = a.test_task?.order_index ?? a.id;
    const orderB = b.test_task?.order_index ?? b.id;
    return orderA - orderB;
  });
};

const serializeTestTasks = (tasks = []) => {
  return sortTestTasks(tasks).map(task => ({
    id: task.id,
    task_id: task.id,
    title: task.title,
    content: task.content,
    hint: task.hint,
    solution: task.solution,
    image_data: task.image_data,
    topic_id: task.topic_id,
    is_public: task.is_public
  }));
};

const buildSessionPayload = (session) => {
  const sessionJson = session.toJSON();
  const tasks = serializeTestTasks(session.test?.tasks || []);
  const testPayload = sessionJson.test ? {
    id: sessionJson.test.id,
    title: sessionJson.test.title,
    time_limit: sessionJson.test.time_limit,
    passing_score: sessionJson.test.passing_score,
    tasks
  } : null;

  return {
    id: sessionJson.id,
    status: sessionJson.status,
    score: sessionJson.score,
    is_passed: sessionJson.is_passed,
    available_until: sessionJson.available_until,
    started_at: sessionJson.started_at,
    completed_at: sessionJson.completed_at,
    test: testPayload
  };
};

const buildTopicTree = (topics, taskCounts, parentId = null) => {
  return topics
    .filter(topic => (topic.parent_id || null) === parentId)
    .map(topic => {
      const children = buildTopicTree(topics, taskCounts, topic.id);
      const childrenTotal = children.reduce((sum, child) => sum + (child.taskCount || 0), 0);
      const directCount = taskCounts[topic.id] || 0;
      return {
        ...topic,
        directTaskCount: directCount,
        taskCount: directCount + childrenTotal,
        children
      };
    });
};

const archiveTasks = async (taskIds = []) => {
  if (!taskIds || !taskIds.length) return;
  await Task.update({ is_archived: true }, { where: { id: taskIds } });
};

const cascadeDeleteTests = async (testIds = []) => {
  if (!testIds.length) return;
  const sessions = await TestSession.findAll({
    where: { test_id: testIds },
    attributes: ['id'],
    raw: true
  });
  const sessionIds = sessions.map(s => s.id);
  if (sessionIds.length) {
    await TaskAttempt.destroy({ where: { test_session_id: sessionIds } });
  }
  await TestSession.destroy({ where: { test_id: testIds } });
  await TestTask.destroy({ where: { test_id: testIds } });
  await Test.destroy({ where: { id: testIds } });
};

const generateInviteCode = () => crypto.randomBytes(6).toString('hex').toUpperCase();

const ensureParentIsRootTopic = async (parent_id) => {
  if (!parent_id) return null;
  const parent = await Topic.findByPk(parent_id);
  if (!parent) {
    const error = new Error('Родительская тема не найдена');
    error.status = 404;
    throw error;
  }
  if (parent.parent_id !== null) {
    const error = new Error('Подтемы можно создавать только внутри корневых тем');
    error.status = 400;
    throw error;
  }
  return parent;
};

const resolveTaskPayload = (body) => {
  const { title, content, answer, hint, solution, topic_id, image_data, is_public = true } = body;
  if (!title || !title.trim()) {
    const error = new Error('Название задачи обязательно');
    error.status = 400;
    throw error;
  }
  if (!content) {
    const error = new Error('Текст задачи обязателен');
    error.status = 400;
    throw error;
  }
  if (!answer) {
    const error = new Error('Ответ обязателен');
    error.status = 400;
    throw error;
  }
  if (!topic_id) {
    const error = new Error('Укажите тему задачи');
    error.status = 400;
    throw error;
  }

  return { title: title.trim(), content, answer, hint, solution, topic_id, image_data, is_public };
};

const ensureTopicSupportsTasks = async (topicIdRaw) => {
  const topic_id = Number(topicIdRaw);
  if (!Number.isInteger(topic_id) || topic_id <= 0) {
    throw buildValidationError('Некорректная тема задачи');
  }
  const topic = await Topic.findByPk(topic_id);
  if (!topic) {
    const error = new Error('Тема не найдена');
    error.status = 404;
    throw error;
  }
  if (topic.parent_id === null) {
    const error = new Error('Нельзя добавлять задачи в корневую тему. Выберите подтему.');
    error.status = 400;
    throw error;
  }
  return topic;
};

const ensureTestEditable = async (testId) => {
  const blocking = await TestSession.findOne({ where: { test_id: testId, status: 'in_progress' } });
  if (blocking) {
    const error = new Error('Нельзя изменять тест, пока есть активные попытки');
    error.status = 409;
    throw error;
  }
};

const canSeePremiumContent = (user) => user.role !== 'STUDENT' || !!user.teacher_id;

const maskPremiumFields = (task, canSeePremium) => {
  if (!canSeePremium && task) {
    task.hint = null;
    task.solution = null;
  }
  return task;
};

const buildStudentProgressPayload = async ({ studentId, teacherId }) => {
  const studentWhere = { id: studentId, role: 'STUDENT' };
  if (teacherId) {
    studentWhere.teacher_id = teacherId;
  }

  const student = await User.findOne({ where: studentWhere });
  if (!student) {
    return null;
  }

  const attempts = await TaskAttempt.findAll({
    where: { student_id: studentId, test_session_id: null },
    include: [{ model: Task, include: [{ model: Topic, attributes: ['id', 'title', 'subject'] }] }],
    order: [['createdAt', 'ASC']]
  });

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter(a => a.is_correct).length;
  const taskStats = {};

  attempts.forEach(attempt => {
    if (!attempt.task) return;
    if (!taskStats[attempt.problem_id]) {
      taskStats[attempt.problem_id] = {
        task_id: attempt.task.id,
        title: attempt.task.title,
        topic: attempt.task.topic ? {
          id: attempt.task.topic.id,
          title: attempt.task.topic.title,
          subject: attempt.task.topic.subject
        } : null,
        attempts: 0,
        solved_at: null
      };
    }
    taskStats[attempt.problem_id].attempts += 1;
    if (attempt.is_correct && !taskStats[attempt.problem_id].solved_at) {
      taskStats[attempt.problem_id].solved_at = attempt.createdAt;
    }
  });

  const solvedTasks = Object.values(taskStats)
    .filter(item => item.solved_at)
    .sort((a, b) => new Date(b.solved_at) - new Date(a.solved_at));

  const testInclude = {
    model: Test,
    required: true,
    include: [{ model: Task, attributes: ['id'], through: { attributes: [] } }]
  };
  if (teacherId) {
    testInclude.where = { teacher_id: teacherId };
  }

  const sessions = await TestSession.findAll({
    where: { student_id: studentId },
    include: [testInclude],
    order: [['createdAt', 'DESC']]
  });

  const testAttempts = sessions.map(session => {
    const maxScore = session.test.tasks.length;
    return {
      session_id: session.id,
      test_id: session.test.id,
      test_title: session.test.title,
      status: session.status,
      date: session.completed_at || session.updatedAt,
      score: session.score || 0,
      max_score: maxScore,
      passing_score: session.test.passing_score ?? maxScore,
      is_passed: session.is_passed,
      available_until: session.available_until
    };
  });

  const testsPassed = testAttempts.filter(item => item.is_passed).length;
  const testsFailed = testAttempts.filter(item => item.status === 'completed' && item.is_passed === false).length;
  const avgScorePercent = testAttempts.length
    ? Number(((testAttempts.reduce((sum, item) => sum + (item.max_score ? (item.score / item.max_score) : 0), 0) / testAttempts.length) * 100).toFixed(1))
    : 0;

  const summary = {
    solved_tasks: solvedTasks.length,
    attempts: totalAttempts,
    accuracy_percent: totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
    tests_passed: testsPassed,
    tests_failed: testsFailed,
    avg_score_percent: avgScorePercent
  };

  return {
    student: {
      id: student.id,
      full_name: student.full_name,
      email: student.email
    },
    summary,
    solved_tasks: solvedTasks,
    test_attempts: testAttempts
  };
};

const buildTopicParentMap = (topics) => {
  return new Map(topics.map((topic) => [topic.id, topic.parent_id]));
};

const findRootId = (topicId, parentMap) => {
  if (!topicId) return null;
  let currentId = topicId;
  const visited = new Set();
  while (parentMap.has(currentId) && parentMap.get(currentId) !== null) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    currentId = parentMap.get(currentId);
    if (!currentId) break;
  }
  return currentId || topicId;
};

const buildAttemptsMap = (taskAttempts) => {
  return (taskAttempts || []).reduce((acc, attempt) => {
    acc[attempt.problem_id] = attempt;
    return acc;
  }, {});
};

const formatTestAnswers = (tasks, attemptsMap) => {
  return sortTestTasks(tasks).map(task => ({
    task_id: task.id,
    title: task.title,
    content: task.content,
    correct_answer: task.answer,
    student_answer: attemptsMap[task.id]?.answer_text || null,
    is_correct: attemptsMap[task.id]?.is_correct || false,
    answered_at: attemptsMap[task.id]?.createdAt || null
  }));
};

module.exports = {
  MIN_TEST_TASKS,
  MAX_TEST_TASKS,
  MINUTES_PER_TASK,
  MAX_TEST_TIME_LIMIT,
  MIN_ASSIGNMENT_OFFSET_HOURS,
  escapeHtmlString,
  parseAvailableUntilOrThrow,
  ensureDeadlineInFuture,
  sanitizeTaskHtmlFields,
  ensureTeacherOwnsTask,
  ensureTeacherOwnsTest,
  resolveAuthorId,
  buildParamError,
  parseIdParam,
  getIdOrRespond,
  buildTaskVisibilityClause,
  canUserAccessTask,
  buildValidationError,
  normalizeTaskIdsInput,
  ensureTaskIdsExist,
  validateTestLimits,
  sortTestTasks,
  serializeTestTasks,
  buildSessionPayload,
  buildTopicTree,
  archiveTasks,
  cascadeDeleteTests,
  generateInviteCode,
  ensureParentIsRootTopic,
  resolveTaskPayload,
  ensureTopicSupportsTasks,
  ensureTestEditable,
  canSeePremiumContent,
  maskPremiumFields,
  buildStudentProgressPayload,
  buildTopicParentMap,
  findRootId,
  buildAttemptsMap,
  formatTestAnswers
};
