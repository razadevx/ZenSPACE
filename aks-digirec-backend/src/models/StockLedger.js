const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Item reference (polymorphic)
  itemType: {
    type: String,
    required: true,
    enum: ['raw_material', 'finished_good', 'processed_stock', 'wip']
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  // Variant (for finished goods with colors/sizes)
  variantId: String,
  variantDetails: {
    color: String,
    size: String,
    pattern: String
  },
  // Movement type
  movementType: {
    type: String,
    required: true,
    enum: [
      'opening_balance',
      'purchase', 'purchase_return',
      'sale', 'sale_return',
      'production_in', 'production_out',
      'transfer_in', 'transfer_out',
      'adjustment', 'damage', 'expiry',
      'consumption', 'ball_mill_in', 'ball_mill_out'
    ]
  },
  // Quantity
  quantity: {
    type: Number,
    required: true
  },
  // Unit
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  // Cost/Value
  unitCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  // Running balance
  runningBalance: {
    quantity: Number,
    value: Number
  },
  // Reference document
  reference: {
    documentType: {
      type: String,
      enum: ['purchase_invoice', 'sale_invoice', 'production_batch', 'production_order', 'stock_adjustment', 
             'transfer_note', 'ball_mill_batch', 'opening_balance']
    },
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String
  },
  // Location/Warehouse
  location: {
    warehouse: String,
    section: String,
    bin: String
  },
  // Batch/Lot information
  batchInfo: {
    batchNumber: String,
    manufacturingDate: Date,
    expiryDate: Date
  },
  // Movement date
  movementDate: {
    type: Date,
    required: true,
    index: true
  },
  // Notes
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
stockLedgerSchema.index({ companyId: 1, itemType: 1, itemId: 1, movementDate: -1 });
stockLedgerSchema.index({ companyId: 1, movementType: 1, movementDate: -1 });
stockLedgerSchema.index({ companyId: 1, 'reference.documentType': 1, 'reference.documentId': 1 });
stockLedgerSchema.index({ companyId: 1, movementDate: -1 });

// Pre-save middleware to calculate total cost
stockLedgerSchema.pre('save', function(next) {
  this.totalCost = this.quantity * this.unitCost;
  next();
});

// Static method to get current stock
stockLedgerSchema.statics.getCurrentStock = async function(companyId, itemType, itemId, variantId = null) {
  const match = { companyId, itemType, itemId };
  if (variantId) match.variantId = variantId;
  
  const result = await this.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      quantity: { $sum: '$quantity' },
      value: { $sum: '$totalCost' }
    }}
  ]);
  
  return result[0] || { quantity: 0, value: 0 };
};

// Static method to get stock movements in date range
stockLedgerSchema.statics.getMovements = async function(companyId, filters = {}, dateRange = {}) {
  const match = { companyId };
  
  if (filters.itemType) match.itemType = filters.itemType;
  if (filters.itemId) match.itemId = new mongoose.Types.ObjectId(filters.itemId);
  if (filters.movementType) match.movementType = filters.movementType;
  
  if (dateRange.from || dateRange.to) {
    match.movementDate = {};
    if (dateRange.from) match.movementDate.$gte = new Date(dateRange.from);
    if (dateRange.to) match.movementDate.$lte = new Date(dateRange.to);
  }
  
  return this.find(match)
    .populate('itemId', 'name code')
    .populate('unit', 'symbol')
    .sort({ movementDate: -1 });
};

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
