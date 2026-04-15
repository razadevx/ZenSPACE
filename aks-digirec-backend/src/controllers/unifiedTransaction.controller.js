const mongoose = require('mongoose');
const CashTransaction = require('../models/CashTransaction');
const LedgerTransaction = require('../models/LedgerTransaction');
const LedgerAccount = require('../models/LedgerAccount');
// Note: Stock side effects are handled separately via production/stock modules
// const FinishedGood = require('../models/FinishedGood');
// const RawMaterial = require('../models/RawMaterial');

/**
 * Unified Transaction Controller
 * All transaction types handled in one system with side effects
 */

// Cash impact rules
const CASH_IMPACT = {
  SALE: { direction: 'in', description: 'Cash from sale' },
  PURCHASE: { direction: 'out', description: 'Cash for purchase' },
  SALES_RETURN: { direction: 'out', description: 'Cash refund for sales return' },
  PURCHASE_RETURN: { direction: 'in', description: 'Cash received for purchase return' },
  EXPENSE: { direction: 'out', description: 'Cash for expense' },
  INCOME: { direction: 'in', description: 'Cash from income' },
  RECEIPT: { direction: 'in', description: 'Cash receipt' },
  PAYMENT: { direction: 'out', description: 'Cash payment' }
};

// Get all transactions with optional type filter
exports.getTransactions = async (req, res) => {
  const { type, from, to, partyType, partyId, status, search, page = 1, limit = 50 } = req.query;

  console.log('[DEBUG] getTransactions called with:', { type, from, to, status, companyId: req.companyId });

  const query = { companyId: req.companyId };

  // Type filter (for tabs) - exact match
  if (type) {
    query.type = type; // Exact match instead of $in for single type
    console.log('[DEBUG] Applying type filter:', type);
  }

  // Party filter
  if (partyType) query.partyType = partyType;
  if (partyId) query.partyId = partyId;

  // Status filter - exclude cancelled by default unless explicitly requested
  if (status) {
    query.status = status;
  } else {
    query.status = { $ne: 'cancelled' }; // Exclude cancelled transactions by default
  }

  // Date range filter
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
    // Default to today
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    query.transactionDate = { $gte: dayStart, $lte: dayEnd };
  }

  // Search by documentNo or partyName
  if (search) {
    query.$or = [
      { documentNo: { $regex: search, $options: 'i' } },
      { partyName: { $regex: search, $options: 'i' } },
      { transactionNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const [transactions, total] = await Promise.all([
    CashTransaction.find(query)
      .populate('partyId', 'name businessName')
      .populate('cashAccount', 'name')
      .populate('ledgerTransactionId')
      .sort({ transactionDate: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit),
    CashTransaction.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

// Get daily summary from unified transactions
exports.getDailySummary = async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  // Use UTC date parts to avoid timezone issues
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();
  const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  const companyId = new mongoose.Types.ObjectId(req.companyId);

  console.log('[DEBUG] getDailySummary:', { date, dayStart: dayStart.toISOString(), dayEnd: dayEnd.toISOString(), companyId: companyId?.toString() });

  // First, let's check how many total transactions exist for this date range
  const totalCount = await CashTransaction.countDocuments({
    companyId,
    transactionDate: { $gte: dayStart, $lte: dayEnd }
  });
  console.log('[DEBUG] Total CashTransaction count for date range:', totalCount);

  // Import invoice models for comprehensive summary
  const SaleInvoice = require('../models/SaleInvoice');
  const PurchaseInvoice = require('../models/PurchaseInvoice');

  // Aggregate from all sources in parallel
  const [
    cashTypeAggregation,
    salesAgg,
    purchasesAgg,
    salesReturnsAgg,
    purchaseReturnsAgg
  ] = await Promise.all([
    // CashTransaction aggregation by type
    CashTransaction.aggregate([
      {
        $match: {
          companyId,
          transactionDate: { $gte: dayStart, $lte: dayEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]),
    // SaleInvoice aggregation
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
    // PurchaseInvoice aggregation
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
    // Sales Returns from SaleInvoice
    SaleInvoice.aggregate([
      {
        $match: {
          companyId,
          'returnInfo.isReturned': true,
          'returnInfo.returnDate': { $gte: dayStart, $lte: dayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$returnInfo.returnAmount' }, count: { $sum: 1 } } }
    ]),
    // Purchase Returns from PurchaseInvoice
    PurchaseInvoice.aggregate([
      {
        $match: {
          companyId,
          'returnInfo.isReturned': true,
          'returnInfo.returnDate': { $gte: dayStart, $lte: dayEnd }
        }
      },
      { $group: { _id: null, total: { $sum: '$returnInfo.returnAmount' }, count: { $sum: 1 } } }
    ])
  ]);

  // Calculate summary from all sources
  const summary = {
    totalSales: 0,
    totalPurchases: 0,
    totalSalesReturns: 0,
    totalPurchaseReturns: 0,
    totalExpenses: 0,
    totalIncome: 0,
    netCash: 0,
    counts: {}
  };

  // Add invoice totals
  summary.totalSales = salesAgg[0]?.total || 0;
  summary.totalPurchases = purchasesAgg[0]?.total || 0;
  summary.totalSalesReturns = salesReturnsAgg[0]?.total || 0;
  summary.totalPurchaseReturns = purchaseReturnsAgg[0]?.total || 0;

  // Counts from invoices
  summary.counts['SALE'] = { total: summary.totalSales, count: salesAgg[0]?.count || 0 };
  summary.counts['PURCHASE'] = { total: summary.totalPurchases, count: purchasesAgg[0]?.count || 0 };
  summary.counts['SALES_RETURN'] = { total: summary.totalSalesReturns, count: salesReturnsAgg[0]?.count || 0 };
  summary.counts['PURCHASE_RETURN'] = { total: summary.totalPurchaseReturns, count: purchaseReturnsAgg[0]?.count || 0 };

  // Process CashTransaction types (EXPENSE, INCOME, and any direct cash SALES/PURCHASES)
  cashTypeAggregation.forEach(item => {
    const amount = item.total || 0;
    const count = item.count || 0;

    switch (item._id) {
      case 'SALE':
        summary.totalSales += amount;
        summary.counts['SALE'] = {
          total: (summary.counts['SALE']?.total || 0) + amount,
          count: (summary.counts['SALE']?.count || 0) + count
        };
        break;
      case 'PURCHASE':
        summary.totalPurchases += amount;
        summary.counts['PURCHASE'] = {
          total: (summary.counts['PURCHASE']?.total || 0) + amount,
          count: (summary.counts['PURCHASE']?.count || 0) + count
        };
        break;
      case 'SALES_RETURN':
        summary.totalSalesReturns += amount;
        summary.counts['SALES_RETURN'] = {
          total: (summary.counts['SALES_RETURN']?.total || 0) + amount,
          count: (summary.counts['SALES_RETURN']?.count || 0) + count
        };
        break;
      case 'PURCHASE_RETURN':
        summary.totalPurchaseReturns += amount;
        summary.counts['PURCHASE_RETURN'] = {
          total: (summary.counts['PURCHASE_RETURN']?.total || 0) + amount,
          count: (summary.counts['PURCHASE_RETURN']?.count || 0) + count
        };
        break;
      case 'EXPENSE':
        summary.totalExpenses = amount;
        summary.counts['EXPENSE'] = { total: amount, count };
        break;
      case 'INCOME':
        summary.totalIncome = amount;
        summary.counts['INCOME'] = { total: amount, count };
        break;
      default:
        summary.counts[item._id] = { total: amount, count };
    }
  });

  // Net cash calculation: Sales + Returns In + Income - Purchases - Returns Out - Expenses
  summary.netCash = summary.totalSales +
    summary.totalPurchaseReturns +
    summary.totalIncome -
    summary.totalPurchases -
    summary.totalSalesReturns -
    summary.totalExpenses;

  console.log('[DEBUG] Daily Summary:', {
    date: targetDate.toISOString().slice(0, 10),
    cashAgg: cashTypeAggregation,
    salesAgg,
    purchasesAgg,
    finalSummary: summary
  });

  res.json({
    success: true,
    data: {
      ...summary,
      date: targetDate.toISOString().slice(0, 10)
    }
  });
};

// Create transaction with side effects
exports.createTransaction = async (req, res, next) => {
  try {
    const {
      type, amount, transactionDate, partyId, partyType, partyName,
      description, notes, paymentMode = 'CASH', items, reference,
      category
    } = req.body;

    // Validation
    if (!type || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Type and positive amount are required'
      });
    }

    // Derive category from type if not provided
    const finalCategory = category || type.toLowerCase();

    // Get or create default cash account
    let cashAccount = req.body.cashAccount;
    if (!cashAccount) {
      cashAccount = await getDefaultCashAccount(req.companyId, req.user._id);
    }

    // Create transaction
    console.log('[DEBUG] Creating transaction:', { type, amount, partyName, partyId, partyType });

    // Handle partyId - convert empty string to null
    const finalPartyId = partyId && partyId.trim() !== '' ? partyId : null;
    const finalPartyType = partyType && partyType.trim() !== '' ? partyType : 'other';

    // Parse transaction date properly
    let parsedDate;
    if (transactionDate) {
      parsedDate = new Date(transactionDate);
      // Check if valid date
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }
    } else {
      parsedDate = new Date();
    }

    const transaction = await CashTransaction.create({
      type,
      category: finalCategory,
      amount,
      transactionDate: parsedDate,
      companyId: req.companyId,
      partyId: finalPartyId,
      partyType: finalPartyType,
      partyName: partyName || req.body.party?.name || 'Walk-in',
      description,
      notes,
      paymentMode,
      cashAccount,
      status: 'confirmed',
      createdBy: req.user._id,
      reference
    });

    console.log('[DEBUG] Transaction created:', { id: transaction._id, type: transaction.type, documentNo: transaction.documentNo });

    // Execute side effects based on transaction type (non-blocking - don't fail if side effects error)
    try {
      await executeSideEffects(transaction, items, req);
    } catch (sideEffectError) {
      console.error('[DEBUG] Side effects error (non-critical):', sideEffectError.message);
    }

    // Create ledger entry (non-blocking - don't fail if ledger entry errors)
    try {
      await createLedgerEntry(transaction, req);
    } catch (ledgerError) {
      console.error('[DEBUG] Ledger entry error (non-critical):', ledgerError.message);
    }

    // Update running balance (non-blocking)
    try {
      await updateRunningBalance(transaction);
    } catch (balanceError) {
      console.error('[DEBUG] Running balance error (non-critical):', balanceError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// Get single transaction
exports.getTransactionById = async (req, res) => {
  const transaction = await CashTransaction.findOne({
    _id: req.params.id,
    companyId: req.companyId
  })
    .populate('partyId', 'name businessName')
    .populate('cashAccount', 'name')
    .populate('ledgerTransactionId');

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }

  res.json({ success: true, data: transaction });
};

// Update transaction (only if draft)
exports.updateTransaction = async (req, res, next) => {
  try {
    const transaction = await CashTransaction.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft transactions can be edited'
      });
    }

    Object.assign(transaction, req.body, { updatedBy: req.user._id });
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction updated',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// Cancel transaction
exports.cancelTransaction = async (req, res, next) => {
  try {
    const transaction = await CashTransaction.findOne({
      _id: req.params.id,
      companyId: req.companyId
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Transaction already cancelled'
      });
    }

    // Reverse side effects
    await reverseSideEffects(transaction, req);

    // Reverse ledger entry
    await reverseLedgerEntry(transaction, req);

    transaction.status = 'cancelled';
    transaction.updatedBy = req.user._id;
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction cancelled',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Map category to transaction type
function mapCategoryToType(category) {
  const mapping = {
    'sale': 'SALE',
    'purchase': 'PURCHASE',
    'sale_return': 'SALES_RETURN',
    'purchase_return': 'PURCHASE_RETURN',
    'customer_payment': 'RECEIPT',
    'supplier_payment': 'PAYMENT',
    'salary': 'EXPENSE',
    'wages': 'EXPENSE',
    'rent': 'EXPENSE',
    'utilities': 'EXPENSE',
    'transport': 'EXPENSE',
    'maintenance': 'EXPENSE',
    'office_expense': 'EXPENSE',
    'marketing': 'EXPENSE',
    'bank_deposit': 'TRANSFER_OUT',
    'bank_withdrawal': 'TRANSFER_IN',
    'transfer': 'TRANSFER_OUT',
    'other_income': 'INCOME',
    'other_expense': 'EXPENSE',
    'adjustment': 'ADJUSTMENT'
  };
  return mapping[category] || 'EXPENSE';
}

// Migration endpoint to fix existing transactions without type
exports.migrateTransactions = async (req, res, next) => {
  try {
    console.log('[DEBUG] Starting transaction migration for company:', req.companyId);

    // Find all transactions without type field
    const transactions = await CashTransaction.find({
      companyId: req.companyId,
      $or: [
        { type: { $exists: false } },
        { type: null },
        { type: '' }
      ]
    });

    console.log('[DEBUG] Found transactions without type:', transactions.length);

    let updated = 0;
    let errors = [];

    for (const tx of transactions) {
      try {
        // Infer type from category
        const type = mapCategoryToType(tx.category);

        // Infer direction based on type
        const impact = CASH_IMPACT[type];
        const direction = impact ? impact.direction : (type.includes('RETURN') ? 'in' : 'out');

        tx.type = type;
        tx.direction = direction;
        await tx.save();
        updated++;
        console.log(`[DEBUG] Migrated tx ${tx._id}: category=${tx.category} -> type=${type}`);
      } catch (err) {
        errors.push({ id: tx._id, error: err.message });
        console.error(`[DEBUG] Failed to migrate tx ${tx._id}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Migration complete: ${updated} transactions updated, ${errors.length} errors`,
      data: { updated, errors, total: transactions.length }
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Get default cash account
async function getDefaultCashAccount(companyId, userId) {
  let cashAccount = await LedgerAccount.findOne({
    companyId,
    isCashAccount: true,
    isActive: true
  }).select('_id');

  if (cashAccount) return cashAccount._id;

  // Create default cash account
  const AccountGroup = require('../models/AccountGroup');

  let cashGroup = await AccountGroup.findOne({
    companyId,
    code: '1110'
  });

  if (!cashGroup) {
    cashGroup = await AccountGroup.create({
      companyId,
      code: '1110',
      name: { en: 'Cash & Bank', ur: 'نقد اور بینک' },
      type: 'asset',
      category: 'current_asset',
      normalBalance: 'debit',
      isSystem: true,
      level: 3,
      createdBy: userId
    });
  }

  const count = await LedgerAccount.countDocuments({
    companyId,
    code: { $regex: '^1110' }
  });

  const newAccount = await LedgerAccount.create({
    companyId,
    code: `1110${String(count + 1).padStart(3, '0')}`,
    name: { en: 'Cash in Hand', ur: 'نقد در دست' },
    accountGroup: cashGroup._id,
    type: 'asset',
    subType: 'cash',
    entityType: 'cash_account',
    isCashAccount: true,
    isSystem: true,
    openingBalance: { amount: 0, type: 'debit' },
    currentBalance: { debit: 0, credit: 0, net: 0 },
    createdBy: userId
  });

  return newAccount._id;
}

// Helper: Execute side effects based on transaction type
// Note: Stock side effects are handled separately via production/stock modules
async function executeSideEffects(transaction, items, req) {
  // Stock effects are currently disabled - implement via FinishedGood/RawMaterial models when needed
  // const { type } = transaction;
  // switch (type) {
  //   case 'SALE': await handleSaleSideEffects(transaction, items, req); break;
  //   case 'PURCHASE': await handlePurchaseSideEffects(transaction, items, req); break;
  //   case 'SALES_RETURN': await handleSalesReturnSideEffects(transaction, items, req); break;
  //   case 'PURCHASE_RETURN': await handlePurchaseReturnSideEffects(transaction, items, req); break;
  // }
}

/*
// Stock side effects - to be implemented with proper stock models
async function handleSaleSideEffects(transaction, items, req) {
  // Implement with FinishedGood model
}

async function handlePurchaseSideEffects(transaction, items, req) {
  // Implement with RawMaterial model
}

async function handleSalesReturnSideEffects(transaction, items, req) {
  // Implement with FinishedGood model
}

async function handlePurchaseReturnSideEffects(transaction, items, req) {
  // Implement with RawMaterial model
}
*/

// Helper: Get or create current fiscal year
async function getCurrentFiscalYear(companyId, userId) {
  const FiscalYear = require('../models/FiscalYear');
  const now = new Date();

  // Try to find current fiscal year
  let fiscalYear = await FiscalYear.findOne({
    companyId,
    isCurrent: true,
    status: 'open'
  });

  // If no current fiscal year, find one that contains today's date
  if (!fiscalYear) {
    fiscalYear = await FiscalYear.findOne({
      companyId,
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: 'open'
    });
  }

  // If still no fiscal year, create a default one
  if (!fiscalYear) {
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    fiscalYear = await FiscalYear.create({
      companyId,
      name: `FY ${currentYear}`,
      code: `FY${currentYear}`,
      startDate: startOfYear,
      endDate: endOfYear,
      isCurrent: true,
      status: 'open',
      createdBy: userId
    });
  }

  return fiscalYear;
}

// Helper: Create ledger entry
async function createLedgerEntry(transaction, req) {
  const impact = CASH_IMPACT[transaction.type];
  if (!impact) return;

  const cashAccount = await LedgerAccount.findById(transaction.cashAccount);
  if (!cashAccount) return;

  // Map CashTransaction type to LedgerTransaction type
  const typeMapping = {
    'SALE': 'sale',
    'PURCHASE': 'purchase',
    'SALES_RETURN': 'sale_return',
    'PURCHASE_RETURN': 'purchase_return',
    'EXPENSE': 'expense',
    'INCOME': 'receipt',
    'RECEIPT': 'receipt',
    'PAYMENT': 'payment'
  };
  const ledgerType = typeMapping[transaction.type] || 'journal';

  // Generate transaction number
  const txNumber = `LT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Get current fiscal year
  const fiscalYear = await getCurrentFiscalYear(req.companyId, req.user._id);

  const entries = [];

  if (impact.direction === 'in') {
    // Cash IN: Debit Cash, Credit Revenue/Payable
    entries.push({
      accountId: cashAccount._id,
      accountName: cashAccount.name?.en || 'Cash',
      entryType: 'debit',
      amount: transaction.amount,
      description: `${impact.description}: ${transaction.documentNo}`
    });

    // Find appropriate revenue/expense account based on type
    const revenueAccount = await getRevenueAccount(transaction.type, req.companyId, req.user._id);
    const revAcc = await LedgerAccount.findById(revenueAccount);
    entries.push({
      accountId: revenueAccount,
      accountName: revAcc?.name?.en || 'Revenue',
      entryType: 'credit',
      amount: transaction.amount,
      description: `${impact.description}: ${transaction.documentNo}`
    });
  } else {
    // Cash OUT: Credit Cash, Debit Expense/Asset
    entries.push({
      accountId: cashAccount._id,
      accountName: cashAccount.name?.en || 'Cash',
      entryType: 'credit',
      amount: transaction.amount,
      description: `${impact.description}: ${transaction.documentNo}`
    });

    const expenseAccount = await getExpenseAccount(transaction.type, transaction.category, req.companyId, req.user._id);
    const expAcc = await LedgerAccount.findById(expenseAccount);
    entries.push({
      accountId: expenseAccount,
      accountName: expAcc?.name?.en || 'Expense',
      entryType: 'debit',
      amount: transaction.amount,
      description: `${impact.description}: ${transaction.documentNo}`
    });
  }

  const ledgerTx = await LedgerTransaction.create({
    companyId: req.companyId,
    fiscalYearId: fiscalYear._id,
    transactionNumber: txNumber,
    date: transaction.transactionDate || new Date(),
    type: ledgerType,
    description: {
      en: `${transaction.type}: ${transaction.description || ''}`,
      ur: ''
    },
    narration: transaction.description || '',
    sourceDocument: {
      type: 'payment_voucher',
      documentId: transaction._id,
      documentNumber: transaction.documentNo
    },
    entries,
    totalDebit: transaction.amount,
    totalCredit: transaction.amount,
    status: 'posted',
    createdBy: req.user._id
  });

  // Link to cash transaction
  transaction.ledgerTransactionId = ledgerTx._id;
  await transaction.save();

  // Update account balances
  for (const entry of entries) {
    await LedgerAccount.findByIdAndUpdate(entry.accountId, {
      $inc: {
        'currentBalance.debit': entry.entryType === 'debit' ? entry.amount : 0,
        'currentBalance.credit': entry.entryType === 'credit' ? entry.amount : 0
      }
    });
  }
}

// Helper: Get revenue account for transaction type
async function getRevenueAccount(type, companyId, userId) {
  const LedgerAccount = require('../models/LedgerAccount');
  const AccountGroup = require('../models/AccountGroup');

  let accountCode;
  switch (type) {
    case 'SALE':
      accountCode = '4110';
      break;
    case 'PURCHASE_RETURN':
      accountCode = '4120';
      break;
    case 'INCOME':
      accountCode = '4130';
      break;
    default:
      accountCode = '4100';
  }

  let account = await LedgerAccount.findOne({ companyId, code: accountCode });

  if (!account) {
    let group = await AccountGroup.findOne({ companyId, code: '4100' });
    if (!group) {
      group = await AccountGroup.create({
        companyId,
        code: '4100',
        name: { en: 'Revenue', ur: 'آمدنی' },
        type: 'revenue',
        category: 'sales_revenue',
        normalBalance: 'credit',
        isSystem: true,
        level: 3,
        createdBy: userId
      });
    }

    account = await LedgerAccount.create({
      companyId,
      code: accountCode,
      name: { en: `${type} Revenue`, ur: `${type} آمدنی` },
      accountGroup: group._id,
      type: 'revenue',
      isSystem: true,
      createdBy: userId
    });
  }

  return account._id;
}

// Helper: Get expense account
async function getExpenseAccount(type, category, companyId, userId) {
  const LedgerAccount = require('../models/LedgerAccount');
  const AccountGroup = require('../models/AccountGroup');

  let accountCode;
  let accountName;

  switch (type) {
    case 'PURCHASE':
      accountCode = '5110';
      accountName = 'Purchases';
      break;
    case 'SALES_RETURN':
      accountCode = '5120';
      accountName = 'Sales Returns';
      break;
    case 'EXPENSE':
      accountCode = category ? `52${category.substring(0, 2).toUpperCase()}` : '5200';
      accountName = category || 'General Expense';
      break;
    default:
      accountCode = '5100';
      accountName = 'Expenses';
  }

  let account = await LedgerAccount.findOne({ companyId, code: accountCode });

  if (!account) {
    let group = await AccountGroup.findOne({ companyId, code: '5100' });
    if (!group) {
      group = await AccountGroup.create({
        companyId,
        code: '5100',
        name: { en: 'Expenses', ur: 'اخراجات' },
        type: 'expense',
        category: 'operating_expense',
        normalBalance: 'debit',
        isSystem: true,
        level: 3,
        createdBy: userId
      });
    }

    account = await LedgerAccount.create({
      companyId,
      code: accountCode,
      name: { en: accountName, ur: accountName },
      accountGroup: group._id,
      type: 'expense',
      isSystem: true,
      createdBy: userId
    });
  }

  return account._id;
}

// Helper: Update running balance
async function updateRunningBalance(transaction) {
  const impact = CASH_IMPACT[transaction.type];
  if (!impact) return;

  const lastTransaction = await CashTransaction.findOne({
    companyId: transaction.companyId,
    status: { $ne: 'cancelled' },
    _id: { $ne: transaction._id }
  }).sort({ transactionDate: -1, createdAt: -1 });

  let runningBalance = lastTransaction?.runningBalance || 0;

  if (impact.direction === 'in') {
    runningBalance += transaction.amount;
  } else {
    runningBalance -= transaction.amount;
  }

  transaction.runningBalance = runningBalance;
  await transaction.save();
}

// Helper: Reverse side effects
async function reverseSideEffects(transaction, req) {
  // Reverse stock movements based on original transaction type
  switch (transaction.type) {
    case 'SALE':
      // Return stock (reverse of sale)
      // This would require tracking which items were sold
      break;
    case 'PURCHASE':
      // Remove stock (reverse of purchase)
      break;
    case 'SALES_RETURN':
      // Remove stock (reverse of return)
      break;
    case 'PURCHASE_RETURN':
      // Return stock (reverse of return)
      break;
  }
}

// Helper: Reverse ledger entry
async function reverseLedgerEntry(transaction, req) {
  if (!transaction.ledgerTransactionId) return;

  const originalTx = await LedgerTransaction.findById(transaction.ledgerTransactionId);
  if (!originalTx) return;

  // Create reversing entries
  const reverseEntries = originalTx.entries.map(e => ({
    account: e.account,
    debit: e.credit,
    credit: e.debit,
    description: `Reversal: ${e.description}`
  }));

  await LedgerTransaction.create({
    companyId: req.companyId,
    transactionDate: new Date(),
    description: `Reversal: ${originalTx.description}`,
    reference: `REV-${transaction.documentNo}`,
    entries: reverseEntries,
    totalDebit: originalTx.totalCredit,
    totalCredit: originalTx.totalDebit,
    status: 'posted',
    createdBy: req.user._id
  });

  // Reverse account balances
  for (const entry of originalTx.entries) {
    await LedgerAccount.findByIdAndUpdate(entry.account, {
      $inc: {
        'currentBalance.debit': -entry.debit,
        'currentBalance.credit': -entry.credit
      }
    });
  }
}

// Cleanup all cash records for a company
exports.cleanupCashRecords = async (req, res, next) => {
  try {
    const companyId = new mongoose.Types.ObjectId(req.companyId);
    const { includeLedger = 'false' } = req.query;

    console.log('[DEBUG] Starting cash cleanup for company:', companyId.toString());

    // Count before deletion
    const cashCount = await CashTransaction.countDocuments({ companyId });
    const ledgerCount = await LedgerTransaction.countDocuments({ companyId, source: 'cash' });

    // Delete cash transactions
    const deletedCash = await CashTransaction.deleteMany({ companyId });
    console.log('[DEBUG] Deleted cash transactions:', deletedCash.deletedCount);

    // Optionally delete related ledger transactions
    let deletedLedger = { deletedCount: 0 };
    if (includeLedger === 'true') {
      deletedLedger = await LedgerTransaction.deleteMany({ companyId, source: 'cash' });
      console.log('[DEBUG] Deleted ledger transactions:', deletedLedger.deletedCount);
    }

    res.json({
      success: true,
      message: `Cleanup complete: ${deletedCash.deletedCount} cash transactions deleted${includeLedger === 'true' ? `, ${deletedLedger.deletedCount} ledger transactions deleted` : ''}`,
      data: {
        cashDeleted: deletedCash.deletedCount,
        cashBefore: cashCount,
        ledgerDeleted: deletedLedger.deletedCount,
        ledgerBefore: ledgerCount,
        includeLedger: includeLedger === 'true'
      }
    });
  } catch (error) {
    next(error);
  }
};
