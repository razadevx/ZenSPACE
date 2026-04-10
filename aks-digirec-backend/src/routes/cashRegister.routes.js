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
    if (from) query.transactionDate.$gte = new Date(from);
    if (to) query.transactionDate.$lte = new Date(to);
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

router.post('/transactions', hasPermission('cash.create'), async (req, res) => {
  const CashTransaction = require('../models/CashTransaction');
  const transaction = await CashTransaction.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Transaction created', data: transaction });
});

module.exports = router;
