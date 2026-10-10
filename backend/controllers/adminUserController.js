const bcrypt = require('bcryptjs');
const { User } = require('../models/models');
const { getIdOrRespond, generateInviteCode } = require('./helpers');

const getAllUsers = async (req, res) => {
  const users = await User.findAll({ order: [['id', 'DESC']] });
  return res.json(users);
};

const createUserByAdmin = async (req, res) => {
  const { full_name, email, password, role } = req.body;

  if (role && role !== 'TEACHER') {
    return res.status(400).json({ message: 'Можно создавать только преподавателей' });
  }

  const candidate = await User.findOne({ where: { email } });
  if (candidate) return res.status(400).json({ message: 'Email уже занят' });

  const hashPassword = await bcrypt.hash(password, 5);
  const invite_code = generateInviteCode();

  const user = await User.create({
    full_name,
    email,
    password_hash: hashPassword,
    role: 'TEACHER',
    is_verified: true,
    invite_code
  });

  return res.json(user);
};

const banUser = async (req, res) => {
  const { user_id, is_banned } = req.body;
  const user = await User.findByPk(user_id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  user.is_banned = is_banned;
  await user.save();
  return res.json(user);
};

const banUserById = async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  if (user.role === 'ADMIN') {
    return res.status(403).json({ message: 'Нельзя заблокировать администратора' });
  }
  if (user.is_banned) {
    return res.status(400).json({ message: 'Пользователь уже заблокирован' });
  }
  user.is_banned = true;
  await user.save();
  return res.json({ message: 'Пользователь заблокирован', user });
};

const unbanUserById = async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  if (!user.is_banned) {
    return res.status(400).json({ message: 'Пользователь не заблокирован' });
  }
  user.is_banned = false;
  await user.save();
  return res.json({ message: 'Пользователь разблокирован', user });
};

const restoreStudent = async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  if (user.role !== 'STUDENT') {
    return res.status(400).json({ message: 'Функция доступна только для учеников' });
  }
  user.is_graduated = false;
  await user.save();
  return res.json({ message: 'Обучение ученика возобновлено', user });
};

const adminUpdateUser = async (req, res) => {
  const id = getIdOrRespond(req, res, 'id');
  if (id === null) return;
  const { full_name, email, teacher_id, is_graduated } = req.body;

  const user = await User.findByPk(id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

  if (email && email !== user.email) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email уже используется' });
    }
    user.email = email;
  }

  if (full_name !== undefined) {
    user.full_name = full_name;
  }

  if (teacher_id !== undefined) {
    if (!teacher_id) {
      if (user.role === 'STUDENT') {
        return res.status(400).json({ message: 'Укажите преподавателя для ученика' });
      }
      user.teacher_id = null;
    } else {
      const teacher = await User.findOne({ where: { id: teacher_id, role: 'TEACHER' } });
      if (!teacher) {
        return res.status(400).json({ message: 'Преподаватель не найден' });
      }
      user.teacher_id = teacher.id;
    }
  }

  if (is_graduated !== undefined && user.role === 'STUDENT') {
    user.is_graduated = !!is_graduated;
  }

  await user.save();
  return res.json(user);
};

module.exports = {
  getAllUsers,
  createUserByAdmin,
  banUser,
  adminUpdateUser,
  restoreStudent,
  banUserById,
  unbanUserById
};
