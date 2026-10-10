const { Topic, Task } = require('../models/models');

const getPublicTopics = async (req, res) => {
  const topics = await Topic.findAll({
    where: { parent_id: null },
    attributes: ['id', 'title', 'subject'],
    include: [{
      model: Topic,
      as: 'subtopics',
      attributes: ['id', 'title']
    }]
  });
  return res.json(topics);
};

const getPublicTasks = async (req, res) => {
  const { topic_id } = req.query;
  const where = {};
  if (topic_id) {
    where.topic_id = topic_id;
  }
  where.is_public = true;
  where.is_archived = false;

  const tasks = await Task.findAll({
    where,
    attributes: ['id', 'title', 'topic_id']
  });

  return res.json(tasks);
};

module.exports = {
  getPublicTopics,
  getPublicTasks
};
