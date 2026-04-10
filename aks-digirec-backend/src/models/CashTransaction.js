const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
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
  // Transaction date
  transactionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Transaction type
  type: {
    type: String,
    required: true,
    enum: ['receipt', 'payment', 'expense', 'income', 'transfer_in', 'transfer_out', 'adjustment'],
    index: true
  },
  // Category
  category: {
    type: String,
    required: true,
    enum: [
      'sale', 'sale_return', 'purchase', 'purchase_return',
      'customer_payment', 'supplier_payment',
      'salary', 'wages', 'rent', 'utilities', 'transport',
      'maintenance', 'office_expense', 'marketing',
      'bank_deposit', 'bank_withdrawal', 'transfer',
      'other_income', 'other_expense', 'adjustment'
    ]
  },
  // Party (customer, supplier, worker)
  party: {
    type: { type: String, enum: ['customer', 'supplier', 'worker', 'other'] },
    id: mongoose.Schema.Types.ObjectId,
    name: String
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
  // Cash account
  cashAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount',
    required: true
  },
  // Reference document
  reference: {
    documentType: {
      type: String,
      enum: ['sale_invoice', 'purchase_invoice', 'worker_payment', 'expense_voucher', 'journal_voucher']
    },
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String
  },
  // Description
  description: String,
  // Notes
  notes: String,
  // Status
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'cancelled'],
    default: 'draft'
  },
  // Ledger transaction
  ledgerTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
  // Running balance
  runningBalance: {
    type: Number,
    default: 0
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
cashTransactionSchema.index({ companyId: 1, transactionNumber: 1 }, { unique: true });
cashTransactionSchema.index({ companyId: 1, transactionDate: -1 });
cashTransactionSchema.index({ companyId: 1, type: 1 });
cashTransactionSchema.index({ companyId: 1, category: 1 });
cashTransactionSchema.index({ companyId: 1, status: 1 });

// Pre-save middleware to generate transaction number
cashTransactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionNumber) {
    const prefix = this.type === 'receipt' ? 'CR' : this.type === 'payment' ? 'CP' : 'CT';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.transactionNumber = `${prefix}${timestamp}`;
  }
  next();
});

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
