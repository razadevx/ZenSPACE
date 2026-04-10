const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  // Bank details
  bankName: {
    type: String,
    required: true
  },
  branchName: String,
  branchCode: String,
  // Account details
  accountNumber: {
    type: String,
    required: true
  },
  accountTitle: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['current', 'savings', 'fixed_deposit', 'overdraft', 'loan'],
    default: 'current'
  },
  // IBAN/SWIFT
  iban: String,
  swiftCode: String,
  // Currency
  currency: {
    type: String,
    default: 'PKR'
  },
  // Opening balance
  openingBalance: {
    amount: { type: Number, default: 0 },
    date: Date
  },
  // Current balance
  currentBalance: {
    amount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  // Limits
  limits: {
    overdraft: { type: Number, default: 0 },
    minimumBalance: { type: Number, default: 0 }
  },
  // Contact
  contact: {
    phone: String,
    email: String,
    relationshipManager: String
  },
  // Ledger account
  ledgerAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount'
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
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
bankAccountSchema.index({ companyId: 1, code: 1 }, { unique: true });
bankAccountSchema.index({ companyId: 1, isActive: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
