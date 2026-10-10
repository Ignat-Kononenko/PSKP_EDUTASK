const express = require('express');
const router = express.Router();
const {
  register,
  login,
  resendVerificationCode,
  verifyEmail,
  checkAuth,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email/resend', resendVerificationCode);
router.post('/verify-email', verifyEmail);
router.get('/check', authMiddleware, checkAuth);
router.put('/profile', authMiddleware, updateProfile);
router.put('/profile/password', authMiddleware, changePassword);

module.exports = router;
