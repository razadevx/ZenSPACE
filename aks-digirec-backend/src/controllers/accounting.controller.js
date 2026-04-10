const { 
  AccountGroup, LedgerAccount, LedgerTransaction, 
  LedgerEntry, FiscalYear 
} = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ============ ACCOUNT GROUPS ============

exports.getAccountGroups = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const query = { companyId: req.companyId };
  if (type) query.type = type;
  
  const groups = await AccountGroup.find(query).sort({ code: 1 });
  res.status(200).json({ success: true, data: groups });
});

exports.createAccountGroup = asyncHandler(async (req, res) => {
  const group = await AccountGroup.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Account group created', data: group });
});

exports.updateAccountGroup = asyncHandler(async (req, res, next) => {
  const group = await AccountGroup.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { ...req.body, updatedBy: req.user._id },
    { new: true }
  );
  if (!group) return next(new AppError('Account group not found', 404));
  res.status(200).json({ success: true, message: 'Account group updated', data: group });
});

// ============ LEDGER ACCOUNTS ============

exports.getLedgerAccounts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, type, group } = req.query;
  const query = { companyId: req.companyId, isActive: true };
  
  if (type) query.type = type;
  if (group) query.accountGroup = group;
  if (search) {
    query.$or = [
      { 'name.en': { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }
  
  const accounts = await LedgerAccount.find(query)
    .populate('accountGroup', 'name type')
    .sort({ code: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await LedgerAccount.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: accounts,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getLedgerAccount = asyncHandler(async (req, res, next) => {
  const account = await LedgerAccount.findOne({ _id: req.params.id, companyId: req.companyId })
    .populate('accountGroup', 'name type normalBalance');
  if (!account) return next(new AppError('Ledger account not found', 404));
  res.status(200).json({ success: true, data: account });
});

exports.createLedgerAccount = asyncHandler(async (req, res) => {
  const account = await LedgerAccount.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Ledger account created', data: account });
});

exports.updateLedgerAccount = asyncHandler(async (req, res, next) => {
  const account = await LedgerAccount.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!account) return next(new AppError('Ledger account not found', 404));
  res.status(200).json({ success: true, message: 'Ledger account updated', data: account });
});

exports.deleteLedgerAccount = asyncHandler(async (req, res, next) => {
  const account = await LedgerAccount.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { isActive: false, updatedBy: req.user._id },
    { new: true }
  );
  if (!account) return next(new AppError('Ledger account not found', 404));
  res.status(200).json({ success: true, message: 'Ledger account deleted' });
});

// Get account ledger (entries)
exports.getAccountLedger = asyncHandler(async (req, res, next) => {
  const { from, to, page = 1, limit = 50 } = req.query;
  
  const account = await LedgerAccount.findOne({ _id: req.params.id, companyId: req.companyId });
  if (!account) return next(new AppError('Ledger account not found', 404));
  
  const query = { companyId: req.companyId, accountId: req.params.id };
  
  if (from || to) {
    query.entryDate = {};
    if (from) query.entryDate.$gte = new Date(from);
    if (to) query.entryDate.$lte = new Date(to);
  }
  
  const entries = await LedgerEntry.find(query)
    .populate('transactionId', 'transactionNumber description')
    .sort({ entryDate: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await LedgerEntry.countDocuments(query);
  
  // Calculate opening balance
  let openingBalance = 0;
  if (from) {
    const openingEntries = await LedgerEntry.find({
      companyId: req.companyId,
      accountId: req.params.id,
      entryDate: { $lt: new Date(from) }
    });
    openingBalance = openingEntries.reduce((sum, e) => {
      return sum + (e.entryType === 'debit' ? e.amount : -e.amount);
    }, 0);
  }
  
  res.status(200).json({
    success: true,
    data: {
      account,
      entries,
      openingBalance,
      closingBalance: account.currentBalance.net
    },
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

// ============ FISCAL YEARS ============

exports.getFiscalYears = asyncHandler(async (req, res) => {
  const years = await FiscalYear.find({ companyId: req.companyId }).sort({ startDate: -1 });
  res.status(200).json({ success: true, data: years });
});

exports.getCurrentFiscalYear = asyncHandler(async (req, res) => {
  const year = await FiscalYear.getCurrent(req.companyId);
  if (!year) return next(new AppError('No active fiscal year found', 404));
  res.status(200).json({ success: true, data: year });
});

exports.createFiscalYear = asyncHandler(async (req, res) => {
  const { name, startDate, endDate } = req.body;
  
  const year = await FiscalYear.create({
    companyId: req.companyId,
    name,
    code: `FY${new Date(startDate).getFullYear()}${new Date(endDate).getFullYear()}`,
    startDate,
    endDate,
    createdBy: req.user._id
  });
  
  res.status(201).json({ success: true, message: 'Fiscal year created', data: year });
});

// ============ LEDGER TRANSACTIONS ============

exports.getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, from, to, type, status } = req.query;
  const query = { companyId: req.companyId };
  
  if (type) query.type = type;
  if (status) query.status = status;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }
  
  const transactions = await LedgerTransaction.find(query)
    .populate('entries.accountId', 'name code')
    .sort({ date: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await LedgerTransaction.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: transactions,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await LedgerTransaction.findOne({ _id: req.params.id, companyId: req.companyId })
    .populate('entries.accountId', 'name code type');
  if (!transaction) return next(new AppError('Transaction not found', 404));
  res.status(200).json({ success: true, data: transaction });
});

exports.createTransaction = asyncHandler(async (req, res, next) => {
  const { date, type, description, entries, narration } = req.body;
  
  // Validate entries balance
  const totalDebit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return next(new AppError('Transaction is not balanced', 400));
  }
  
  const transaction = await LedgerTransaction.createTransaction({
    companyId: req.companyId,
    date,
    type,
    description,
    narration,
    entries,
    createdBy: req.user._id
  }, req.user._id);
  
  res.status(201).json({ success: true, message: 'Transaction created', data: transaction });
});

exports.postTransaction = asyncHandler(async (req, res, next) => {
  let transaction = await LedgerTransaction.findOne({ 
    _id: req.params.id, 
    companyId: req.companyId,
    status: 'draft'
  });
  
  if (!transaction) return next(new AppError('Transaction not found or already posted', 404));
  
  await transaction.post(req.user._id);
  
  res.status(200).json({ success: true, message: 'Transaction posted successfully', data: transaction });
});

exports.reverseTransaction = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  let transaction = await LedgerTransaction.findOne({ 
    _id: req.params.id, 
    companyId: req.companyId,
    status: 'posted'
  });
  
  if (!transaction) return next(new AppError('Transaction not found or not posted', 404));
  
  const reversal = await transaction.reverse(reason, req.user._id);
  
  res.status(200).json({ 
    success: true, 
    message: 'Transaction reversed successfully', 
    data: { original: transaction, reversal } 
  });
});

// ============ TRIAL BALANCE ============

exports.getTrialBalance = asyncHandler(async (req, res) => {
  const { asOfDate } = req.query;
  
  const date = asOfDate ? new Date(asOfDate) : new Date();
  
  const accounts = await LedgerAccount.find({ companyId: req.companyId, isActive: true });
  
  const trialBalance = [];
  let totalDebit = 0;
  let totalCredit = 0;
  
  for (const account of accounts) {
    // Get entries up to the date
    const entries = await LedgerEntry.find({
      companyId: req.companyId,
      accountId: account._id,
      entryDate: { $lte: date }
    });
    
    const debit = entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
    const credit = entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);
    
    const balance = debit - credit;
    
    if (debit > 0 || credit > 0) {
      trialBalance.push({
        account: {
          id: account._id,
          code: account.code,
          name: account.name,
          type: account.type
        },
        debit: balance > 0 ? balance : 0,
        credit: balance < 0 ? Math.abs(balance) : 0
      });
      
      totalDebit += balance > 0 ? balance : 0;
      totalCredit += balance < 0 ? Math.abs(balance) : 0;
    }
  }
  
  res.status(200).json({
    success: true,
    data: {
      asOfDate: date,
      accounts: trialBalance,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
    }
  });
});

// ============ CHART OF ACCOUNTS ============

exports.getChartOfAccounts = asyncHandler(async (req, res) => {
  const accounts = await LedgerAccount.find({ companyId: req.companyId, isActive: true })
    .populate('accountGroup', 'name type')
    .sort({ code: 1 });
  
  // Group by type
  const grouped = {
    asset: [],
    liability: [],
    equity: [],
    revenue: [],
    expense: []
  };
  
  accounts.forEach(account => {
    grouped[account.type].push(account);
  });
  
  res.status(200).json({ success: true, data: grouped });
});
