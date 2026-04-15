const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Transaction number (auto-generated in pre-save)
  transactionNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  // Transaction date
  transactionDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Transaction type (unified enum for all transaction types)
  type: {
    type: String,
    required: true,
    enum: ['SALE', 'PURCHASE', 'SALES_RETURN', 'PURCHASE_RETURN', 'EXPENSE', 'INCOME', 'RECEIPT', 'PAYMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'],
    index: true
  },
  // Transaction direction (calculated based on type)
  direction: {
    type: String,
    enum: ['in', 'out'],
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
  // Party information
  partyType: {
    type: String,
    enum: ['customer', 'supplier', 'worker', 'other', null],
    index: true
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'partyModel',
    index: true
  },
  partyModel: {
    type: String,
    enum: ['Customer', 'Supplier', 'Worker', null]
  },
  partyName: {
    type: String
  },
  // Legacy party object (for backward compatibility)
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
    ref: 'LedgerAccount'
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
  // Payment mode
  paymentMode: {
    type: String,
    enum: ['CASH', 'BANK', 'ONLINE', 'CREDIT'],
    default: 'CASH'
  },
  // Document number (auto-generated)
  documentNo: {
    type: String,
    index: true
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
cashTransactionSchema.index({ companyId: 1, documentNo: 1 }, { unique: true, sparse: true });
cashTransactionSchema.index({ companyId: 1, transactionNumber: 1 }, { unique: true, sparse: true });
cashTransactionSchema.index({ companyId: 1, transactionDate: -1 });
cashTransactionSchema.index({ companyId: 1, type: 1 });
cashTransactionSchema.index({ companyId: 1, partyType: 1 });
cashTransactionSchema.index({ companyId: 1, status: 1 });

// Pre-save middleware to generate document number, set direction, and configure party model
cashTransactionSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate document number if not provided
    if (!this.documentNo) {
      const prefix = this.type;
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      this.documentNo = `${prefix}-${timestamp}${random}`;
    }

    // Generate legacy transactionNumber if not provided
    if (!this.transactionNumber) {
      const prefix = this.type === 'RECEIPT' ? 'CR' : this.type === 'PAYMENT' ? 'CP' : 'CT';
      const timestamp = Date.now().toString(36).toUpperCase();
      this.transactionNumber = `${prefix}${timestamp}`;
    }

    // Set direction based on transaction type
    const cashInTypes = ['SALE', 'PURCHASE_RETURN', 'RECEIPT', 'INCOME', 'TRANSFER_IN'];
    const cashOutTypes = ['PURCHASE', 'SALES_RETURN', 'EXPENSE', 'PAYMENT', 'TRANSFER_OUT'];

    if (cashInTypes.includes(this.type)) {
      this.direction = 'in';
    } else if (cashOutTypes.includes(this.type)) {
      this.direction = 'out';
    }

    // Set partyModel based on partyType for proper refPath resolution
    if (this.partyId && this.partyType) {
      const modelMap = {
        'customer': 'Customer',
        'supplier': 'Supplier',
        'worker': 'Worker'
      };
      this.partyModel = modelMap[this.partyType] || null;
    } else {
      this.partyModel = null;
      this.partyId = null; // Ensure partyId is null if not valid
    }
  }
  next();
});

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
