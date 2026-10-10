const { Op } = require('sequelize');
const { Topic, Task, User, TaskAttempt } = require('../models/models');
const {
  buildTaskVisibilityClause,
  canUserAccessTask,
  getIdOrRespond,
  sanitizeTaskHtmlFields,
  resolveAuthorId,
  ensureTeacherOwnsTask,
  ensureTopicSupportsTasks,
  resolveTaskPayload,
  canSeePremiumContent,
  maskPremiumFields,
  archiveTasks
} = require('./helpers');

const getTasksByTopic = async (req, res) => {
  const topic_id = getIdOrRespond(req, res, 'topic_id');
  if (topic_id === null) return;
  const visibilityClause = buildTaskVisibilityClause(req.user);
  const tasks = await Task.findAll({
    where: { topic_id, is_archived: false, ...visibilityClause },
    order: [['id', 'ASC']]
  });

  const canSeePremium = canSeePremiumContent(req.user);
  const sanitized = tasks.map(task => maskPremiumFields(task.toJSON(), canSeePremium));
  return res.json(sanitized);
};

const getTaskById = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const task = await Task.findByPk(id);
  if (!task || task.is_archived) return res.status(404).json({ message: 'Задача не найдена' });

  if (!canUserAccessTask(req.user, task)) {
    return res.status(403).json({ message: 'Доступ к задаче запрещен' });
  }

  const visibilityClause = buildTaskVisibilityClause(req.user);
  const nextTask = await Task.findOne({
    where: {
      topic_id: task.topic_id,
      id: { [Op.gt]: task.id },
      is_archived: false,
      ...visibilityClause
    },
    order: [['id', 'ASC']]
  });

  return res.json({ task, nextTaskId: nextTask ? nextTask.id : null });
};

const getTaskHint = async (req, res) => {
  const id = parseInt(req.params.id);
  const task = await Task.findByPk(id);
  if (!task || task.is_archived) 
    return res.status(404).json({ message: 'Задача не найдена' });
  if (!canUserAccessTask(req.user, task)) 
    return res.status(403).json({ message: 'Доступ запрещён' });
  return res.json({ hint: task.hint });
};

const getTaskSolution = async (req, res) => {
  const id = parseInt(req.params.id);
  const task = await Task.findByPk(id);
  if (!task || task.is_archived) 
    return res.status(404).json({ message: 'Задача не найдена' });
  if (!canUserAccessTask(req.user, task)) 
    return res.status(403).json({ message: 'Доступ запрещён' });
  return res.json({ solution: task.solution });
};

const checkTaskAnswer = async (req, res) => {
  const { task_id, answer } = req.body;
  const student_id = req.user.id;

  const task = await Task.findByPk(task_id);
  if (!task || task.is_archived) return res.status(404).json({ message: 'Задача не найдена' });

  if (!canUserAccessTask(req.user, task)) {
    return res.status(403).json({ message: 'Доступ к задаче запрещен' });
  }

  const is_correct = (task.answer || '').trim().toLowerCase() === (answer || '').trim().toLowerCase();

  const attempt = await TaskAttempt.create({
    student_id,
    problem_id: task_id,
    answer_text: answer,
    is_correct
  });

  return res.json({ is_correct, attempt });
};

const getSolvedTasks = async (req, res) => {
  const student_id = req.user.id;
  const solved = await TaskAttempt.findAll({
    where: {
      student_id,
      is_correct: true,
      test_session_id: null
    },
    attributes: ['problem_id']
  });
  return res.json(solved.map((item) => item.problem_id));
};

const createTask = async (req, res) => {
  try {
    const payload = resolveTaskPayload(req.body);
    await ensureTopicSupportsTasks(payload.topic_id);
    const sanitizedHtml = sanitizeTaskHtmlFields(payload);

    const task = await Task.create({
      title: payload.title,
      content: sanitizedHtml.content ?? payload.content,
      answer: payload.answer,
      hint: sanitizedHtml.hint ?? payload.hint,
      solution: sanitizedHtml.solution ?? payload.solution,
      topic_id: payload.topic_id,
      image_data: payload.image_data,
      is_public: payload.is_public,
      is_archived: false,
      author_id: resolveAuthorId(req, req.body.author_id)
    });
    return res.json(task);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Не удалось создать задачу' });
  }
};

const updateTask = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const task = await Task.findByPk(id);
  if (!task || task.is_archived) return res.status(404).json({ message: 'Задача не найдена' });

  try {
    ensureTeacherOwnsTask(req, task);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Ошибка доступа' });
  }

  const sanitizedHtml = sanitizeTaskHtmlFields(req.body);
  const updates = {};
  ['title', 'answer', 'image_data', 'is_public'].forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });
  if (sanitizedHtml.content !== undefined) updates.content = sanitizedHtml.content;
  if (sanitizedHtml.hint !== undefined) updates.hint = sanitizedHtml.hint;
  if (sanitizedHtml.solution !== undefined) updates.solution = sanitizedHtml.solution;
  if (req.body.topic_id !== undefined) {
    await ensureTopicSupportsTasks(req.body.topic_id);
    updates.topic_id = req.body.topic_id;
  }

  await task.update(updates);
  return res.json(task);
};

