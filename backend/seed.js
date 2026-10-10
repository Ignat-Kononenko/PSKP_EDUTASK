const sequelize = require('./db');
const { User, Topic, Task, Test, TestTask, TestSession, TaskAttempt, AILog } = require('./models/models');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    // Внимание: force: true удалит все старые таблицы и создаст новые по актуальным моделям
    await sequelize.sync({ force: true }); 
    console.log('Таблицы успешно синхронизированы. Начинаем заполнение...');

    // ==========================================
    // 1. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ
    // ==========================================
    const adminPassword = await bcrypt.hash('admin123', 5);
    await User.create({
      full_name: 'Admin Adminov',
      email: 'admin@edu.com',
      password_hash: adminPassword,
      role: 'ADMIN',
      is_verified: true
    });

    const teacherPassword = await bcrypt.hash('teacher123', 5);
    const teacher = await User.create({
      full_name: 'Ivan Ivanov',
      email: 'teacher@edu.com',
      password_hash: teacherPassword,
      role: 'TEACHER',
      is_verified: true,
      invite_code: 'MATH12345678' // 12 символов
    });

    const studentPassword = await bcrypt.hash('student123', 5);
    const student = await User.create({
      full_name: 'Petr Petrov',
      email: 'student@edu.com',
      password_hash: studentPassword,
      role: 'STUDENT',
      is_verified: true,
      teacher_id: teacher.id
    });

    // ==========================================
    // 2. СОЗДАНИЕ ТЕМ И ПОДТЕМ
    // ==========================================
    const algebra = await Topic.create({ subject: 'Алгебра', title: 'Основы алгебры' });
    const equations = await Topic.create({ subject: 'Алгебра', title: 'Уравнения', parent_id: algebra.id });

    const geometry = await Topic.create({ subject: 'Геометрия', title: 'Планиметрия' });
    const triangles = await Topic.create({ subject: 'Геометрия', title: 'Треугольники', parent_id: geometry.id });

    // ==========================================
    // 3. СОЗДАНИЕ ПУБЛИЧНЫХ ЗАДАЧ (ДЛЯ ТРЕНАЖЕРА)
    // ==========================================
    await Task.create({
      title: 'Линейное уравнение',
      content: 'Решите уравнение: 2x + 5 = 15',
      answer: '5',
      hint: 'Перенесите 5 в правую часть уравнения.',
      solution: '2x = 15 - 5 => 2x = 10 => x = 5',
      topic_id: equations.id,
      author_id: teacher.id,
      is_public: true
    });

    await Task.create({
      title: 'Квадратное уравнение',
      content: 'Найдите корни уравнения: x^2 - 5x + 6 = 0. В ответе укажите меньший корень.',
      answer: '2',
      hint: 'Используйте теорему Виета или дискриминант.',
      solution: 'D = 25 - 24 = 1. x1 = (5+1)/2 = 3, x2 = (5-1)/2 = 2.',
      topic_id: equations.id,
      author_id: teacher.id,
      is_public: true
    });

    await Task.create({
      title: 'Площадь треугольника',
      content: 'Найдите площадь прямоугольного треугольника с катетами 3 и 4.',
      answer: '6',
      hint: 'Площадь прямоугольного треугольника равна половине произведения катетов.',
      solution: 'S = (3 * 4) / 2 = 6',
      topic_id: triangles.id,
      author_id: teacher.id,
      is_public: true
    });

    await Task.create({
      title: 'Теорема Пифагора',
      content: 'В прямоугольном треугольнике катеты равны 6 и 8. Найдите гипотенузу.',
      answer: '10',
      hint: 'Квадрат гипотенузы равен сумме квадратов катетов.',
      solution: 'c^2 = 6^2 + 8^2 = 36 + 64 = 100 => c = 10',
      topic_id: triangles.id,
      author_id: teacher.id,
      is_public: true
    });

    // ==========================================
    // 4. СОЗДАНИЕ СКРЫТОЙ ЗАДАЧИ (ТОЛЬКО ДЛЯ ТЕСТОВ)
    // ==========================================
    await Task.create({
      title: 'Сложное уравнение (Для контрольной)',
      content: 'Найдите дискриминант уравнения: 2x^2 - 3x + 1 = 0',
      answer: '1',
      hint: 'Формула дискриминанта: D = b^2 - 4ac',
      solution: 'D = (-3)^2 - 4*2*1 = 9 - 8 = 1',
      topic_id: equations.id,
      author_id: teacher.id,
      is_public: false // Ученики её не увидят в тренажере!
    });

    console.log('Database seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seed();