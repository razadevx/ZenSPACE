const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  customerType: {
    type: String,
    required: true,
    enum: ['Retail', 'Wholesale', 'Corporate', 'Export', 'Other']
  },
  contactPerson: String,
  cellNumber: String,
  email: String,
  address: String,
  city: String,
  creditLimit: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  paymentTerms: {
    type: String,
    enum: ['Cash', '7 days', '15 days', '30 days', 'Custom Days'],
    default: 'Cash'
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
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

// Check if credit limit is exceeded
customerSchema.methods.isCreditLimitExceeded = function(additionalAmount = 0) {
  return (this.currentBalance + additionalAmount) > this.creditLimit;
};

// Get remaining credit
customerSchema.methods.getRemainingCredit = function() {
  return Math.max(0, this.creditLimit - this.currentBalance);
};

customerSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
