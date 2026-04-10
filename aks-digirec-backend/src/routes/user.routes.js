const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

// All routes require authentication and company isolation
router.use(protect);
router.use(companyIsolation);

// User management routes (Admin only)
router.get('/', hasPermission('users.view'), userController.getUsers);
router.post('/', 
  hasPermission('users.create'),
  [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('email').isEmail(),
    body('roleId').notEmpty()
  ],
  userController.createUser
);
router.get('/:id', hasPermission('users.view'), userController.getUser);
router.put('/:id', hasPermission('users.edit'), userController.updateUser);
router.delete('/:id', hasPermission('users.delete'), userController.deleteUser);

// Profile routes (Any authenticated user)
router.put('/profile/me', userController.updateProfile);
router.get('/preferences/me', userController.getPreferences);
router.put('/preferences/me', userController.updatePreferences);

module.exports = router;
