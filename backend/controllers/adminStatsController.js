const { User, Topic, Task, TaskAttempt } = require('../models/models');
const { fn, col, Op } = require('sequelize');
const { buildTopicParentMap, findRootId } = require('./helpers');

const getStats = async (req, res) => {
  const usersCount = await User.count();
  const tasksCount = await Task.count({ where: { is_archived: false } });
  const topicsCount = await Topic.count({ where: { parent_id: { [Op.ne]: null } } });

  return res.json({
    usersCount,
    tasksCount,
    topicsCount
  });
};

const getAdminAnalytics = async (req, res) => {
  const days = Number(req.query.days) || 14;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const topics = await Topic.findAll({ attributes: ['id', 'parent_id', 'title'], raw: true });
  const parentMap = buildTopicParentMap(topics);

  const registrations = await User.findAll({
    attributes: [[fn('DATE', col('createdAt')), 'date'], [fn('COUNT', col('id')), 'count']],
    where: { createdAt: { [Op.gte]: sinceDate } },
    group: [fn('DATE', col('createdAt'))],
    order: [[fn('DATE', col('createdAt')), 'ASC']],
    raw: true
  });

  const solutions = await TaskAttempt.findAll({
    attributes: [[fn('DATE', col('createdAt')), 'date'], [fn('COUNT', col('id')), 'count']],
    where: {
      createdAt: { [Op.gte]: sinceDate },
      test_session_id: null
    },
    group: [fn('DATE', col('createdAt'))],
    order: [[fn('DATE', col('createdAt')), 'ASC']],
    raw: true
  });

  const tasksPerTopicRaw = await Task.findAll({
    where: { is_archived: false },
    attributes: ['topic_id', [fn('COUNT', col('id')), 'count']],
    group: ['topic_id'],
    raw: true
  });

  const rootTopicCounts = tasksPerTopicRaw.reduce((acc, row) => {
    const rootId = findRootId(row.topic_id, parentMap);
    const key = rootId ?? 'unassigned';
    acc[key] = (acc[key] || 0) + Number(row.count || 0);
    return acc;
  }, {});

  const tasksPerTopic = Object.entries(rootTopicCounts).map(([key, count]) => ({
    topic_id: key === 'unassigned' ? null : Number(key),
    count
  }));

  return res.json({ registrations, solutions, tasksPerTopic });
};

module.exports = {
  getStats,
  getAdminAnalytics
};
