const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Material code is required'],
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
  // Material type
  materialType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialType',
    required: true
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
    isDefault: { type: Boolean, default: false }
  }],
  // Specifications
  specifications: {
    purity: Number,
    meshSize: String,
    color: String,
    origin: String,
    grade: String,
    custom: mongoose.Schema.Types.Mixed
  },
  // Inventory settings
  inventory: {
    minLevel: { type: Number, default: 0 },
    maxLevel: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 },
    safetyStock: { type: Number, default: 0 }
  },
  // Costing
  costing: {
    method: { type: String, enum: ['FIFO', 'LIFO', 'AVERAGE'], default: 'AVERAGE' },
    standardCost: { type: Number, default: 0 },
    lastPurchaseCost: { type: Number, default: 0 },
    averageCost: { type: Number, default: 0 }
  },
  // Current stock
  currentStock: {
    quantity: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  // Life tracking (for dyes, chemicals)
  lifeTracking: {
    enabled: { type: Boolean, default: false },
    shelfLife: Number, // in days
    warningDays: Number, // days before expiry to warn
    batches: [{
      batchNumber: String,
      quantity: Number,
      manufacturedDate: Date,
      expiryDate: Date,
      status: { type: String, enum: ['active', 'expired', 'depleted'], default: 'active' }
    }]
  },
  // Suppliers
  preferredSuppliers: [{
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    priority: Number,
    leadTime: Number, // in days
    lastPrice: Number
  }],
  // Ledger account
  ledgerAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount'
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  // Images
  images: [{
    url: String,
    caption: String
  }],
  // Barcode/QR
  barcode: String,
  qrCode: String,
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

// Compound indexes
rawMaterialSchema.index({ companyId: 1, code: 1 }, { unique: true });
rawMaterialSchema.index({ companyId: 1, materialType: 1 });
rawMaterialSchema.index({ companyId: 1, isActive: 1 });
rawMaterialSchema.index({ companyId: 1, 'currentStock.quantity': 1 });
rawMaterialSchema.index({ 'name.en': 'text', 'name.ur': 'text', code: 'text' });

// Virtual for stock status
rawMaterialSchema.virtual('stockStatus').get(function() {
  const stock = this.currentStock.quantity;
  if (stock <= 0) return 'out_of_stock';
  if (stock <= this.inventory.reorderLevel) return 'reorder';
  if (stock <= this.inventory.minLevel) return 'low';
  return 'normal';
});

// Virtual for unit cost
rawMaterialSchema.virtual('unitCost').get(function() {
  return this.currentStock.quantity > 0 
    ? this.currentStock.value / this.currentStock.quantity 
    : this.costing.averageCost || 0;
});

// Pre-save middleware to auto-generate code
rawMaterialSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const MaterialType = require('./MaterialType');
    const materialType = await MaterialType.findById(this.materialType);
    const prefix = materialType ? materialType.code.substring(0, 3) : 'MAT';
    const count = await mongoose.model('RawMaterial').countDocuments({ companyId: this.companyId });
    this.code = `${prefix}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to update stock
rawMaterialSchema.methods.updateStock = async function(quantity, value, type = 'in') {
  if (type === 'in') {
    // Update average cost
    const totalQty = this.currentStock.quantity + quantity;
    const totalValue = this.currentStock.value + value;
    this.costing.averageCost = totalQty > 0 ? totalValue / totalQty : 0;
    
    this.currentStock.quantity += quantity;
    this.currentStock.value += value;
  } else {
    this.currentStock.quantity -= quantity;
    this.currentStock.value -= value;
  }
  
  this.currentStock.lastUpdated = new Date();
  await this.save();
};

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
