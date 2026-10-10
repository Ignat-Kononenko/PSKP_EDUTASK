const { Topic, Task } = require('../models/models');
const { buildTopicTree, ensureParentIsRootTopic, getIdOrRespond, buildValidationError } = require('./helpers');
const { fn, col } = require('sequelize');

const getTopics = async (req, res) => {
  const topics = await Topic.findAll({ where: { parent_id: null }, include: 'subtopics' });
  return res.json(topics);
};

const getAdminTopicTree = async (req, res) => {
  const topics = await Topic.findAll({ order: [['title', 'ASC']], raw: true });
  const taskCountsRaw = await Task.findAll({
    where: { is_archived: false },
    attributes: ['topic_id', [fn('COUNT', col('id')), 'count']],
    group: ['topic_id'],
    raw: true
  });
  const taskCounts = taskCountsRaw.reduce((acc, row) => {
    acc[row.topic_id] = Number(row.count);
    return acc;
  }, {});
  const tree = buildTopicTree(topics, taskCounts);
  return res.json(tree);
};

const createTopic = async (req, res) => {
  try {
    const { title, parent_id, subject } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Название темы обязательно' });
    }
    const parent = await ensureParentIsRootTopic(parent_id);
    const topic = await Topic.create({
      title: title.trim(),
      parent_id: parent ? parent.id : null,
      subject: subject ? subject.trim() : null
    });
    return res.json(topic);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Не удалось создать тему';
    return res.status(status).json({ message });
  }
};

const updateTopic = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;

  const topic = await Topic.findByPk(id);
  if (!topic) return res.status(404).json({ message: 'Тема не найдена' });

  const { title, parent_id, subject } = req.body;
  const payload = {};

  if (title !== undefined) {
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Название темы не может быть пустым' });
    }
    payload.title = title.trim();
  }

  if (subject !== undefined) {
    payload.subject = subject ? subject.trim() : null;
  }

  if (parent_id !== undefined) {
    if (!parent_id) {
      payload.parent_id = null;
    } else {
      if (topic.parent_id === null) {
        return res.status(400).json({ message: 'Корневую тему нельзя перемещать в другую' });
      }
      if (Number(parent_id) === topic.id) {
        return res.status(400).json({ message: 'Тема не может быть своей родительской' });
      }
      try {
        const parent = await ensureParentIsRootTopic(parent_id);
        payload.parent_id = parent.id;
      } catch (err) {
        return res.status(err.status || 500).json({ message: err.message || 'Не удалось обновить тему' });
      }
    }
  }

  await topic.update(payload);
  return res.json(topic);
};

const deleteTopic = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const topic = await Topic.findByPk(id);
  if (!topic) return res.status(404).json({ message: 'Тема не найдена' });

  const subtopicsCount = await Topic.count({ where: { parent_id: id } });
  if (subtopicsCount > 0) {
    return res.status(409).json({ message: 'Нельзя удалить тему с подтемами. Сначала удалите или перенесите их.' });
  }

  const tasksCount = await Task.count({ where: { topic_id: id, is_archived: false } });
  if (tasksCount > 0) {
    return res.status(409).json({ message: 'Нельзя удалить тему, пока в ней есть задачи.' });
  }

  await topic.destroy();
  return res.json({ message: 'Тема удалена' });
};

module.exports = {
  getTopics,
  getAdminTopicTree,
  createTopic,
  updateTopic,
  deleteTopic
};
