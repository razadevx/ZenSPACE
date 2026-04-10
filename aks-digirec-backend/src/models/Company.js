const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  businessName: {
    type: String,
    trim: true
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  taxNumber: {
    type: String,
    trim: true
  },
  contactInfo: {
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    mobile: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'Pakistan' }
  },
  logo: {
    type: String
  },
  fiscalYear: {
    startMonth: { type: Number, default: 7, min: 1, max: 12 },
    startDay: { type: Number, default: 1, min: 1, max: 31 }
  },
  baseCurrency: {
    type: String,
    default: 'PKR'
  },
  settings: {
    autoCodeGeneration: { type: Boolean, default: true },
    stockMethod: {
      type: String,
      enum: ['FIFO', 'LIFO', 'AVERAGE'],
      default: 'AVERAGE'
    },
    decimalPlaces: { type: Number, default: 2 },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: '12h' }
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'suspended', 'cancelled'],
    default: 'trial'
  },
  trialStartsAt: {
    type: Date,
    default: Date.now
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
  },
  subscription: {
    plan: {
      type: String,
      enum: ['trial', 'basic', 'standard', 'premium', 'enterprise'],
      default: 'trial'
    },
    startedAt: Date,
    expiresAt: Date,
    maxUsers: { type: Number, default: 5 },
    maxStorage: { type: Number, default: 10 } // in GB
  },
  features: {
    multiCurrency: { type: Boolean, default: false },
    multiLocation: { type: Boolean, default: false },
    advancedReports: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    customIntegrations: { type: Boolean, default: false }
  },
  theme: {
    type: String,
    enum: ['default', 'light', 'dark', 'green'],
    default: 'default'
  },
  language: {
    type: String,
    enum: ['en', 'ur'],
    default: 'en'
  },
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
companySchema.index({ name: 'text', code: 'text' });
companySchema.index({ status: 1 });
companySchema.index({ 'subscription.expiresAt': 1 });

// Virtual for trial days remaining
companySchema.virtual('trialDaysRemaining').get(function() {
  if (this.status !== 'trial') return 0;
  const diff = new Date(this.trialEndsAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for users count
companySchema.virtual('usersCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'company',
  count: true
});

// Pre-save middleware to generate company code
companySchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const count = await mongoose.model('Company').countDocuments();
    this.code = `COMP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Static method to check if company is active
companySchema.statics.isActive = async function(companyId) {
  const company = await this.findById(companyId);
  if (!company) return false;
  if (!company.isActive) return false;
  if (company.status === 'suspended' || company.status === 'cancelled') return false;
  if (company.status === 'trial' && new Date(company.trialEndsAt) < new Date()) return false;
  return true;
};

module.exports = mongoose.model('Company', companySchema);
