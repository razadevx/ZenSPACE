const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
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
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY'
  },
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '12h'
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  numberFormat: {
    decimalSeparator: { type: String, default: '.' },
    thousandSeparator: { type: String, default: ',' },
    decimalPlaces: { type: Number, default: 2 }
  },
  notifications: {
    email: {
      enabled: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: true },
      alerts: { type: Boolean, default: true }
    },
    push: {
      enabled: { type: Boolean, default: true },
      newSales: { type: Boolean, default: true },
      lowStock: { type: Boolean, default: true },
      payments: { type: Boolean, default: true }
    },
    sms: {
      enabled: { type: Boolean, default: false },
      criticalAlerts: { type: Boolean, default: false }
    }
  },
  dashboard: {
    layout: {
      type: String,
      enum: ['grid', 'list'],
      default: 'grid'
    },
    widgets: [{
      id: String,
      type: String,
      position: {
        x: Number,
        y: Number,
        w: Number,
        h: Number
      },
      config: mongoose.Schema.Types.Mixed
    }],
    defaultView: {
      type: String,
      enum: ['overview', 'sales', 'inventory', 'production', 'accounting'],
      default: 'overview'
    }
  },
  shortcuts: [{
    key: String,
    action: String,
    description: String
  }],
  recentItems: [{
    type: {
      type: String,
      enum: ['customer', 'supplier', 'product', 'invoice', 'payment']
    },
    id: mongoose.Schema.Types.ObjectId,
    accessedAt: { type: Date, default: Date.now }
  }],
  filters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  columns: {
    type: Map,
    of: [String]
  }
}, {
  timestamps: true
});

// Indexes
userPreferencesSchema.index({ userId: 1 });
userPreferencesSchema.index({ companyId: 1 });

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
