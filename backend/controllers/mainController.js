const publicController = require('./publicController');
const topicController = require('./topicController');
const taskController = require('./taskController');
const aiController = require('./aiController');
const teacherStudentController = require('./teacherStudentController');
const teacherTestController = require('./teacherTestController');
const studentTestController = require('./studentTestController');
const studentProgressController = require('./studentProgressController');
const adminUserController = require('./adminUserController');
const adminStatsController = require('./adminStatsController');
const adminTestController = require('./adminTestController');

module.exports = {
  ...publicController,
  ...topicController,
  ...taskController,
  ...aiController,
  ...teacherStudentController,
  ...teacherTestController,
  ...studentTestController,
  ...studentProgressController,
  ...adminUserController,
  ...adminStatsController,
  ...adminTestController
};