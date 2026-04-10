const mongoose = require('mongoose');

const processedStockSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    en: { type: String, required: true },
    ur: { type: String }
  },
  description: {
    en: String,
    ur: String
  },
  // Type of processed stock
  type: {
    type: String,
    required: true,
    enum: ['ball_mill_slip', 'glaze', 'body', 'slip', 'engobe', 'other'],
    index: true
  },
  // Source composition
  composition: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Composition'
  },
  // Unit
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  // Current stock
  currentStock: {
    quantity: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  // Costing
  costing: {
    averageCost: { type: Number, default: 0 },
    lastBatchCost: { type: Number, default: 0 }
  },
  // Specifications
  specifications: {
    density: Number,
    viscosity: Number,
    ph: Number,
    moisture: Number,
    particleSize: String
  },
  // Quality parameters
  qualityParams: {
    minDensity: Number,
    maxDensity: Number,
    minViscosity: Number,
    maxViscosity: Number,
    minPh: Number,
    maxPh: Number
  },
  // Storage
  storage: {
    tankNumber: String,
    capacity: Number,
    location: String
  },
  // Batch tracking
  batches: [{
    batchNumber: String,
    ballMillBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'BallMillBatch' },
    quantity: Number,
    cost: Number,
    producedDate: Date,
    expiryDate: Date,
    status: { type: String, enum: ['active', 'depleted', 'expired'], default: 'active' }
  }],
  // Usage in production
  usage: {
    totalConsumed: { type: Number, default: 0 },
    totalProduced: { type: Number, default: 0 },
    lastUsed: Date
  },
  // Status
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
processedStockSchema.index({ companyId: 1, code: 1 }, { unique: true });
processedStockSchema.index({ companyId: 1, type: 1 });
processedStockSchema.index({ companyId: 1, composition: 1 });

// Virtual for unit cost
processedStockSchema.virtual('unitCost').get(function() {
  return this.currentStock.quantity > 0 
    ? this.currentStock.value / this.currentStock.quantity 
    : this.costing.averageCost || 0;
});

// Method to add batch
processedStockSchema.methods.addBatch = async function(batchData) {
  this.batches.push(batchData);
  
  // Update current stock
  this.currentStock.quantity += batchData.quantity;
  this.currentStock.value += batchData.cost;
  this.currentStock.lastUpdated = new Date();
  
  // Update costing
  this.costing.lastBatchCost = batchData.cost / batchData.quantity;
  this.costing.averageCost = this.currentStock.quantity > 0 
    ? this.currentStock.value / this.currentStock.quantity 
    : this.costing.lastBatchCost;
  
  // Update usage
  this.usage.totalProduced += batchData.quantity;
  
  await this.save();
};

// Method to consume stock
processedStockSchema.methods.consume = async function(quantity) {
  if (this.currentStock.quantity < quantity) {
    throw new Error('Insufficient stock');
  }
  
  // Calculate cost using FIFO
  let remainingQty = quantity;
  let totalCost = 0;
  
  for (const batch of this.batches.sort((a, b) => a.producedDate - b.producedDate)) {
    if (batch.status !== 'active' || batch.quantity <= 0) continue;
    
    const consumeQty = Math.min(remainingQty, batch.quantity);
    const batchUnitCost = batch.cost / batch.quantity;
    
    batch.quantity -= consumeQty;
    totalCost += consumeQty * batchUnitCost;
    remainingQty -= consumeQty;
    
    if (batch.quantity <= 0) {
      batch.status = 'depleted';
    }
    
    if (remainingQty <= 0) break;
  }
  
  // Update current stock
  this.currentStock.quantity -= quantity;
  this.currentStock.value -= totalCost;
  this.currentStock.lastUpdated = new Date();
  
  // Update usage
  this.usage.totalConsumed += quantity;
  this.usage.lastUsed = new Date();
  
  await this.save();
  
  return { quantity, cost: totalCost, unitCost: totalCost / quantity };
};

module.exports = mongoose.model('ProcessedStock', processedStockSchema);
