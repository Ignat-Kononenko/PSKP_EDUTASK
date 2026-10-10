const { Task } = require('../models/models');
const { getAIHint } = require('../services/aiService');

const getAIHintController = async (req, res) => {
  const { task_id, student_answer, user_question } = req.body;
  const user_id = req.user.id;

  const task = await Task.findByPk(task_id);
  if (!task || task.is_archived) return res.status(404).json({ message: 'Задача не найдена' });

  const hint = await getAIHint(user_id, task.content, student_answer, user_question);
  return res.json({ hint });
};

module.exports = {
  getAIHintController
};
