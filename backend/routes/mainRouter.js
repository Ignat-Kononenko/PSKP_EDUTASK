const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const {
  getPublicTopics,
  getPublicTasks,
  getTopics,
  getAdminTopicTree,
  updateTopic,
  deleteTopic,
  getTasksByTopic,
  getTaskById,
  checkTaskAnswer,
  getSolvedTasks,
  getAIHintController,
  createTopic,
  createTask,
  updateTask,
  deleteTask,
  getMyStudents,
  detachStudent,
  getTeacherTests,
  getTeacherTestById,
  getAllTasks,
  getAdminTasks,
  cloneTask,
  teacherCloneTask,
  bulkDeleteTasks,
  bulkMoveTasks,
  createTest,
  updateTest,
  deleteTest,
  getAdminTests,
  deleteTestByAdmin,
  assignTest,
  cancelTestAssignment,
  getMyTests,
  startTestSession,
  submitTestSession,
  getTestSessionAnswers,
  getAllUsers,
  createUserByAdmin,
  banUser,
  deleteUserByAdmin,
  getStats,
  getAdminAnalytics,
  adminUpdateUser,
  getTeacherAvailableTasks,
  getStudentProgress,
  getMyProgress,
  getMapInfo,
  getTaskHint,
  getTaskSolution,
  restoreStudent,
  banUserById,
  unbanUserById
} = require('../controllers/mainController');


// router.get('/public/topics', getPublicTopics);
router.get('/public/tasks', getPublicTasks);
router.get('/topics', getTopics);
router.get('/tasks/all', authMiddleware, getAllTasks);
router.get('/tasks/solved', authMiddleware, getSolvedTasks);
router.get('/tasks/item/:id', authMiddleware, getTaskById);
router.get('/tasks/:topic_id', authMiddleware, getTasksByTopic);
router.post('/tasks/check', authMiddleware, checkTaskAnswer);
router.post('/ai-hint', authMiddleware, getAIHintController);
router.get('/student/tests', authMiddleware, getMyTests);
router.get('/student/progress', authMiddleware, checkRole(['STUDENT']), getMyProgress);
router.post('/student/tests/start', authMiddleware, startTestSession);
router.post('/student/tests/submit', authMiddleware, submitTestSession);

router.get('/tasks/:id/hint', authMiddleware, getTaskHint);
router.get('/tasks/:id/solution', authMiddleware, getTaskSolution);

router.post('/topics', authMiddleware, checkRole(['ADMIN']), createTopic);
router.put('/topics/:id', authMiddleware, checkRole(['ADMIN']), updateTopic);
router.delete('/topics/:id', authMiddleware, checkRole(['ADMIN']), deleteTopic);

router.post('/tasks', authMiddleware, checkRole(['TEACHER', 'ADMIN']), createTask);
router.put('/tasks/:id', authMiddleware, checkRole(['TEACHER', 'ADMIN']), updateTask);
router.delete('/tasks/:id', authMiddleware, checkRole(['TEACHER', 'ADMIN']), deleteTask);
router.get('/admin/tasks', authMiddleware, checkRole(['ADMIN']), getAdminTasks);
router.post('/admin/tasks/:id/clone', authMiddleware, checkRole(['ADMIN']), cloneTask);
router.post('/admin/tasks/bulk-delete', authMiddleware, checkRole(['ADMIN']), bulkDeleteTasks);
router.post('/admin/tasks/bulk-move', authMiddleware, checkRole(['ADMIN']), bulkMoveTasks);
// router.post('/teacher/tasks/:id/clone', authMiddleware, checkRole(['TEACHER']), teacherCloneTask);
router.get('/teacher/available-tasks', authMiddleware, checkRole(['TEACHER']), getTeacherAvailableTasks);


router.get('/students', authMiddleware, checkRole(['TEACHER']), getMyStudents);
router.delete('/students/:id/detach', authMiddleware, checkRole(['TEACHER', 'ADMIN']), detachStudent);
router.get('/teacher/student/:id/progress', authMiddleware, checkRole(['TEACHER']), getStudentProgress);
router.get('/tests/my', authMiddleware, checkRole(['TEACHER']), getTeacherTests);
router.get('/tests/:id', authMiddleware, checkRole(['TEACHER']), getTeacherTestById);
router.post('/tests', authMiddleware, checkRole(['TEACHER']), createTest);
router.put('/tests/:id', authMiddleware, checkRole(['TEACHER']), updateTest);
router.delete('/tests/:id', authMiddleware, checkRole(['TEACHER']), deleteTest);
router.post('/tests/assign', authMiddleware, checkRole(['TEACHER']), assignTest);
router.delete('/tests/assign/:id', authMiddleware, checkRole(['TEACHER']), cancelTestAssignment);
router.get('/teacher/test-session/:id/answers', authMiddleware, checkRole(['TEACHER']), getTestSessionAnswers);

router.get('/admin/tests', authMiddleware, checkRole(['ADMIN']), getAdminTests);
router.delete('/admin/tests/:id', authMiddleware, checkRole(['ADMIN']), deleteTestByAdmin);
router.post('/admin/students/:id/restore', authMiddleware, checkRole(['ADMIN']), restoreStudent);

router.get('/admin/users', authMiddleware, checkRole(['ADMIN']), getAllUsers);
router.post('/admin/users', authMiddleware, checkRole(['ADMIN']), createUserByAdmin);
// router.put('/admin/ban-user', authMiddleware, checkRole(['ADMIN']), banUser);
router.put('/admin/users/:id', authMiddleware, checkRole(['ADMIN']), adminUpdateUser);
router.get('/admin/stats', authMiddleware, checkRole(['ADMIN']), getStats);
router.get('/admin/analytics', authMiddleware, checkRole(['ADMIN']), getAdminAnalytics);
router.get('/admin/topics/tree', authMiddleware, checkRole(['ADMIN']), getAdminTopicTree);
router.post('/admin/users/:id/ban', authMiddleware, checkRole(['ADMIN']), banUserById);
router.post('/admin/users/:id/unban', authMiddleware, checkRole(['ADMIN']), unbanUserById);

module.exports = router;
