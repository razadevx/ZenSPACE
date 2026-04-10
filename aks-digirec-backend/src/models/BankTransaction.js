const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Transaction number
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Bank account
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BankAccount',
    required: true
  },
  // Transaction date
  transactionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Value date (for interest calculation)
  valueDate: Date,
  // Transaction type
  type: {
    type: String,
    required: true,
    enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'cheque_deposit', 'cheque_clearance', 'bank_charges', 'interest'],
    index: true
  },
  // Category
  category: {
    type: String,
    enum: [
      'customer_payment', 'supplier_payment', 'salary', 'expense',
      'loan_receipt', 'loan_repayment', 'investment', 'transfer',
      'cheque', 'cash_deposit', 'cash_withdrawal',
      'bank_charges', 'interest_earned', 'interest_paid', 'other'
    ]
  },
  // Party
  party: {
    name: String,
    type: { type: String, enum: ['customer', 'supplier', 'worker', 'bank', 'other'] },
    id: mongoose.Schema.Types.ObjectId
  },
  // Amount
  amount: {
    type: Number,
    required: true
  },
  // Currency
  currency: {
    type: String,
    default: 'PKR'
  },
  // Cheque details
  cheque: {
    number: String,
    date: Date,
    bank: String,
    status: { type: String, enum: ['pending', 'cleared', 'bounced', 'cancelled'] }
  },
  // Reference
  reference: String,
  // Description
  description: String,
  // Notes
  notes: String,
  // Status
  status: {
    type: String,
    enum: ['pending', 'cleared', 'bounced', 'cancelled'],
    default: 'cleared'
  },
  // Clearing date
  clearedAt: Date,
  // Running balance
  runningBalance: {
    type: Number,
    default: 0
  },
  // Ledger transaction
  ledgerTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
  // Reconciliation
  reconciliation: {
    isReconciled: { type: Boolean, default: false },
    reconciledAt: Date,
    reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    statementDate: Date
  },
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
bankTransactionSchema.index({ companyId: 1, transactionNumber: 1 }, { unique: true });
bankTransactionSchema.index({ companyId: 1, bankAccount: 1, transactionDate: -1 });
bankTransactionSchema.index({ companyId: 1, type: 1 });
bankTransactionSchema.index({ companyId: 1, status: 1 });
bankTransactionSchema.index({ companyId: 1, 'reconciliation.isReconciled': 1 });

// Pre-save middleware to generate transaction number
bankTransactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionNumber) {
    const prefix = 'BT';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.transactionNumber = `${prefix}${timestamp}`;
  }
  next();
});

module.exports = mongoose.model('BankTransaction', bankTransactionSchema);
