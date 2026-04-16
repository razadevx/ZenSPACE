const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', roleController.getRoles);
router.get('/:id', roleController.getRole);

module.exports = router;