const deleteTask = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const task = await Task.findByPk(id);
  if (!task || task.is_archived) return res.status(404).json({ message: 'Задача не найдена' });

  try {
    ensureTeacherOwnsTask(req, task);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Ошибка доступа' });
  }

  task.is_archived = true;
  await task.save();
  return res.json({ message: 'Задача перемещена в архив' });
};

const getAllTasks = async (req, res) => {
  const visibilityClause = buildTaskVisibilityClause(req.user);
  const tasks = await Task.findAll({ where: { ...visibilityClause, is_archived: false } });
  const canSeePremium = canSeePremiumContent(req.user);
  return res.json(tasks.map(task => maskPremiumFields(task.toJSON(), canSeePremium)));
};

const getAdminTasks = async (req, res) => {
  const { topic_id, author_id, visibility, search } = req.query;
  const where = {};
  if (topic_id) where.topic_id = topic_id;
  if (author_id) where.author_id = author_id;
  if (visibility === 'public') where.is_public = true;
  if (visibility === 'private') where.is_public = false;
  if (req.query.include_archived !== 'true') where.is_archived = false;
  if (search) where.title = { [Op.iLike]: `%${search}%` };

  const tasks = await Task.findAll({
    where,
    include: [
      { model: Topic, attributes: ['id', 'title', 'subject'] },
      { model: User, as: 'author', attributes: ['id', 'full_name', 'email'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  return res.json(tasks);
};

const cloneTask = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const { titleSuffix = ' (копия)', is_public, author_id, topic_id } = req.body;
  const task = await Task.findByPk(id);
  if (!task) return res.status(404).json({ message: 'Задача не найдена' });

  const targetTopicId = topic_id || task.topic_id;
  await ensureTopicSupportsTasks(targetTopicId);

  const clone = await Task.create({
    title: `${task.title}${titleSuffix}`,
    content: task.content,
    answer: task.answer,
    hint: task.hint,
    solution: task.solution,
    topic_id: targetTopicId,
    image_data: task.image_data,
    is_public: typeof is_public === 'boolean' ? is_public : task.is_public,
    is_archived: false,
    author_id: resolveAuthorId(req, author_id ?? task.author_id)
  });

  return res.json(clone);
};

const teacherCloneTask = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const { titleSuffix = ' (копия)', is_public, topic_id } = req.body;
  const task = await Task.findByPk(id);
  if (!task || task.is_archived) return res.status(404).json({ message: 'Задача не найдена' });

  if (!task.is_public && task.author_id !== req.user.id) {
    return res.status(403).json({ message: 'Нельзя клонировать приватную чужую задачу' });
  }

  const sanitizedHtml = sanitizeTaskHtmlFields({
    content: task.content,
    hint: task.hint,
    solution: task.solution
  });

  const targetTopicId = topic_id || task.topic_id;
  await ensureTopicSupportsTasks(targetTopicId);

  const clone = await Task.create({
    title: `${task.title}${titleSuffix}`,
    content: sanitizedHtml.content ?? task.content,
    answer: task.answer,
    hint: sanitizedHtml.hint ?? task.hint,
    solution: sanitizedHtml.solution ?? task.solution,
    topic_id: targetTopicId,
    image_data: task.image_data,
    is_public: typeof is_public === 'boolean' ? is_public : task.is_public,
    is_archived: false,
    author_id: req.user.id
  });

  return res.json(clone);
};

const bulkDeleteTasks = async (req, res) => {
  const { task_ids } = req.body;
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    return res.status(400).json({ message: 'Список задач пуст' });
  }
  await archiveTasks(task_ids);
  return res.json({ deleted: task_ids.length });
};

const bulkMoveTasks = async (req, res) => {
  const { task_ids, target_topic_id } = req.body;
  if (!target_topic_id) {
    return res.status(400).json({ message: 'Не указана целевая тема' });
  }
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    return res.status(400).json({ message: 'Список задач пуст' });
  }
  await ensureTopicSupportsTasks(target_topic_id);
  await Task.update({ topic_id: target_topic_id }, { where: { id: task_ids, is_archived: false } });
  return res.json({ moved: task_ids.length });
};

const getTeacherAvailableTasks = async (req, res) => {
  const { topic_id, search, visibility } = req.query;
  const where = {
    is_archived: false,
    [Op.or]: [
      { author_id: req.user.id },
      { is_public: true }
    ]
  };

  if (topic_id) where.topic_id = topic_id;

  if (visibility === 'public') {
    where.is_public = true;
  } else if (visibility === 'private') {
    where.is_public = false;
    where.author_id = req.user.id;
  }

  if (search) {
    where.title = { [Op.iLike]: `%${search}%` };
  }

  const tasks = await Task.findAll({
    where,
    include: [
      { model: Topic, attributes: ['id', 'title', 'subject'] },
      { model: User, as: 'author', attributes: ['id', 'full_name', 'email'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  return res.json(tasks);
};

module.exports = {
  getTasksByTopic,
  getTaskById,
  checkTaskAnswer,
  getSolvedTasks,
  createTask,
  updateTask,
  deleteTask,
  getAllTasks,
  getAdminTasks,
  cloneTask,
  teacherCloneTask,
  bulkDeleteTasks,
  bulkMoveTasks,
  getTeacherAvailableTasks,
  getTaskSolution,
  getTaskHint
};
