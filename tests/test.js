const request = require('supertest');
const app = require('../backend/app');
const test = require('node:test');
const assert = require('node:assert');

let studentToken;
const testStudentEmail = 'student_test@example.com';
const teacherInviteCode = 'MATH12345678';
async function loginStudent() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: testStudentEmail, password: 'Test123!' });
  if (res.statusCode === 200) return res.body.token;
  return null;
}

test('POST /api/auth/register – успешная регистрация ученика', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      full_name: 'Тестов Ученик',
      email: testStudentEmail,
      password: 'Test123!',
      invite_code: teacherInviteCode
    });
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.message.includes('Регистрация успешна'));
});

test('POST /api/auth/register – ошибка при дублировании email', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      full_name: 'Дубль',
      email: testStudentEmail,
      password: 'Test123!',
      invite_code: teacherInviteCode
    });
  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.body.message.includes('уже существует'));
});

test('POST /api/auth/login – успешный вход ученика', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: testStudentEmail, password: 'Test123!' });
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.role, 'STUDENT');
  studentToken = res.body.token;
});

test('GET /api/topics – получение тем (без авторизации)', async () => {
  const res = await request(app).get('/api/topics');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/public/tasks – получение публичных задач (без авторизации)', async () => {
  const res = await request(app).get('/api/public/tasks');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/tasks/:id/hint – просмотр подсказки (ученик)', async () => {
  const token = studentToken || (await loginStudent());
  if (!token) assert.fail('Не удалось получить токен');
  const taskId = 1;   // существующая публичная задача
  const res = await request(app)
    .get(`/api/tasks/${taskId}/hint`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.statusCode, 200);
  assert.ok('hint' in res.body);
});

test('GET /api/tasks/:id/solution – просмотр решения (ученик)', async () => {
  const token = studentToken || (await loginStudent());
  if (!token) assert.fail('Не удалось получить токен');
  const taskId = 1;
  const res = await request(app)
    .get(`/api/tasks/${taskId}/solution`)
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.statusCode, 200);
  assert.ok('solution' in res.body);
});

test('POST /api/tasks/check – правильный ответ на задачу', async () => {
  const token = studentToken || (await loginStudent());
  if (!token) assert.fail('Не удалось получить токен');
  const taskId = 1;
  // предположим, правильный ответ = '42'
  const res = await request(app)
    .post('/api/tasks/check')
    .send({ task_id: taskId, answer: '42' })
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.is_correct, true);
  assert.ok(res.body.attempt.is_correct === true);
});

test('POST /api/tasks/check – неправильный ответ на задачу', async () => {
  const token = studentToken || (await loginStudent());
  if (!token) assert.fail('Не удалось получить токен');
  const taskId = 1;
  const res = await request(app)
    .post('/api/tasks/check')
    .send({ task_id: taskId, answer: 'wrong' })
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.is_correct, false);
});

test('GET /api/student/progress – доступ для ученика', async () => {
  const token = studentToken || (await loginStudent());
  if (!token) assert.fail('Не удалось получить токен');
  const res = await request(app)
    .get('/api/student/progress')
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.statusCode, 200);
});

test('GET /api/admin/users – запрет доступа для ученика', async () => {
  const token = studentToken || (await loginStudent());
  if (!token) assert.fail('Не удалось получить токен');
  const res = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${token}`);
  assert.strictEqual(res.statusCode, 403);
});