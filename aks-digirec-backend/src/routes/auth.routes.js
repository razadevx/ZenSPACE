const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

// Validation rules - accept either (name) or (firstName + lastName)
const registerValidation = [
  body('name').optional().trim(),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body().custom((_, { req }) => {
    const { name, firstName, lastName } = req.body;
    if (name && String(name).trim()) return true;
    if (firstName && lastName && String(firstName).trim() && String(lastName).trim()) return true;
    throw new Error('Name is required (provide name or firstName and lastName)');
  })
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
router.post('/register', validate(registerValidation), authController.register);
router.post('/login', validate(loginValidation), authController.login);
router.get('/me', protect, authController.getMe);
router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);
router.put('/password', protect, validate(updatePasswordValidation), authController.updatePassword);
router.post('/forgot-password', validate([body('email').isEmail()]), authController.forgotPassword);
router.put('/reset-password/:token', validate([body('password').isLength({ min: 6 })]), authController.resetPassword);

module.exports = router;
