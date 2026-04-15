const express = require('express');
const router = express.Router();
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// ─── Daily Summary ────────────────────────────────────────────────────────────
router.get('/daily-summary', hasPermission('cash.view'), async (req, res) => {
  const SaleInvoice = require('../models/SaleInvoice');
  const PurchaseInvoice = require('../models/PurchaseInvoice');
  const CashTransaction = require('../models/CashTransaction');

  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const companyId = req.companyId;

  const [salesAgg, purchasesAgg, expensesAgg] = await Promise.all([
    SaleInvoice.aggregate([
      {
        $match: {
          companyId,
          invoiceDate: { $gte: dayStart, $lte: dayEnd },
          status: { $nin: ['cancelled', 'returned'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$summary.grandTotal' }, count: { $sum: 1 } } }
    ]),
    PurchaseInvoice.aggregate([
      {
        $match: {
          companyId,
          invoiceDate: { $gte: dayStart, $lte: dayEnd },
          status: { $nin: ['cancelled', 'returned'] }
        }
      },
      { $group: { _id: null, total: { $sum: '$summary.grandTotal' }, count: { $sum: 1 } } }
    ]),
    CashTransaction.aggregate([
      {
        $match: {
          companyId,
          transactionDate: { $gte: dayStart, $lte: dayEnd },
          type: { $in: ['payment', 'expense'] },
          status: { $ne: 'cancelled' }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  const totalSales = salesAgg[0]?.total ?? 0;
  const totalPurchases = purchasesAgg[0]?.total ?? 0;
  const totalExpenses = expensesAgg[0]?.total ?? 0;
  const netCash = totalSales - totalPurchases - totalExpenses;

  res.json({
    success: true,
    data: {
      totalSales,
      totalPurchases,
      totalExpenses,
      netCash,
      salesCount: salesAgg[0]?.count ?? 0,
      purchasesCount: purchasesAgg[0]?.count ?? 0,
      expensesCount: expensesAgg[0]?.count ?? 0,
      date: targetDate.toISOString().slice(0, 10)
    }
  });
});

// ─── Sale Invoice routes ──────────────────────────────────────────────────────
router.get('/sales', hasPermission('cash.view'), async (req, res) => {
  const SaleInvoice = require('../models/SaleInvoice');
  const { customer, status, from, to, page = 1, limit = 50 } = req.query;

  const query = { companyId: req.companyId };
  if (customer) query.customer = customer;
  if (status) query.status = status;

  // Default to today if no date range provided
  if (from || to) {
    query.invoiceDate = {};
    if (from) query.invoiceDate.$gte = new Date(from);
    if (to) query.invoiceDate.$lte = new Date(to);
  } else {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    query.invoiceDate = { $gte: dayStart, $lte: dayEnd };
  }

  const invoices = await SaleInvoice.find(query)
    .populate('customer', 'name businessName')
    .sort({ invoiceDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await SaleInvoice.countDocuments(query);

  res.json({
    success: true,
    data: invoices,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

router.post('/sales', hasPermission('cash.create'), async (req, res) => {
  const SaleInvoice = require('../models/SaleInvoice');
  const invoice = await SaleInvoice.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Sale invoice created', data: invoice });
});

router.get('/sales/:id', hasPermission('cash.view'), async (req, res) => {
  const SaleInvoice = require('../models/SaleInvoice');
  const invoice = await SaleInvoice.findOne({ _id: req.params.id, companyId: req.companyId })
    .populate('customer', 'name businessName address')
    .populate('items.finishedGood', 'name code');
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: invoice });
});

router.post('/sales/:id/payment', hasPermission('cash.edit'), async (req, res) => {
  const SaleInvoice = require('../models/SaleInvoice');
  const { amount, method, reference, notes } = req.body;

  const invoice = await SaleInvoice.findOne({ _id: req.params.id, companyId: req.companyId });
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  invoice.paymentsReceived.push({ date: new Date(), amount, method, reference, notes });
  invoice.payment.paidAmount += amount;
  invoice.payment.lastPaymentDate = new Date();

  if (invoice.payment.paidAmount >= invoice.summary.grandTotal) {
    invoice.payment.status = 'paid';
    invoice.status = 'paid';
  } else {
    invoice.payment.status = 'partial';
  }

  await invoice.save();
  res.json({ success: true, message: 'Payment recorded', data: invoice });
});

// ─── Sales Returns ────────────────────────────────────────────────────────────
router.get('/sales-returns', hasPermission('cash.view'), async (req, res) => {
  const SaleInvoice = require('../models/SaleInvoice');
  const { from, to, page = 1, limit = 50 } = req.query;

  const query = { companyId: req.companyId, 'returnInfo.isReturned': true };

  if (from || to) {
    query['returnInfo.returnDate'] = {};
    if (from) query['returnInfo.returnDate'].$gte = new Date(from);
    if (to) query['returnInfo.returnDate'].$lte = new Date(to);
  } else {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    query['returnInfo.returnDate'] = { $gte: dayStart, $lte: dayEnd };
  }

  const invoices = await SaleInvoice.find(query)
    .populate('customer', 'name businessName')
    .sort({ 'returnInfo.returnDate': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await SaleInvoice.countDocuments(query);

  res.json({
    success: true,
    data: invoices,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

// ─── Purchase Invoice routes ──────────────────────────────────────────────────
router.get('/purchases', hasPermission('cash.view'), async (req, res) => {
  const PurchaseInvoice = require('../models/PurchaseInvoice');
  const { supplier, status, from, to, page = 1, limit = 50 } = req.query;

  const query = { companyId: req.companyId };
  if (supplier) query.supplier = supplier;
  if (status) query.status = status;

  if (from || to) {
    query.invoiceDate = {};
    if (from) query.invoiceDate.$gte = new Date(from);
    if (to) query.invoiceDate.$lte = new Date(to);
  } else {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    query.invoiceDate = { $gte: dayStart, $lte: dayEnd };
  }

  const invoices = await PurchaseInvoice.find(query)
    .populate('supplier', 'businessName')
    .sort({ invoiceDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await PurchaseInvoice.countDocuments(query);

  res.json({
    success: true,
    data: invoices,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

router.post('/purchases', hasPermission('cash.create'), async (req, res) => {
  const PurchaseInvoice = require('../models/PurchaseInvoice');
  const invoice = await PurchaseInvoice.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Purchase invoice created', data: invoice });
});

// ─── Purchase Returns ─────────────────────────────────────────────────────────
router.get('/purchase-returns', hasPermission('cash.view'), async (req, res) => {
  const PurchaseInvoice = require('../models/PurchaseInvoice');
  const { from, to, page = 1, limit = 50 } = req.query;

  const query = { companyId: req.companyId, 'returnInfo.isReturned': true };

  if (from || to) {
    query['returnInfo.returnDate'] = {};
    if (from) query['returnInfo.returnDate'].$gte = new Date(from);
    if (to) query['returnInfo.returnDate'].$lte = new Date(to);
  } else {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    query['returnInfo.returnDate'] = { $gte: dayStart, $lte: dayEnd };
  }

  const invoices = await PurchaseInvoice.find(query)
    .populate('supplier', 'businessName')
    .sort({ 'returnInfo.returnDate': -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await PurchaseInvoice.countDocuments(query);

  res.json({
    success: true,
    data: invoices,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

// ─── Cash Transaction routes ──────────────────────────────────────────────────
router.get('/transactions', hasPermission('cash.view'), async (req, res) => {
  const CashTransaction = require('../models/CashTransaction');
  const { type, from, to, page = 1, limit = 50 } = req.query;

  const query = { companyId: req.companyId };
  if (type) query.type = type;

  if (from || to) {
    query.transactionDate = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      query.transactionDate.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.transactionDate.$lte = toDate;
    }
  } else {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(); dayEnd.setHours(23, 59, 59, 999);
    query.transactionDate = { $gte: dayStart, $lte: dayEnd };
  }

  const transactions = await CashTransaction.find(query)
    .populate('cashAccount', 'name')
    .sort({ transactionDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await CashTransaction.countDocuments(query);

  res.json({
    success: true,
    data: transactions,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

router.post('/transactions', hasPermission('cash.create'), async (req, res, next) => {
  try {
    const CashTransaction = require('../models/CashTransaction');
    const LedgerAccount = require('../models/LedgerAccount');
    const AccountGroup = require('../models/AccountGroup');

    // Find or create default cash account for company
    let cashAccount = req.body.cashAccount;
    if (!cashAccount) {
      const defaultCash = await LedgerAccount.findOne({
        companyId: req.companyId,
        isCashAccount: true,
        isActive: true
      }).select('_id');

      if (defaultCash) {
        cashAccount = defaultCash._id;
      } else {
        // Find or create Cash & Bank account group (code 1110)
        let cashAccountGroup = await AccountGroup.findOne({
          companyId: req.companyId,
          code: '1110'
        });

        // If no account group exists, create basic structure
        if (!cashAccountGroup) {
          // Create the Cash & Bank account group
          cashAccountGroup = await AccountGroup.create({
            companyId: req.companyId,
            code: '1110',
            name: { en: 'Cash & Bank', ur: 'نقد اور بینک' },
            type: 'asset',
            category: 'current_asset',
            normalBalance: 'debit',
            isSystem: true,
            level: 3,
            createdBy: req.user._id
          });
        }

        // Count existing cash accounts to generate unique code
        const cashCount = await LedgerAccount.countDocuments({
          companyId: req.companyId,
          code: { $regex: '^1110' }
        });
        const code = `1110${String(cashCount + 1).padStart(3, '0')}`;

        // Create default cash account with proper structure
        const newCashAccount = await LedgerAccount.create({
          companyId: req.companyId,
          code: code,
          name: { en: 'Cash in Hand', ur: 'نقد در دست' },
          accountGroup: cashAccountGroup._id,
          type: 'asset',
          subType: 'cash',
          entityType: 'cash_account',
          isCashAccount: true,
          isSystem: true,
          openingBalance: { amount: 0, type: 'debit' },
          currentBalance: { debit: 0, credit: 0, net: 0 },
          createdBy: req.user._id
        });
        cashAccount = newCashAccount._id;
      }
    }

    const transaction = await CashTransaction.create({
      ...req.body,
      companyId: req.companyId,
      createdBy: req.user._id,
      cashAccount,
      status: 'confirmed'
    });

    res.status(201).json({ success: true, message: 'Transaction created', data: transaction });
  } catch (error) {
    next(error);
  }
});

// ─── Unified Transaction API ──────────────────────────────────────────────────
const unifiedController = require('../controllers/unifiedTransaction.controller');

// GET /cash-register/unified - Get all transactions with type filter
router.get('/unified', hasPermission('cash.view'), unifiedController.getTransactions);

// GET /cash-register/unified/summary - Get daily summary
router.get('/unified/summary', hasPermission('cash.view'), unifiedController.getDailySummary);

// POST /cash-register/unified - Create unified transaction
router.post('/unified', hasPermission('cash.create'), unifiedController.createTransaction);

// GET /cash-register/unified/:id - Get single transaction
router.get('/unified/:id', hasPermission('cash.view'), unifiedController.getTransactionById);

// PUT /cash-register/unified/:id - Update transaction
router.put('/unified/:id', hasPermission('cash.edit'), unifiedController.updateTransaction);

// PATCH /cash-register/unified/:id/cancel - Cancel transaction
router.patch('/unified/:id/cancel', hasPermission('cash.delete'), unifiedController.cancelTransaction);

// POST /cash-register/unified/migrate - Fix existing transactions without type
router.post('/unified/migrate', hasPermission('cash.admin'), unifiedController.migrateTransactions);

// POST /cash-register/unified/cleanup - Delete all cash records for company
router.post('/unified/cleanup', hasPermission('cash.admin'), unifiedController.cleanupCashRecords);

module.exports = router;
