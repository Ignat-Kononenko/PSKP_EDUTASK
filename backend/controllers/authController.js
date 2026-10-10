const { User, VerificationCode } = require('../models/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sendEmail } = require('../services/emailService');
require('dotenv').config();

const generateToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const EMAIL_MAX_LENGTH = 255;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;
const ASCII_REGEX = /^[\x21-\x7E]+$/; // printable ASCII without spaces
const FULL_NAME_ALLOWED_REGEX = /^[A-Za-zА-Яа-яЁё\- ]+$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_CODE_TTL_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 минута
const MAX_CODE_ATTEMPTS = 5;
const SIX_DIGIT_CODE_REGEX = /^\d{6}$/;

const CODE_TYPES = {
  VERIFICATION: 'VERIFICATION'
};

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const normalizeInviteCode = (code = '') => code.trim().toUpperCase();

const generateSixDigitCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const isSixDigitCode = (code = '') => SIX_DIGIT_CODE_REGEX.test(code.trim());

const canResendCode = (lastSent) => {
  if (!lastSent) return true;
  return Date.now() - new Date(lastSent).getTime() >= RESEND_COOLDOWN_MS;
};

const resolveTeacherByInviteCode = async (inviteCode, currentUserId = null) => {
  const normalized = normalizeInviteCode(inviteCode);
  if (!normalized) {
    return { teacher: null };
  }

  const teacher = await User.findOne({ where: { invite_code: normalized, role: 'TEACHER' } });
  if (!teacher) {
    return { error: 'Неверный код приглашения' };
  }
  if (teacher.is_banned) {
    return { error: 'Преподаватель заблокирован и не может принимать учеников' };
  }
  if (currentUserId && teacher.id === currentUserId) {
    return { error: 'Нельзя привязать себя как преподавателя' };
  }
  return { teacher };
};

const validateFullName = (fullName = '') => {
  const trimmed = fullName.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return false;
  return FULL_NAME_ALLOWED_REGEX.test(trimmed);
};

const validateEmailFormat = (email = '') => {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > EMAIL_MAX_LENGTH) return false;
  return EMAIL_REGEX.test(trimmed);
};

const validatePasswordStrength = (password = '') => {
  if (!PASSWORD_REGEX.test(password)) return false;
  return ASCII_REGEX.test(password);
};

const emailVerificationHtml = (code) => `
  <h1>Подтверждение email</h1>
  <p>Ваш код подтверждения: <strong>${code}</strong></p>
  <p>Он действует ${EMAIL_CODE_TTL_MINUTES} минут. Никому его не передавайте.</p>
`;

const sendVerificationEmail = async (user, code) => {
  await sendEmail(user.email, 'Код подтверждения', emailVerificationHtml(code));
};

const getLatestCodeRecord = (userId, type, activeOnly = false) => {
  const where = { user_id: userId, type };
  if (activeOnly) {
    where.consumed = false;
    where.expires_at = { [Op.gt]: new Date() };
  }
  return VerificationCode.findOne({ where, order: [['createdAt', 'DESC']] });
};

const issueVerificationCode = async (user) => {
  await VerificationCode.destroy({ where: { user_id: user.id, type: CODE_TYPES.VERIFICATION, consumed: false } });
  const code = generateSixDigitCode();
  const record = await VerificationCode.create({
    user_id: user.id,
    code,
    type: CODE_TYPES.VERIFICATION,
    expires_at: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000),
    attempts: 0,
    last_sent_at: new Date(),
    consumed: false
  });
  await sendVerificationEmail(user, code);
  return record;
};

const GRADUATED_MESSAGE = 'Учётная запись завершена. Обратитесь к преподавателю или администратору.';

const register = async (req, res) => {
  const { full_name, email, password, invite_code } = req.body;

  if (!validateFullName(full_name)) {
    return res.status(400).json({ message: 'Введите корректное ФИО (минимум 2 слова, только буквы/пробелы/дефисы, 3-50 символов).' });
  }

  if (!validateEmailFormat(email)) {
    return res.status(400).json({ message: 'Введите корректный email (формат name@example.com, до 255 символов).' });
  }

  if (!validatePasswordStrength(password)) {
    return res.status(400).json({ message: 'Пароль должен быть длиной 8-20 символов, содержать строчные и заглавные буквы, цифру и спецсимвол, и быть на латинице.' });
  }

  const normalizedEmail = normalizeEmail(email);

  const candidate = await User.findOne({ where: { email: normalizedEmail } });
  if (candidate) {
    if (candidate.role === 'STUDENT' && candidate.is_graduated) {
      return res.status(400).json({ message: GRADUATED_MESSAGE });
    }
    return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
  }

  const hashPassword = await bcrypt.hash(password, 5);

  if (!invite_code || !invite_code.trim()) {
    return res.status(400).json({ message: 'Для регистрации ученика требуется код преподавателя' });
  }
  const { teacher, error } = await resolveTeacherByInviteCode(invite_code);
  if (error) {
    return res.status(400).json({ message: error });
  }
  const teacher_id = teacher.id;

  const user = await User.create({
    full_name: full_name.trim(),
    email: normalizedEmail,
    password_hash: hashPassword,
    role: 'STUDENT',
    teacher_id,
    is_verified: false
  });

  await issueVerificationCode(user);

  return res.json({ message: 'Регистрация успешна. Введите код, отправленный на вашу почту, чтобы подтвердить email.' });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = normalizeEmail(email || '');
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    return res.status(400).json({ message: 'Пользователь не найден' });
  }

  if (user.is_banned) {
    return res.status(403).json({ message: 'Ваш аккаунт заблокирован' });
  }

  if (user.role === 'STUDENT' && user.is_graduated) {
    return res.status(403).json({ message: GRADUATED_MESSAGE });
  }

  if (!user.is_verified) {
    return res.status(403).json({ message: 'Пожалуйста, подтвердите ваш email' });
  }

  const comparePassword = bcrypt.compareSync(password || '', user.password_hash);
  if (!comparePassword) {
    return res.status(400).json({ message: 'Неверный пароль' });
  }

  const token = generateToken(user.id, user.email, user.role);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      teacher_id: user.teacher_id,
      invite_code: user.invite_code,
      has_teacher: !!user.teacher_id,
      is_graduated: user.is_graduated
    }
  });
};

const resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  if (!validateEmailFormat(email)) {
    return res.status(400).json({ message: 'Введите корректный email.' });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    return res.status(400).json({ message: 'Пользователь с таким email не найден' });
  }

  if (user.is_banned) {
    return res.status(403).json({ message: 'Ваш аккаунт заблокирован' });
  }

  if (user.role === 'STUDENT' && user.is_graduated) {
    return res.status(403).json({ message: GRADUATED_MESSAGE });
  }

  if (user.is_verified) {
    return res.status(400).json({ message: 'Email уже подтвержден' });
  }

  const latestCode = await getLatestCodeRecord(user.id, CODE_TYPES.VERIFICATION);
  if (latestCode && !canResendCode(latestCode.last_sent_at)) {
    return res.status(429).json({ message: 'Отправлять код можно не чаще одного раза в минуту' });
  }

  await issueVerificationCode(user);
  return res.json({ message: 'Новый код отправлен на вашу почту' });
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  if (!validateEmailFormat(email)) {
    return res.status(400).json({ message: 'Введите корректный email.' });
  }

  if (!isSixDigitCode(code || '')) {
    return res.status(400).json({ message: 'Код должен состоять из 6 цифр' });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    return res.status(400).json({ message: 'Пользователь с таким email не найден' });
  }

  if (user.is_verified) {
    return res.status(400).json({ message: 'Email уже подтвержден' });
  }

  const codeRecord = await getLatestCodeRecord(user.id, CODE_TYPES.VERIFICATION, true);
  if (!codeRecord) {
    return res.status(400).json({ message: 'Срок действия кода истек. Запросите новый код.' });
  }

  if (codeRecord.attempts >= MAX_CODE_ATTEMPTS) {
    return res.status(429).json({ message: 'Превышено число попыток. Запросите новый код.' });
  }

  const trimmedCode = (code || '').trim();
  if (codeRecord.code !== trimmedCode) {
    codeRecord.attempts += 1;
    await codeRecord.save();
    const attemptsLeft = Math.max(0, MAX_CODE_ATTEMPTS - codeRecord.attempts);
    return res.status(400).json({ message: attemptsLeft ? `Неверный код. Осталось попыток: ${attemptsLeft}` : 'Неверный код. Запросите новый.' });
  }

  user.is_verified = true;
  await user.save();
  codeRecord.consumed = true;
  await codeRecord.save();

  return res.json({ message: 'Email успешно подтвержден' });
};

const checkAuth = async (req, res) => {
  const token = generateToken(req.user.id, req.user.email, req.user.role);
  const user = await User.findByPk(req.user.id);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      teacher_id: user.teacher_id,
      invite_code: user.invite_code,
      has_teacher: !!user.teacher_id
    }
  });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!validatePasswordStrength(newPassword)) {
    return res.status(400).json({ message: 'Новый пароль не соответствует требованиям безопасности.' });
  }

  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

  const comparePassword = bcrypt.compareSync(currentPassword || '', user.password_hash);
  if (!comparePassword) {
    return res.status(400).json({ message: 'Неверный текущий пароль' });
  }

  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    return res.status(400).json({ message: 'Новый пароль не должен совпадать с текущим' });
  }

  user.password_hash = await bcrypt.hash(newPassword, 5);
  await user.save();

  return res.json({ message: 'Пароль успешно изменен' });
};

const updateProfile = async (req, res) => {
  const { full_name } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

  if (full_name) {
    if (!validateFullName(full_name)) {
      return res.status(400).json({ message: 'Введите корректное ФИО (минимум 2 слова, только буквы/пробелы/дефисы, 3-50 символов).' });
    }
    user.full_name = full_name.trim();
  }

  await user.save();
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      teacher_id: user.teacher_id,
      invite_code: user.invite_code,
      has_teacher: !!user.teacher_id,
      is_graduated: user.is_graduated
    }
  });
};

module.exports = {
  register,
  login,
  resendVerificationCode,
  verifyEmail,
  checkAuth,
  updateProfile,
  changePassword
};
