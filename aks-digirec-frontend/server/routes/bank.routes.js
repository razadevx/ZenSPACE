const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Bank accounts
router.get('/accounts', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/accounts', (req, res) => {
  res.json({ success: true, message: 'Account created', data: req.body });
});

// Bank transactions
router.get('/transactions', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/transactions', (req, res) => {
  res.json({ success: true, message: 'Transaction recorded', data: req.body });
});

// Cheques
router.get('/cheques', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/cheques', (req, res) => {
  res.json({ success: true, message: 'Cheque recorded', data: req.body });
});

// Fund transfers
router.post('/transfer', (req, res) => {
  res.json({ success: true, message: 'Transfer completed', data: req.body });
});

module.exports = router;
