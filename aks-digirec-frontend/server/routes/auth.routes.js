const express = require('express');
const { body } = require('express-validator');
const {
  signup,
  login,
  getMe,
  refresh,
  logout,
  updatePassword
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const signupValidation = [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional(),
  body('city').optional(),
  body('country').optional()
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.put('/update-password', protect, updatePasswordValidation, updatePassword);

module.exports = router;
