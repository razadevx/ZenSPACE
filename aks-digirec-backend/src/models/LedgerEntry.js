const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction',
    required: true,
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount',
    required: true,
    index: true
  },
  // Entry type
  entryType: {
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },
  // Amount
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  // Currency
  currency: {
    type: String,
    default: 'PKR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  amountInBase: {
    type: Number,
    required: true
  },
  // Description
  description: {
    en: String,
    ur: String
  },
  // Running balance after this entry
  runningBalance: {
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },
  // Cost center
  costCenter: String,
  // Reference information
  reference: {
    type: String,
    documentType: String,
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String
  },
  // For reconciliation
  isReconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: Date,
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Fiscal year
  fiscalYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FiscalYear'
  },
  // Entry date (same as transaction date)
  entryDate: {
    type: Date,
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
ledgerEntrySchema.index({ companyId: 1, accountId: 1, entryDate: -1 });
ledgerEntrySchema.index({ companyId: 1, transactionId: 1 });
ledgerEntrySchema.index({ companyId: 1, entryDate: -1 });
ledgerEntrySchema.index({ companyId: 1, 'reference.documentType': 1, 'reference.documentId': 1 });

// Virtual for formatted amount
ledgerEntrySchema.virtual('formattedAmount').get(function() {
  return this.entryType === 'debit' ? this.amount : -this.amount;
});

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
