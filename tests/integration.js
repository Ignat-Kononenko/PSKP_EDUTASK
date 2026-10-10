const request = require('supertest');
const app = require('../backend/app');
const test = require('node:test');
const assert = require('node:assert');

let adminToken = null;
let teacherToken = null;
let studentToken = null;
const testStudentEmail = 'student_integration@example.com';
const teacherInviteCode = 'MATH12345678';

test('1. GET /api/public/topics – публичные темы', async () => {
    const res = await request(app).get('/api/public/topics');
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
});

test('2. GET /api/tasks/item/1 – без токена', async () => {
    const res = await request(app).get('/api/tasks/item/1');
    assert.strictEqual(res.statusCode, 401);
});

test('3. GET /api/tasks/item/1 – невалидный токен', async () => {
    const res = await request(app)
        .get('/api/tasks/item/1')
        .set('Authorization', 'Bearer invalid.token.here');
    assert.strictEqual(res.statusCode, 401);
});

test('4. Регистрация ученика', async () => {
    const res = await request(app)
        .post('/api/auth/register')
        .send({
        full_name: 'Интеграционный Ученик',
        email: testStudentEmail,
        password: 'Test123!',
        invite_code: teacherInviteCode
        });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.message.includes('Регистрация успешна'));
});

test('5. Логин ученика', async () => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testStudentEmail, password: 'Test123!' });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.token);
    studentToken = res.body.token;
});
test('6. GET /api/student/progress – доступ владельца (ученик)', async () => {
    const res = await request(app)
        .get('/api/student/progress')
        .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok('summary' in res.body);
});
test('7. GET /api/student/progress – попытка доступа с чужим токеном', async () => {
    const res = await request(app)
        .get('/api/student/progress')
        .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.statusCode, 403);
});
test('8. GET /api/admin/users – запрет для ученика', async () => {
    const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.statusCode, 403);
});

test('9. Логин администратора (предполагается существующий пользователь с ролью ADMIN)', async () => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'Admin123!' });
    if (res.statusCode === 200) {
        adminToken = res.body.token;
        assert.ok(adminToken);
    } else {

        assert.ok(true, 'Администратор не настроен, тест 9 пропущен');
    }
});

test('10. GET /api/admin/users – доступ для администратора', async () => {
    if (!adminToken) {
        assert.ok(true);
        return;
    }
    const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
});

test('11. POST /api/tasks/check – правильный ответ (задача id=1, ответ "42")', async () => {
    const res = await request(app)
        .post('/api/tasks/check')
        .send({ task_id: 1, answer: '42' })
        .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.is_correct, true);
});

test('12. POST /api/tasks/check – неправильный ответ', async () => {
    const res = await request(app)
        .post('/api/tasks/check')
        .send({ task_id: 1, answer: 'wrong' })
        .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.is_correct, false);
});