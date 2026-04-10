const mongoose = require('mongoose');

const compositionSchema = new mongoose.Schema({
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
  // Composition type
  type: {
    type: String,
    required: true,
    enum: ['body', 'glaze', 'engobe', 'slip', 'other'],
    index: true
  },
  // For which finished good (optional)
  finishedGood: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FinishedGood'
  },
  // Composition items (raw materials)
  items: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit',
      required: true
    },
    percentage: {
      type: Number,
      default: 0
    },
    wastage: {
      type: Number,
      default: 0 // percentage
    },
    notes: String
  }],
  // Total quantity
  totalQuantity: {
    type: Number,
    default: 0
  },
  // Cost calculation
  cost: {
    materialCost: { type: Number, default: 0 },
    wastageCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 }
  },
  // Output unit
  outputUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  // Processing time (in ball mill)
  processingTime: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 }
  },
  // Quality parameters
  qualityParams: {
    density: { min: Number, max: Number },
    viscosity: { min: Number, max: Number },
    ph: { min: Number, max: Number },
    residue: { min: Number, max: Number }
  },
  // Instructions
  instructions: {
    en: String,
    ur: String
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive'],
    default: 'draft'
  },
  isDefault: {
    type: Boolean,
    default: false
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
  timestamps: true
});

// Indexes
compositionSchema.index({ companyId: 1, code: 1 }, { unique: true });
compositionSchema.index({ companyId: 1, type: 1 });
compositionSchema.index({ companyId: 1, finishedGood: 1 });

// Pre-save middleware to calculate totals
compositionSchema.pre('save', async function(next) {
  // Calculate total quantity
  this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate percentages
  this.items.forEach(item => {
    item.percentage = this.totalQuantity > 0 ? (item.quantity / this.totalQuantity) * 100 : 0;
  });
  
  // Calculate cost (will be updated when materials have costs)
  const RawMaterial = require('./RawMaterial');
  let materialCost = 0;
  
  for (const item of this.items) {
    const material = await RawMaterial.findById(item.material);
    if (material) {
      const itemCost = (material.costing.averageCost || 0) * item.quantity;
      const wastageCost = itemCost * (item.wastage / 100);
      materialCost += itemCost + wastageCost;
    }
  }
  
  this.cost.materialCost = materialCost;
  this.cost.wastageCost = 0; // Already included above
  this.cost.totalCost = materialCost;
  this.cost.costPerUnit = this.totalQuantity > 0 ? materialCost / this.totalQuantity : 0;
  
  next();
});

module.exports = mongoose.model('Composition', compositionSchema);
