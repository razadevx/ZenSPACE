const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Worker code is required'],
    trim: true,
    uppercase: true
  },
  // Personal info
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  fatherName: String,
  cnic: {
    type: String,
    trim: true
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  // Contact
  phone: String,
  mobile: String,
  email: String,
  address: {
    street: String,
    city: String,
    district: String,
    postalCode: String
  },
  // Employment
  designation: {
    type: String,
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  workerType: {
    type: String,
    enum: ['permanent', 'contract', 'daily_wage', 'piece_rate'],
    default: 'permanent'
  },
  joinDate: {
    type: Date,
    required: true
  },
  leaveDate: Date,
  // Wages
  wages: {
    type: { type: String, enum: ['monthly', 'daily', 'hourly', 'piece_rate'] },
    amount: Number, // base wage
    overtimeRate: Number,
    currency: { type: String, default: 'PKR' }
  },
  // Skills
  skills: [{
    name: String,
    level: { type: String, enum: ['beginner', 'intermediate', 'expert'] }
  }],
  // Production stages worker can perform
  qualifiedStages: [{
    stage: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    efficiency: { type: Number, default: 100 } // percentage
  }],
  // Attendance
  attendance: {
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    leave: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 }
  },
  // Current status
  status: {
    type: String,
    enum: ['active', 'on_leave', 'suspended', 'terminated', 'resigned'],
    default: 'active'
  },
  // Documents
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadedAt: Date
  }],
  // Emergency contact
  emergencyContact: {
    name: String,
    relation: String,
    phone: String
  },
  // Bank details for salary
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountTitle: String,
    iban: String
  },
  // Ledger account for worker payments
  ledgerAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount'
  },
  // Current balance (advance/due)
  currentBalance: {
    type: Number,
    default: 0 // positive = company owes worker, negative = worker owes company
  },
  // Images
  photo: String,
  isActive: {
    type: Boolean,
    default: true
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
workerSchema.index({ companyId: 1, code: 1 }, { unique: true });
workerSchema.index({ companyId: 1, department: 1 });
workerSchema.index({ companyId: 1, status: 1 });
workerSchema.index({ companyId: 1, workerType: 1 });
workerSchema.index({ firstName: 'text', lastName: 'text', code: 'text', cnic: 'text' });

// Virtual for full name
workerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
workerSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

// Virtual for tenure
workerSchema.virtual('tenure').get(function() {
  const endDate = this.leaveDate || new Date();
  const diff = endDate - this.joinDate;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return {
    days,
    years: Math.floor(days / 365),
    months: Math.floor((days % 365) / 30)
  };
});

// Pre-save middleware to auto-generate code
workerSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const count = await mongoose.model('Worker').countDocuments({ companyId: this.companyId });
    this.code = `W${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Worker', workerSchema);
