const express = require('express');
const router = express.Router();
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Bank Account routes
router.get('/accounts', hasPermission('bank.view'), async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const accounts = await BankAccount.find({ companyId: req.companyId, isActive: true });
  res.json({ success: true, data: accounts });
});

router.post('/accounts', hasPermission('bank.create'), async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const account = await BankAccount.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Bank account created', data: account });
});

router.get('/accounts/:id', hasPermission('bank.view'), async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const account = await BankAccount.findOne({ _id: req.params.id, companyId: req.companyId });
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
  res.json({ success: true, data: account });
});

router.put('/accounts/:id', hasPermission('bank.edit'), async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const account = await BankAccount.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { ...req.body, updatedBy: req.user._id },
    { new: true }
  );
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
  res.json({ success: true, message: 'Account updated', data: account });
});

// Bank Transaction routes
router.get('/transactions', hasPermission('bank.view'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const { bankAccount, type, from, to, page = 1, limit = 50 } = req.query;
  
  const query = { companyId: req.companyId };
  if (bankAccount) query.bankAccount = bankAccount;
  if (type) query.type = type;
  if (from || to) {
    query.transactionDate = {};
    if (from) query.transactionDate.$gte = new Date(from);
    if (to) query.transactionDate.$lte = new Date(to);
  }
  
  const transactions = await BankTransaction.find(query)
    .populate('bankAccount', 'bankName accountNumber')
    .sort({ transactionDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await BankTransaction.countDocuments(query);
  
  res.json({
    success: true,
    data: transactions,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

router.post('/transactions', hasPermission('bank.create'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const transaction = await BankTransaction.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Bank transaction created', data: transaction });
});

router.put('/transactions/:id/clear', hasPermission('bank.edit'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const transaction = await BankTransaction.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { status: 'cleared', clearedAt: new Date() },
    { new: true }
  );
  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
  res.json({ success: true, message: 'Transaction cleared', data: transaction });
});

module.exports = router;
