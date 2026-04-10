const mongoose = require('mongoose');

const productionBatchSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Batch number
  batchNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Finished good being produced
  finishedGood: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinishedGood',
    required: true
  },
  // Variant
  variant: {
    color: String,
    size: String,
    pattern: String
  },
  // Production date
  productionDate: {
    type: Date,
    default: Date.now
  },
  // Target quantity
  targetQuantity: {
    type: Number,
    required: true
  },
  // Actual output
  actualOutput: {
    quantity: { type: Number, default: 0 },
    approved: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 }
  },
  // Stages
  stages: [{
    stageNumber: Number,
    stage: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    name: String,
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'skipped'], default: 'pending' },
    startTime: Date,
    endTime: Date,
    inputQuantity: Number,
    outputQuantity: Number,
    rejectedQuantity: Number,
    workers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }],
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    notes: String
  }],
  // Current stage
  currentStage: {
    type: Number,
    default: 0
  },
  // Materials consumed
  materialsConsumed: [{
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
    quantity: Number,
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    unitCost: Number,
    totalCost: Number,
    processedStock: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessedStock' },
    quantityUsed: Number
  }],
  // Cost breakdown
  cost: {
    materialCost: { type: Number, default: 0 },
    labourCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    costPerPiece: { type: Number, default: 0 }
  },
  // Loss tracking
  loss: {
    totalLoss: { type: Number, default: 0 },
    lossPercentage: { type: Number, default: 0 },
    reasons: [{
      stage: String,
      reason: String,
      quantity: Number
    }]
  },
  // Quality
  quality: {
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: Date,
    grade: { type: String, enum: ['A', 'B', 'C', 'Reject'] },
    remarks: String
  },
  // Status
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'planned'
  },
  // Timestamps
  startedAt: Date,
  completedAt: Date,
  // Expected completion
  expectedCompletion: Date,
  // Ledger transaction
  ledgerTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
  // Stock ledger entries
  stockLedgerEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StockLedger'
  }],
  // Notes
  notes: String,
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
productionBatchSchema.index({ companyId: 1, batchNumber: 1 }, { unique: true });
productionBatchSchema.index({ companyId: 1, finishedGood: 1 });
productionBatchSchema.index({ companyId: 1, status: 1 });
productionBatchSchema.index({ companyId: 1, productionDate: -1 });

// Pre-save middleware to calculate totals
productionBatchSchema.pre('save', function(next) {
  // Calculate actual output
  this.actualOutput.quantity = this.stages.reduce((sum, s) => sum + (s.outputQuantity || 0), 0) || this.actualOutput.quantity;
  
  // Calculate cost
  this.cost.materialCost = this.materialsConsumed.reduce((sum, m) => sum + (m.totalCost || 0), 0);
  this.cost.totalCost = this.cost.materialCost + this.cost.labourCost + this.cost.overheadCost;
  this.cost.costPerPiece = this.actualOutput.approved > 0 ? this.cost.totalCost / this.actualOutput.approved : 0;
  
  // Calculate loss
  const totalInput = this.stages[0]?.inputQuantity || this.targetQuantity;
  this.loss.totalLoss = totalInput - this.actualOutput.approved;
  this.loss.lossPercentage = totalInput > 0 ? (this.loss.totalLoss / totalInput) * 100 : 0;
  
  // Generate batch number if new
  if (this.isNew && !this.batchNumber) {
    const prefix = 'PRD';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.batchNumber = `${prefix}${timestamp}`;
  }
  
  next();
});

module.exports = mongoose.model('ProductionBatch', productionBatchSchema);
