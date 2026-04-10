const express = require('express');
const { protect } = require('../middleware/auth');
const { getDailySummary, getTransactions, createTransaction } = require('../controllers/cash.controller');

const router = express.Router();
router.use(protect);

// Get daily cash summary
router.get('/daily-summary', getDailySummary);

// Get all transactions for today
router.get('/transactions', getTransactions);

// Create new transaction
router.post('/transactions', createTransaction);

// Sales invoices
router.get('/sales', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/sales', (req, res) => {
  res.json({ success: true, message: 'Sales invoice created', data: req.body });
});

// Purchase invoices
router.get('/purchases', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/purchases', (req, res) => {
  res.json({ success: true, message: 'Purchase invoice created', data: req.body });
});

// Returns
router.get('/returns', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/returns', (req, res) => {
  res.json({ success: true, message: 'Return processed', data: req.body });
});

module.exports = router;
