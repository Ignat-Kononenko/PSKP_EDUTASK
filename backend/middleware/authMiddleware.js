const jwt = require('jsonwebtoken');
const { User } = require('../models/models');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Нет авторизации' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      teacher_id: user.teacher_id,
      is_banned: user.is_banned
    };

    if (user.is_banned) {
      return res.status(403).json({ message: 'Аккаунт заблокирован' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Неверный токен' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Нет доступа' });
    }
    next();
  };
};

module.exports = { authMiddleware, checkRole };
