const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Company code is required'],
    unique: true,
    uppercase: true
  },
  logo: String,
  address: String,
  city: String,
  country: {
    type: String,
    default: 'Pakistan'
  },
  phone: String,
  email: String,
  website: String,
  status: {
    type: String,
    enum: ['trial', 'active', 'suspended', 'expired'],
    default: 'trial'
  },
  trialStartDate: {
    type: Date,
    default: Date.now
  },
  trialEndDate: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      return date;
    }
  },
  settings: {
    fiscalYearStart: {
      type: Number,
      default: 1
    },
    defaultCurrency: {
      type: String,
      default: 'PKR'
    },
    autoCodePrefix: {
      sections: { type: String, default: 'SEC' },
      rawMaterials: { type: String, default: 'MAT' },
      suppliers: { type: String, default: 'SUP' },
      workers: { type: String, default: 'WRK' },
      customers: { type: String, default: 'CUST' },
      finishedGoods: { type: String, default: 'FG' },
      production: { type: String, default: 'PROD' },
      invoices: { type: String, default: 'INV' }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Check if trial is expired
companySchema.methods.isTrialExpired = function() {
  if (this.status === 'trial' && this.trialEndDate) {
    return new Date() > this.trialEndDate;
  }
  return false;
};

module.exports = mongoose.model('Company', companySchema);
