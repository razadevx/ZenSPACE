const mongoose = require('mongoose');

const workerPaymentSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Payment number
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Worker reference
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
    index: true
  },
  // Payment period
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly'], required: true }
  },
  // Payment date
  paymentDate: {
    type: Date,
    required: true
  },
  // Earnings
  earnings: {
    basicWages: { type: Number, default: 0 },
    overtimeWages: { type: Number, default: 0 },
    pieceWages: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    allowance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
  },
  // Deductions
  deductions: {
    advance: { type: Number, default: 0 },
    loan: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 }
  },
  // Net payment
  netPayment: {
    type: Number,
    default: 0
  },
  // Currency
  currency: {
    type: String,
    default: 'PKR'
  },
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque'],
    default: 'cash'
  },
  // Bank/Cheque details
  paymentDetails: {
    bankName: String,
    accountNumber: String,
    chequeNumber: String,
    chequeDate: Date
  },
  // Related activities
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerActivity'
  }],
  // Attendance summary
  attendance: {
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    leave: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 }
  },
  // Production summary
  production: {
    quantityProduced: { type: Number, default: 0 },
    quantityApproved: { type: Number, default: 0 },
    quantityRejected: { type: Number, default: 0 }
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'calculated', 'approved', 'paid', 'cancelled'],
    default: 'draft'
  },
  // Approval
  calculatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  calculatedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paidAt: Date,
  // Ledger transaction reference
  ledgerTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
  // Notes
  notes: String,
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
workerPaymentSchema.index({ companyId: 1, workerId: 1, paymentDate: -1 });
workerPaymentSchema.index({ companyId: 1, paymentDate: -1 });
workerPaymentSchema.index({ companyId: 1, status: 1 });

// Pre-save middleware to calculate totals
workerPaymentSchema.pre('save', function(next) {
  // Calculate total earnings
  this.earnings.totalEarnings = 
    this.earnings.basicWages +
    this.earnings.overtimeWages +
    this.earnings.pieceWages +
    this.earnings.bonus +
    this.earnings.allowance;
  
  // Calculate total deductions
  this.deductions.totalDeductions =
    this.deductions.advance +
    this.deductions.loan +
    this.deductions.tax +
    this.deductions.insurance +
    this.deductions.other;
  
  // Calculate net payment
  this.netPayment = this.earnings.totalEarnings - this.deductions.totalDeductions;
  
  // Generate payment number if new
  if (this.isNew && !this.paymentNumber) {
    const prefix = 'WP';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.paymentNumber = `${prefix}${timestamp}`;
  }
  
  next();
});

module.exports = mongoose.model('WorkerPayment', workerPaymentSchema);
