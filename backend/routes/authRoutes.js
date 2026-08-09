const express = require('express');
const router = express.Router();
const { register, sendOtp, verifyOtp, login, logout, getMe, updateProfile, changePassword, refreshSession, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshSession);
router.post('/logout', protect(), logout);
router.get('/me', protect(), getMe);
router.put('/profile', protect(), updateProfile);
router.put('/change-password', protect(), changePassword);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
