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
  const openingBalance = req.body.openingBalance || 0;

  const account = await BankAccount.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id,
    currentBalance: {
      amount: openingBalance,
      lastUpdated: new Date()
    }
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

// Recalculate account balance from all transactions
router.post('/accounts/:id/recalculate', hasPermission('bank.edit'), async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const BankTransaction = require('../models/BankTransaction');

  const account = await BankAccount.findOne({ _id: req.params.id, companyId: req.companyId });
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

  // Get all transactions for this account
  const transactions = await BankTransaction.find({
    bankAccount: req.params.id,
    companyId: req.companyId,
    status: { $in: ['completed', 'cleared'] }
  });

  // Start with opening balance
  let balance = account.openingBalance?.amount || 0;

  // Calculate balance from all transactions
  const creditTypes = ['deposit', 'transfer_in', 'cheque_deposit', 'interest'];
  const debitTypes = ['withdrawal', 'transfer_out', 'bank_charges', 'cheque_clearance'];

  for (const txn of transactions) {
    if (creditTypes.includes(txn.type)) {
      balance += txn.amount || 0;
    } else if (debitTypes.includes(txn.type)) {
      balance -= txn.amount || 0;
    }
  }

  // Update account balance
  await BankAccount.findByIdAndUpdate(req.params.id, {
    'currentBalance.amount': balance,
    'currentBalance.lastUpdated': new Date()
  });

  res.json({ success: true, message: 'Balance recalculated', data: { balance } });
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
  const BankAccount = require('../models/BankAccount');

  // Generate transaction number if not provided
  const transactionNumber = req.body.transactionNumber || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const transaction = await BankTransaction.create({
    ...req.body,
    transactionNumber,
    companyId: req.companyId,
    createdBy: req.user._id
  });

  // Update account balance based on transaction type
  const account = await BankAccount.findById(req.body.bankAccount);
  if (account) {
    const currentBalance = account.currentBalance?.amount || 0;
    const amount = req.body.amount || 0;

    // Determine if transaction increases or decreases balance
    const creditTypes = ['deposit', 'transfer_in', 'cheque_deposit', 'interest'];
    const debitTypes = ['withdrawal', 'transfer_out', 'bank_charges', 'cheque_clearance'];

    let newBalance = currentBalance;
    if (creditTypes.includes(req.body.type)) {
      newBalance = currentBalance + amount;
    } else if (debitTypes.includes(req.body.type)) {
      newBalance = currentBalance - amount;
    }

    await BankAccount.findByIdAndUpdate(req.body.bankAccount, {
      'currentBalance.amount': newBalance,
      'currentBalance.lastUpdated': new Date()
    });
  }

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

// Delete bank account (soft delete)
router.delete('/accounts/:id', hasPermission('bank.delete'), async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const account = await BankAccount.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { isActive: false },
    { new: true }
  );
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
  res.json({ success: true, message: 'Account deactivated', data: account });
});

// Update bank transaction
router.put('/transactions/:id', hasPermission('bank.edit'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const transaction = await BankTransaction.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { ...req.body, updatedBy: req.user._id },
    { new: true }
  );
  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
  res.json({ success: true, message: 'Transaction updated', data: transaction });
});

// Delete bank transaction
router.delete('/transactions/:id', hasPermission('bank.delete'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const transaction = await BankTransaction.findOneAndDelete({
    _id: req.params.id,
    companyId: req.companyId
  });
  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
  res.json({ success: true, message: 'Transaction deleted', data: transaction });
});

// Get cheques (transactions with cheque details)
router.get('/cheques', hasPermission('bank.view'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const { status, from, to, page = 1, limit = 50 } = req.query;

  const query = {
    companyId: req.companyId,
    $or: [
      { type: { $in: ['cheque_deposit', 'cheque_clearance'] } },
      { 'cheque.number': { $exists: true, $ne: null } }
    ]
  };

  if (status) query['cheque.status'] = status;
  if (from || to) {
    query['cheque.date'] = {};
    if (from) query['cheque.date'].$gte = new Date(from);
    if (to) query['cheque.date'].$lte = new Date(to);
  }

  const cheques = await BankTransaction.find(query)
    .populate('bankAccount', 'bankName accountNumber')
    .sort({ 'cheque.date': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await BankTransaction.countDocuments(query);

  res.json({
    success: true,
    data: cheques,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

// Create cheque (bank transaction with cheque details)
router.post('/cheques', hasPermission('bank.create'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const BankAccount = require('../models/BankAccount');

  const type = req.body.type === 'received' ? 'cheque_deposit' : 'cheque_clearance';

  // Generate transaction number if not provided
  const transactionNumber = req.body.transactionNumber || `CHQ-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const cheque = await BankTransaction.create({
    ...req.body,
    transactionNumber,
    type,
    companyId: req.companyId,
    createdBy: req.user._id,
    status: req.body.status || 'pending',
    cheque: {
      number: req.body.chequeNumber,
      date: req.body.chequeDate,
      bank: req.body.chequeBank,
      status: req.body.chequeStatus || 'pending'
    }
  });

  // Update account balance based on cheque type
  // Only update balance if cheque is cleared (for now, update on creation)
  const account = await BankAccount.findById(req.body.bankAccount);
  if (account) {
    const currentBalance = account.currentBalance?.amount || 0;
    const amount = req.body.amount || 0;

    let newBalance = currentBalance;
    if (type === 'cheque_deposit') {
      newBalance = currentBalance + amount;
    } else if (type === 'cheque_clearance') {
      newBalance = currentBalance - amount;
    }

    await BankAccount.findByIdAndUpdate(req.body.bankAccount, {
      'currentBalance.amount': newBalance,
      'currentBalance.lastUpdated': new Date()
    });
  }

  res.status(201).json({ success: true, message: 'Cheque created', data: cheque });
});

// Update cheque status
router.put('/cheques/:id/status', hasPermission('bank.edit'), async (req, res) => {
  const BankTransaction = require('../models/BankTransaction');
  const { status } = req.body;

  const update = {
    'cheque.status': status,
    status: status,
    updatedBy: req.user._id
  };

  if (status === 'cleared') {
    update.clearedAt = new Date();
  }

  const cheque = await BankTransaction.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    update,
    { new: true }
  );

  if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found' });
  res.json({ success: true, message: `Cheque ${status}`, data: cheque });
});

// Get bank summary (total balance, counts)
router.get('/summary', hasPermission('bank.view'), async (req, res) => {
  const BankAccount = require('../models/BankAccount');
  const BankTransaction = require('../models/BankTransaction');

  const accounts = await BankAccount.find({ companyId: req.companyId, isActive: true });
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance?.amount || 0), 0);

  const pendingCheques = await BankTransaction.countDocuments({
    companyId: req.companyId,
    'cheque.status': 'pending'
  });

  const clearedCheques = await BankTransaction.countDocuments({
    companyId: req.companyId,
    'cheque.status': 'cleared'
  });

  res.json({
    success: true,
    data: {
      totalBalance,
      accountCount: accounts.length,
      pendingCheques,
      clearedCheques,
      accounts: accounts.map(acc => ({
        _id: acc._id,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber,
        accountType: acc.accountType,
        balance: acc.currentBalance?.amount || 0
      }))
    }
  });
});

module.exports = router;
