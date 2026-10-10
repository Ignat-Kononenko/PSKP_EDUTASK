const sequelize = require('../db');
const { DataTypes } = require('sequelize');

// 1. Пользователи (users)
const User = sequelize.define('user', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  full_name: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('GUEST', 'STUDENT', 'TEACHER', 'ADMIN'), defaultValue: 'STUDENT' },
  invite_code: { type: DataTypes.STRING },
  is_banned: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_graduated: { type: DataTypes.BOOLEAN, defaultValue: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: true }
});

const VerificationCode = sequelize.define('verification_code', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('VERIFICATION'), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_sent_at: { type: DataTypes.DATE },
  consumed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 2. Темы (topics)
const Topic = sequelize.define('topic', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  subject: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  parent_id: { type: DataTypes.INTEGER }
});

// 3. Задачи (tasks)
const Task = sequelize.define('task', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  answer: { type: DataTypes.STRING, allowNull: false },
  hint: { type: DataTypes.TEXT },
  solution: { type: DataTypes.TEXT },
  image_data: { type: DataTypes.TEXT }, // Храним Base64 напрямую
  is_public: { type: DataTypes.BOOLEAN, defaultValue: true }, // Для скрытых контрольных
  is_archived: { type: DataTypes.BOOLEAN, defaultValue: false },
  author_id: { type: DataTypes.INTEGER }
});

// 4. Тесты (tests)
const Test = sequelize.define('test', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  time_limit: { type: DataTypes.INTEGER }, // Лимит времени в минутах
  passing_score: { type: DataTypes.INTEGER },
  is_archived: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 5. Задачи в тестах (test_tasks) - связующая таблица
const TestTask = sequelize.define('test_task', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  points: { type: DataTypes.INTEGER, defaultValue: 1 },
  order_index: { type: DataTypes.INTEGER }
});

// 6. Сессии тестов (test_sessions)
const TestSession = sequelize.define('test_session', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  available_until: { type: DataTypes.DATE },
  started_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
  score: { type: DataTypes.INTEGER },
  is_passed: { type: DataTypes.BOOLEAN },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }
});

// 7. Попытки решения задач (task_attempts)
const TaskAttempt = sequelize.define('task_attempt', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  answer_text: { type: DataTypes.TEXT },
  is_correct: { type: DataTypes.BOOLEAN }
});

User.hasMany(User, { as: 'students', foreignKey: 'teacher_id' });
User.belongsTo(User, { as: 'teacher', foreignKey: 'teacher_id' });

User.hasMany(VerificationCode, { foreignKey: 'user_id' });
VerificationCode.belongsTo(User, { foreignKey: 'user_id' });

Topic.hasMany(Topic, { as: 'subtopics', foreignKey: 'parent_id' });
Topic.belongsTo(Topic, { as: 'parent', foreignKey: 'parent_id' });

Topic.hasMany(Task, { foreignKey: 'topic_id' });
Task.belongsTo(Topic, { foreignKey: 'topic_id' });

User.hasMany(Test, { foreignKey: 'teacher_id', as: 'createdTests' });
Test.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher' });

User.hasMany(Task, { foreignKey: 'author_id', as: 'authoredTasks' });
Task.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

Test.belongsToMany(Task, { through: TestTask, foreignKey: 'test_id' });
Task.belongsToMany(Test, { through: TestTask, foreignKey: 'problem_id' });

User.hasMany(TestSession, { foreignKey: 'student_id' });
TestSession.belongsTo(User, { foreignKey: 'student_id' });

Test.hasMany(TestSession, { foreignKey: 'test_id' });
TestSession.belongsTo(Test, { foreignKey: 'test_id' });

Task.hasMany(TaskAttempt, { foreignKey: 'problem_id' });
TaskAttempt.belongsTo(Task, { foreignKey: 'problem_id' });

User.hasMany(TaskAttempt, { foreignKey: 'student_id' });
TaskAttempt.belongsTo(User, { foreignKey: 'student_id' });

// Сессии тестов -> Попытки (1:M)
TestSession.hasMany(TaskAttempt, { foreignKey: 'test_session_id' });
TaskAttempt.belongsTo(TestSession, { foreignKey: 'test_session_id' });

// Экспортируем все модели
module.exports = {
  User,
  Topic,
  Task,
  Test,
  TestTask,
  TestSession,
  TaskAttempt,
  VerificationCode
};
