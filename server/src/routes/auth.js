// ============================================================
// Aharada Education — Auth Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { 
  register, 
  sendRegistrationOTP,
  login, 
  getMe, 
  forgotPassword, 
  verifyOTP, 
  resetPassword,
  googleAuth 
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;
