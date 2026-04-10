const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Supplier code is required'],
    trim: true,
    uppercase: true
  },
  // Business info
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  legalName: String,
  // Contact person
  contactPerson: {
    name: String,
    designation: String,
    phone: String,
    email: String
  },
  // Contact details
  phone: String,
  mobile: String,
  email: String,
  website: String,
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'Pakistan' }
  },
  // Tax info
  taxInfo: {
    ntNumber: String, // National Tax Number
    gstNumber: String,
    cnic: String
  },
  // Supplier type
  type: {
    type: String,
    enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'importer', 'other'],
    default: 'distributor'
  },
  // Categories they supply
  supplyCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialType'
  }],
  // Materials they supply
  materials: [{
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
    supplierCode: String,
    lastPrice: Number,
    leadTime: Number, // in days
    minOrderQty: Number
  }],
  // Credit terms
  creditTerms: {
    limit: { type: Number, default: 0 },
    days: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' }
  },
  // Current balance
  currentBalance: {
    amount: { type: Number, default: 0 }, // positive = we owe them, negative = they owe us
    lastUpdated: { type: Date, default: Date.now }
  },
  // Rating
  rating: {
    score: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    delivery: { type: Number, min: 1, max: 5 },
    price: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 }
  },
  // Bank details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountTitle: String,
    branchName: String,
    branchCode: String,
    iban: String
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted', 'on_hold'],
    default: 'active'
  },
  // Ledger account
  ledgerAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount'
  },
  // Documents
  documents: [{
    type: String,
    name: String,
    url: String
  }],
  // Notes
  notes: String,
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
  timestamps: true
});

// Indexes
supplierSchema.index({ companyId: 1, code: 1 }, { unique: true });
supplierSchema.index({ companyId: 1, status: 1 });
supplierSchema.index({ companyId: 1, type: 1 });
supplierSchema.index({ businessName: 'text', legalName: 'text', code: 'text' });

// Virtual for credit utilization
supplierSchema.virtual('creditUtilization').get(function() {
  if (this.creditTerms.limit === 0) return 0;
  return (this.currentBalance.amount / this.creditTerms.limit) * 100;
});

// Virtual for credit available
supplierSchema.virtual('creditAvailable').get(function() {
  return Math.max(0, this.creditTerms.limit - this.currentBalance.amount);
});

// Pre-save middleware to auto-generate code
supplierSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const count = await mongoose.model('Supplier').countDocuments({ companyId: this.companyId });
    this.code = `SUP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
