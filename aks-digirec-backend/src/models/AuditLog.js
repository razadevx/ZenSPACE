const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true,
    enum: [
      // Auth actions
      'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      // User actions
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE',
      // Company actions
      'COMPANY_CREATE', 'COMPANY_UPDATE', 'COMPANY_DELETE',
      // Master data actions
      'MASTER_CREATE', 'MASTER_UPDATE', 'MASTER_DELETE',
      // Accounting actions
      'LEDGER_CREATE', 'LEDGER_UPDATE', 'TRANSACTION_CREATE', 'TRANSACTION_POST',
      // Inventory actions
      'STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUST', 'STOCK_TRANSFER',
      // Worker actions
      'WORKER_ACTIVITY', 'WORKER_PAYMENT',
      // Production actions
      'PRODUCTION_START', 'PRODUCTION_STAGE', 'PRODUCTION_COMPLETE', 'PRODUCTION_LOSS',
      // Cash/Bank actions
      'SALE_CREATE', 'SALE_UPDATE', 'PURCHASE_CREATE', 'PURCHASE_UPDATE',
      'PAYMENT_CREATE', 'RECEIPT_CREATE', 'EXPENSE_CREATE',
      'BANK_DEPOSIT', 'BANK_WITHDRAWAL', 'CHEQUE_CREATE', 'CHEQUE_CLEAR',
      // Report actions
      'REPORT_GENERATE', 'REPORT_EXPORT',
      // Settings actions
      'SETTINGS_UPDATE', 'DICTIONARY_UPDATE', 'THEME_CHANGE'
    ]
  },
  entityType: {
    type: String,
    required: true,
    index: true,
    enum: [
      'User', 'Company', 'Role', 'Section', 'RawMaterial', 'Worker',
      'Supplier', 'Customer', 'FinishedGood', 'LedgerAccount', 'LedgerTransaction',
      'StockLedger', 'WorkerActivity', 'BallMill', 'Composition', 'ProductionBatch',
      'SaleInvoice', 'PurchaseInvoice', 'CashTransaction', 'BankAccount',
      'Payment', 'Report', 'Dictionary', 'Setting'
    ]
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, entityType: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

// TTL index to auto-delete logs after 2 years
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = async function(companyId, limit = 50) {
  return this.find({ companyId })
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get activity by user
auditLogSchema.statics.getUserActivity = async function(userId, options = {}) {
  const query = { userId };
  
  if (options.startDate && options.endDate) {
    query.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

// Static method to get entity history
auditLogSchema.statics.getEntityHistory = async function(entityType, entityId) {
  return this.find({ entityType, entityId })
    .populate('userId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
