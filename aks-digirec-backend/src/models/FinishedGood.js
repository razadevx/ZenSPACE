const mongoose = require('mongoose');

const finishedGoodSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Product code is required'],
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
  // Product category
  category: {
    type: String,
    required: true,
    enum: ['tiles', 'sanitary', 'tableware', 'decorative', 'industrial', 'other']
  },
  // Sub-category
  subCategory: String,
  // Specifications
  specifications: {
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: String
    },
    weight: {
      value: Number,
      unit: String
    },
    material: String,
    finish: String,
    grade: String,
    custom: mongoose.Schema.Types.Mixed
  },
  // Unit
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  // Alternative units
  alternativeUnits: [{
    unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    conversionFactor: Number,
    barcode: String
  }],
  // Inventory
  inventory: {
    minLevel: { type: Number, default: 0 },
    maxLevel: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 }
  },
  // Current stock (by variant)
  currentStock: [{
    variantId: String,
    color: String,
    size: String,
    pattern: String,
    quantity: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    location: String,
    lastUpdated: { type: Date, default: Date.now }
  }],
  // Total stock (virtual calculation)
  totalStock: {
    quantity: { type: Number, default: 0 },
    value: { type: Number, default: 0 }
  },
  // Costing
  costing: {
    materialCost: { type: Number, default: 0 },
    labourCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    lastCalculated: Date
  },
  // Pricing
  pricing: {
    costPrice: { type: Number, default: 0 },
    wholesalePrice: { type: Number, default: 0 },
    retailPrice: { type: Number, default: 0 },
    minimumPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' }
  },
  // Tax
  tax: {
    applicable: { type: Boolean, default: true },
    rate: { type: Number, default: 18 }, // GST percentage
    hsnCode: String
  },
  // Production
  production: {
    composition: { type: mongoose.Schema.Types.ObjectId, ref: 'Composition' },
    stages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Section' }],
    standardTime: Number, // in minutes
    batchSize: { type: Number, default: 1 }
  },
  // Variants (colors, sizes)
  variants: {
    colors: [{
      name: String,
      code: String,
      hex: String
    }],
    sizes: [{
      name: String,
      code: String,
      dimensions: String
    }],
    patterns: [{
      name: String,
      code: String
    }]
  },
  // Images
  images: [{
    url: String,
    caption: String,
    isPrimary: { type: Boolean, default: false }
  }],
  // Barcode/QR
  barcode: String,
  qrCode: String,
  // Ledger account
  ledgerAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount'
  },
  // Sales account
  salesAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount'
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'draft'],
    default: 'active'
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
finishedGoodSchema.index({ companyId: 1, code: 1 }, { unique: true });
finishedGoodSchema.index({ companyId: 1, category: 1 });
finishedGoodSchema.index({ companyId: 1, status: 1 });
finishedGoodSchema.index({ 'name.en': 'text', 'name.ur': 'text', code: 'text', 'description.en': 'text' });

// Virtual for profit margin
finishedGoodSchema.virtual('profitMargin').get(function() {
  if (this.pricing.costPrice === 0) return 0;
  return ((this.pricing.retailPrice - this.pricing.costPrice) / this.pricing.costPrice) * 100;
});

// Virtual for stock status
finishedGoodSchema.virtual('stockStatus').get(function() {
  const totalQty = this.totalStock.quantity;
  if (totalQty <= 0) return 'out_of_stock';
  if (totalQty <= this.inventory.reorderLevel) return 'reorder';
  if (totalQty <= this.inventory.minLevel) return 'low';
  return 'normal';
});

// Pre-save middleware
finishedGoodSchema.pre('save', function(next) {
  // Calculate total cost
  this.costing.totalCost = this.costing.materialCost + this.costing.labourCost + this.costing.overheadCost;
  
  // Calculate total stock
  this.totalStock.quantity = this.currentStock.reduce((sum, s) => sum + s.quantity, 0);
  this.totalStock.value = this.currentStock.reduce((sum, s) => sum + s.value, 0);
  
  next();
});

// Pre-save middleware to auto-generate code
finishedGoodSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const prefix = this.category.substring(0, 3).toUpperCase();
    const count = await mongoose.model('FinishedGood').countDocuments({ companyId: this.companyId });
    this.code = `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to update stock
finishedGoodSchema.methods.updateStock = async function(variantId, quantity, value, type = 'in') {
  const variant = this.currentStock.find(s => s.variantId === variantId);
  
  if (variant) {
    if (type === 'in') {
      variant.quantity += quantity;
      variant.value += value;
    } else {
      variant.quantity -= quantity;
      variant.value -= value;
    }
    variant.lastUpdated = new Date();
  } else if (type === 'in') {
    this.currentStock.push({
      variantId,
      quantity,
      value,
      lastUpdated: new Date()
    });
  }
  
  // Recalculate totals
  this.totalStock.quantity = this.currentStock.reduce((sum, s) => sum + s.quantity, 0);
  this.totalStock.value = this.currentStock.reduce((sum, s) => sum + s.value, 0);
  
  await this.save();
};

module.exports = mongoose.model('FinishedGood', finishedGoodSchema);
