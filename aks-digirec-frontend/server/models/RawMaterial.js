const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  materialType: {
    type: String,
    required: true,
    enum: ['Clay Material', 'Glaze Material', 'Color Material', 'Flower Material', 'Sticker Material', 'Packing Material', 'Dyeing Material', 'Mould Material', 'Other']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    required: true,
    enum: ['Kg', 'Liters', 'Pieces', 'Bags', 'Boxes']
  },
  stock: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    default: 0
  },
  rate: {
    type: Number,
    default: 0
  },
  minStock: {
    type: Number,
    default: 0
  },
  maxStock: {
    type: Number,
    default: 0
  },
  openingBalanceDate: Date,
  details: String,
  piecesPerSheet: Number,
  piecesRemaining: Number,
  modelBinding: String,
  lifeLimit: Number,
  lifeUsed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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

// Calculate rate before saving
rawMaterialSchema.pre('save', function(next) {
  if (this.stock > 0) {
    this.rate = this.amount / this.stock;
  }
  next();
});

// Check if stock is low
rawMaterialSchema.methods.isLowStock = function() {
  return this.stock <= this.minStock;
};

// Check if stock is high
rawMaterialSchema.methods.isHighStock = function() {
  return this.stock >= this.maxStock;
};

rawMaterialSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
