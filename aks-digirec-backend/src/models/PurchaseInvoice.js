const mongoose = require('mongoose');

const purchaseInvoiceSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Invoice number
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Supplier invoice number
  supplierInvoiceNumber: String,
  // Invoice date
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Due date
  dueDate: Date,
  // Supplier
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  // Reference (PO number, etc.)
  reference: String,
  // Items
  items: [{
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    description: String,
    quantity: { type: Number, required: true },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    unitPrice: { type: Number, required: true },
    discount: {
      percentage: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    tax: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    },
    total: { type: Number, default: 0 },
    batchNumber: String,
    expiryDate: Date
  }],
  // Summary
  summary: {
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
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
  // Payment
  payment: {
    method: { type: String, enum: ['cash', 'credit', 'cheque', 'bank_transfer'], default: 'credit' },
    status: { type: String, enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'], default: 'pending' },
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    lastPaymentDate: Date
  },
  // Payments made
  paymentsMade: [{
    date: Date,
    amount: Number,
    method: String,
    reference: String,
    notes: String
  }],
  // Delivery
  delivery: {
    expectedDate: Date,
    receivedDate: Date,
    status: { type: String, enum: ['pending', 'partial', 'received'], default: 'pending' }
  },
  // Terms
  terms: String,
  notes: String,
  // Status
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'partially_received', 'received', 'paid', 'cancelled', 'returned'],
    default: 'draft'
  },
  // Ledger transaction
  ledgerTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
  // Stock ledger entries
  stockLedgerEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockLedger'
  }],
  // Return info
  returnInfo: {
    isReturned: { type: Boolean, default: false },
    returnDate: Date,
    returnAmount: { type: Number, default: 0 },
    reason: String
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
purchaseInvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
purchaseInvoiceSchema.index({ companyId: 1, supplier: 1 });
purchaseInvoiceSchema.index({ companyId: 1, invoiceDate: -1 });
purchaseInvoiceSchema.index({ companyId: 1, status: 1 });
purchaseInvoiceSchema.index({ companyId: 1, 'payment.status': 1 });

// Pre-save middleware to calculate totals
purchaseInvoiceSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    const discountAmount = item.discount.amount || (itemTotal * item.discount.percentage / 100);
    const taxAmount = item.tax.amount || ((itemTotal - discountAmount) * item.tax.rate / 100);
    item.total = itemTotal - discountAmount + taxAmount;
  });
  
  // Calculate summary
  this.summary.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  this.summary.totalDiscount = this.items.reduce((sum, item) => sum + (item.discount.amount || 0), 0);
  this.summary.totalTax = this.items.reduce((sum, item) => sum + item.tax.amount, 0);
  this.summary.grandTotal = this.items.reduce((sum, item) => sum + item.total, 0) + 
    this.summary.shipping + this.summary.otherCharges;
  
  // Update payment balance
  this.payment.balanceDue = this.summary.grandTotal - this.payment.paidAmount;
  
  // Update payment status
  if (this.payment.paidAmount >= this.summary.grandTotal) {
    this.payment.status = 'paid';
  } else if (this.payment.paidAmount > 0) {
    this.payment.status = 'partial';
  }
  
  // Check overdue
  if (this.dueDate && this.payment.status !== 'paid' && new Date() > this.dueDate) {
    this.payment.status = 'overdue';
  }
  
  // Generate invoice number if new
  if (this.isNew && !this.invoiceNumber) {
    const prefix = 'PINV';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.invoiceNumber = `${prefix}${timestamp}`;
  }
  
  next();
});

module.exports = mongoose.model('PurchaseInvoice', purchaseInvoiceSchema);
