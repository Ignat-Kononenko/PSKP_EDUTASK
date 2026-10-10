const { buildStudentProgressPayload } = require('./helpers');

const getMyProgress = async (req, res) => {
  const payload = await buildStudentProgressPayload({ studentId: req.user.id });
  if (!payload) {
    return res.status(404).json({ message: 'Ученик не найден' });
  }

  return res.json(payload);
};

module.exports = {
  getMyProgress
};
