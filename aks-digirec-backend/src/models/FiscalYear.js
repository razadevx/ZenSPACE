const mongoose = require('mongoose');

const fiscalYearSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'locked'],
    default: 'open'
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  // Opening balances carried forward
  openingBalances: [{
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerAccount'
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 }
  }],
  // Closing balances
  closingBalances: [{
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerAccount'
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 }
  }],
  // Closing entry reference
  closingEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: Date
}, {
  timestamps: true
});

// Compound index
fiscalYearSchema.index({ companyId: 1, code: 1 }, { unique: true });
fiscalYearSchema.index({ companyId: 1, isCurrent: 1 });
fiscalYearSchema.index({ companyId: 1, startDate: -1 });

// Pre-save validation
fiscalYearSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Static method to get current fiscal year
fiscalYearSchema.statics.getCurrent = async function(companyId) {
  return this.findOne({ companyId, isCurrent: true, status: 'open' });
};

// Static method to create fiscal year from dates
fiscalYearSchema.statics.createFromDates = async function(companyId, startDate, endDate, createdBy) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const name = `FY ${start.getFullYear()}-${end.getFullYear()}`;
  const code = `FY${start.getFullYear()}${end.getFullYear()}`;
  
  return this.create({
    companyId,
    name,
    code,
    startDate: start,
    endDate: end,
    createdBy
  });
};

module.exports = mongoose.model('FiscalYear', fiscalYearSchema);
