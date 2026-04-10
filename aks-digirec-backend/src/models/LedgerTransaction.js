const mongoose = require('mongoose');

const ledgerTransactionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Transaction number (auto-generated)
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Transaction date
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Transaction type
  type: {
    type: String,
    required: true,
    enum: [
      'journal', 'opening_balance', 'closing_entry',
      'sale', 'sale_return', 'purchase', 'purchase_return',
      'payment', 'receipt', 'expense',
      'bank_deposit', 'bank_withdrawal', 'bank_transfer',
      'stock_adjustment', 'production', 'labour',
      'depreciation', 'accrual', 'prepayment'
    ],
    index: true
  },
  // Description
  description: {
    en: { type: String, required: true },
    ur: String
  },
  // Narration/Notes
  narration: String,
  // Reference to source document
  sourceDocument: {
    type: {
      type: String,
      enum: ['sale_invoice', 'purchase_invoice', 'payment_voucher', 'receipt_voucher',
             'journal_voucher', 'stock_voucher', 'production_order', 'worker_payment']
    },
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String
  },
  // Entries (embedded for quick access)
  entries: [{
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerAccount',
      required: true
    },
    accountName: String,
    entryType: {
      type: String,
      enum: ['debit', 'credit'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    description: String,
    costCenter: String
  }],
  // Totals
  totalDebit: {
    type: Number,
    required: true,
    default: 0
  },
  totalCredit: {
    type: Number,
    required: true,
    default: 0
  },
  // Balance check
  isBalanced: {
    type: Boolean,
    default: false
  },
  difference: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed', 'void'],
    default: 'draft',
    index: true
  },
  // Posting information
  postedAt: Date,
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Reversal information
  reversedAt: Date,
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reversalReason: String,
  reversedTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
  // Fiscal year
  fiscalYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FiscalYear',
    required: true
  },
  // Period/Month
  period: {
    year: Number,
    month: Number
  },
  // Tags
  tags: [String],
  // Attachments
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  // Approval workflow
  approvals: [{
    level: Number,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    comment: String,
    approvedAt: Date
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
ledgerTransactionSchema.index({ companyId: 1, date: -1 });
ledgerTransactionSchema.index({ companyId: 1, type: 1, date: -1 });
ledgerTransactionSchema.index({ companyId: 1, status: 1 });
ledgerTransactionSchema.index({ companyId: 1, fiscalYearId: 1 });
ledgerTransactionSchema.index({ companyId: 1, 'sourceDocument.documentId': 1 });
ledgerTransactionSchema.index({ transactionNumber: 'text', 'description.en': 'text', 'description.ur': 'text' });

// Pre-save middleware to validate balance and generate transaction number
ledgerTransactionSchema.pre('save', async function(next) {
  // Calculate totals
  this.totalDebit = this.entries.filter(e => e.entryType === 'debit').reduce((sum, e) => sum + e.amount, 0);
  this.totalCredit = this.entries.filter(e => e.entryType === 'credit').reduce((sum, e) => sum + e.amount, 0);
  
  // Check balance
  this.difference = Math.abs(this.totalDebit - this.totalCredit);
  this.isBalanced = this.difference < 0.01; // Allow for small rounding differences
  
  // Set period from date
  if (this.date) {
    const d = new Date(this.date);
    this.period = {
      year: d.getFullYear(),
      month: d.getMonth() + 1
    };
  }
  
  // Generate transaction number if new
  if (this.isNew && !this.transactionNumber) {
    const count = await mongoose.model('LedgerTransaction').countDocuments({ companyId: this.companyId });
    const prefix = this.type.substring(0, 3).toUpperCase();
    this.transactionNumber = `${prefix}${Date.now().toString(36).toUpperCase()}${String(count + 1).padStart(4, '0')}`;
  }
  
  next();
});

// Static method to create transaction
ledgerTransactionSchema.statics.createTransaction = async function(data, userId) {
  const FiscalYear = require('./FiscalYear');
  
  // Get current fiscal year
  const fiscalYear = await FiscalYear.getCurrent(data.companyId);
  if (!fiscalYear) {
    throw new Error('No active fiscal year found');
  }
  
  // Create transaction
  const transaction = await this.create({
    ...data,
    fiscalYearId: fiscalYear._id,
    createdBy: userId
  });
  
  return transaction;
};

// Method to post transaction
ledgerTransactionSchema.methods.post = async function(userId) {
  if (this.status !== 'draft') {
    throw new Error('Only draft transactions can be posted');
  }
  
  if (!this.isBalanced) {
    throw new Error('Transaction is not balanced');
  }
  
  const LedgerEntry = require('./LedgerEntry');
  const LedgerAccount = require('./LedgerAccount');
  
  // Create ledger entries
  const entryPromises = this.entries.map(async (entry, index) => {
    // Get account for running balance
    const account = await LedgerAccount.findById(entry.accountId);
    
    // Calculate running balance
    const currentDebit = account.currentBalance.debit;
    const currentCredit = account.currentBalance.credit;
    const newDebit = entry.entryType === 'debit' ? currentDebit + entry.amount : currentDebit;
    const newCredit = entry.entryType === 'credit' ? currentCredit + entry.amount : currentCredit;
    
    // Create entry
    await LedgerEntry.create({
      companyId: this.companyId,
      transactionId: this._id,
      accountId: entry.accountId,
      entryType: entry.entryType,
      amount: entry.amount,
      amountInBase: entry.amount,
      description: { en: entry.description || this.description.en },
      runningBalance: {
        debit: newDebit,
        credit: newCredit,
        net: newDebit - newCredit
      },
      costCenter: entry.costCenter,
      reference: {
        type: this.sourceDocument?.type,
        documentType: this.sourceDocument?.type,
        documentId: this.sourceDocument?.documentId,
        documentNumber: this.sourceDocument?.documentNumber
      },
      fiscalYearId: this.fiscalYearId,
      entryDate: this.date,
      createdBy: userId
    });
    
    // Update account balance
    await account.updateBalance(
      entry.entryType === 'debit' ? entry.amount : 0,
      entry.entryType === 'credit' ? entry.amount : 0
    );
  });
  
  await Promise.all(entryPromises);
  
  // Update transaction status
  this.status = 'posted';
  this.postedAt = new Date();
  this.postedBy = userId;
  await this.save();
  
  return this;
};

// Method to reverse transaction
ledgerTransactionSchema.methods.reverse = async function(reason, userId) {
  if (this.status !== 'posted') {
    throw new Error('Only posted transactions can be reversed');
  }
  
  const LedgerEntry = require('./LedgerEntry');
  const LedgerAccount = require('./LedgerAccount');
  
  // Get original entries
  const originalEntries = await LedgerEntry.find({ transactionId: this._id });
  
  // Create reversal transaction
  const reversalData = {
    companyId: this.companyId,
    date: new Date(),
    type: this.type,
    description: {
      en: `Reversal of ${this.transactionNumber}: ${this.description.en}`,
      ur: `الٹا ${this.transactionNumber}: ${this.description.ur || this.description.en}`
    },
    narration: `Reversal Reason: ${reason}`,
    entries: this.entries.map(e => ({
      accountId: e.accountId,
      accountName: e.accountName,
      entryType: e.entryType === 'debit' ? 'credit' : 'debit', // Reverse
      amount: e.amount,
      description: `Reversal of ${this.transactionNumber}`
    })),
    fiscalYearId: this.fiscalYearId,
    createdBy: userId
  };
  
  const reversalTransaction = await mongoose.model('LedgerTransaction').create(reversalData);
  await reversalTransaction.post(userId);
  
  // Update original transaction
  this.status = 'reversed';
  this.reversedAt = new Date();
  this.reversedBy = userId;
  this.reversalReason = reason;
  this.reversedTransactionId = reversalTransaction._id;
  await this.save();
  
  return reversalTransaction;
};

module.exports = mongoose.model('LedgerTransaction', ledgerTransactionSchema);
