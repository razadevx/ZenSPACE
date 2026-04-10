const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Customer code is required'],
    trim: true,
    uppercase: true
  },
  // Business/Personal info
  name: {
    type: String,
    required: true,
    trim: true
  },
  businessName: String,
  customerType: {
    type: String,
    enum: ['individual', 'business', 'distributor', 'retailer'],
    default: 'individual'
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
  // Shipping addresses
  shippingAddresses: [{
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String
    },
    isDefault: { type: Boolean, default: false }
  }],
  // Tax info
  taxInfo: {
    ntNumber: String,
    gstNumber: String,
    cnic: String
  },
  // Contact persons (for business customers)
  contactPersons: [{
    name: String,
    designation: String,
    phone: String,
    email: String,
    isPrimary: { type: Boolean, default: false }
  }],
  // Credit terms
  creditTerms: {
    limit: { type: Number, default: 0 },
    days: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' }
  },
  // Current balance
  currentBalance: {
    amount: { type: Number, default: 0 }, // positive = they owe us, negative = we owe them
    lastUpdated: { type: Date, default: Date.now }
  },
  // Sales statistics
  statistics: {
    totalSales: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastOrderDate: Date,
    averageOrderValue: { type: Number, default: 0 },
    totalReturns: { type: Number, default: 0 }
  },
  // Price list
  priceList: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceList'
  },
  // Discount
  discount: {
    percentage: { type: Number, default: 0 },
    fixedAmount: { type: Number, default: 0 }
  },
  // Classification
  category: {
    type: String,
    enum: ['A', 'B', 'C', 'D'], // ABC analysis
    default: 'C'
  },
  // Rating
  rating: {
    score: { type: Number, min: 1, max: 5 },
    payment: { type: Number, min: 1, max: 5 },
    loyalty: { type: Number, min: 1, max: 5 }
  },
  // Territory/Region
  territory: String,
  salesRep: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked', 'prospect'],
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
customerSchema.index({ companyId: 1, code: 1 }, { unique: true });
customerSchema.index({ companyId: 1, status: 1 });
customerSchema.index({ companyId: 1, customerType: 1 });
customerSchema.index({ companyId: 1, category: 1 });
customerSchema.index({ name: 'text', businessName: 'text', code: 'text', mobile: 'text' });

// Virtual for credit utilization
customerSchema.virtual('creditUtilization').get(function() {
  if (this.creditTerms.limit === 0) return 0;
  return (this.currentBalance.amount / this.creditTerms.limit) * 100;
});

// Virtual for credit available
customerSchema.virtual('creditAvailable').get(function() {
  return Math.max(0, this.creditTerms.limit - this.currentBalance.amount);
});

// Virtual for days since last order
customerSchema.virtual('daysSinceLastOrder').get(function() {
  if (!this.statistics.lastOrderDate) return null;
  const diff = Date.now() - this.statistics.lastOrderDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to auto-generate code
customerSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const count = await mongoose.model('Customer').countDocuments({ companyId: this.companyId });
    this.code = `CUST${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to update statistics
customerSchema.methods.updateStatistics = async function(orderAmount) {
  this.statistics.totalSales += orderAmount;
  this.statistics.totalOrders += 1;
  this.statistics.lastOrderDate = new Date();
  this.statistics.averageOrderValue = this.statistics.totalSales / this.statistics.totalOrders;
  await this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
