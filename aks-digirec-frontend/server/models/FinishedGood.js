const mongoose = require('mongoose');

const finishedGoodSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
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
  size: {
    type: String,
    enum: ['10', '8', '6', '5', 'Bora', 'Other']
  },
  unit: {
    type: String,
    required: true,
    enum: ['Pieces', 'Boxes', 'Bora']
  },
  category: {
    type: String,
    enum: ['Simple', 'Color', 'Full Color', 'Flower', 'Full Flower', 'Other']
  },
  color: String,
  grossWeight: {
    type: Number,
    default: 0
  },
  grossGlaze: {
    type: Number,
    default: 0
  },
  grossColor: {
    type: Number,
    default: 0
  },
  costPrice: {
    type: Number,
    default: 0
  },
  sellingPrice: {
    type: Number,
    default: 0
  },
  stock: {
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
  colorRequired: {
    type: Boolean,
    default: false
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

// Check stock status
finishedGoodSchema.methods.getStockStatus = function() {
  if (this.stock <= this.minStock) return 'low';
  if (this.stock >= this.maxStock) return 'high';
  return 'normal';
};

finishedGoodSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('FinishedGood', finishedGoodSchema);
