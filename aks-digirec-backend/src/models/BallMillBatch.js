const mongoose = require('mongoose');

const ballMillBatchSchema = new mongoose.Schema({
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
  // Ball mill reference
  ballMill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BallMill',
    required: true
  },
  // Composition
  composition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Composition',
    required: true
  },
  // Batch date
  batchDate: {
    type: Date,
    default: Date.now
  },
  // Input materials
  inputs: [{
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
    quantity: Number,
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    unitCost: Number,
    totalCost: Number,
    batchNumber: String
  }],
  // Total input
  totalInput: {
    quantity: { type: Number, default: 0 },
    cost: { type: Number, default: 0 }
  },
  // Processing
  processing: {
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    waterAdded: Number, // in liters
    grindingMedia: String,
    operator: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }
  },
  // Output
  output: {
    quantity: { type: Number, default: 0 },
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    processedStock: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessedStock' },
    tankNumber: String
  },
  // Quality test results
  qualityTest: {
    testedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    testedAt: Date,
    density: Number,
    viscosity: Number,
    ph: Number,
    residue: Number,
    moisture: Number,
    status: { type: String, enum: ['pass', 'fail', 'pending'], default: 'pending' },
    remarks: String
  },
  // Cost calculation
  cost: {
    materialCost: { type: Number, default: 0 },
    labourCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 }
  },
  // Loss/Wastage
  wastage: {
    quantity: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    reason: String
  },
  // Status
  status: {
    type: String,
    enum: ['preparing', 'running', 'completed', 'quality_check', 'approved', 'rejected'],
    default: 'preparing'
  },
  // Ledger transaction
  ledgerTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerTransaction'
  },
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
ballMillBatchSchema.index({ companyId: 1, batchNumber: 1 }, { unique: true });
ballMillBatchSchema.index({ companyId: 1, ballMill: 1 });
ballMillBatchSchema.index({ companyId: 1, composition: 1 });
ballMillBatchSchema.index({ companyId: 1, status: 1 });
ballMillBatchSchema.index({ companyId: 1, batchDate: -1 });

// Pre-save middleware to calculate totals
ballMillBatchSchema.pre('save', function(next) {
  // Calculate total input
  this.totalInput.quantity = this.inputs.reduce((sum, i) => sum + i.quantity, 0);
  this.totalInput.cost = this.inputs.reduce((sum, i) => sum + (i.totalCost || 0), 0);
  
  // Calculate cost
  this.cost.materialCost = this.totalInput.cost;
  this.cost.totalCost = this.cost.materialCost + this.cost.labourCost + this.cost.overheadCost;
  this.cost.costPerUnit = this.output.quantity > 0 ? this.cost.totalCost / this.output.quantity : 0;
  
  // Calculate wastage percentage
  if (this.totalInput.quantity > 0 && this.output.quantity > 0) {
    this.wastage.quantity = this.totalInput.quantity - this.output.quantity;
    this.wastage.percentage = (this.wastage.quantity / this.totalInput.quantity) * 100;
  }
  
  // Generate batch number if new
  if (this.isNew && !this.batchNumber) {
    const prefix = 'BMB';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.batchNumber = `${prefix}${timestamp}`;
  }
  
  next();
});

module.exports = mongoose.model('BallMillBatch', ballMillBatchSchema);
