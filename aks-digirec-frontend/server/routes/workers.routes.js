const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Get worker activities for a date
router.get('/activities', (req, res) => {
  res.json({
    success: true,
    message: 'Worker activities endpoint',
    data: []
  });
});

// Create/update worker activity
router.post('/activities', (req, res) => {
  res.json({
    success: true,
    message: 'Worker activity created',
    data: req.body
  });
});

// Close day
router.post('/close-day', (req, res) => {
  res.json({
    success: true,
    message: 'Day closed successfully'
  });
});

// Close week
router.post('/close-week', (req, res) => {
  res.json({
    success: true,
    message: 'Week closed successfully'
  });
});

module.exports = router;
