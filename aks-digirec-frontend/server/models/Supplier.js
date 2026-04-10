const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  supplierType: {
    type: String,
    required: true,
    enum: ['Raw Material', 'Equipment', 'Service', 'Other']
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
  contactPerson: String,
  cellNumber: String,
  email: String,
  address: String,
  city: String,
  paymentTerms: {
    type: String,
    enum: ['Cash', '7 days', '15 days', '30 days', 'Custom Days'],
    default: 'Cash'
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  defaultMaterialType: String,
  defaultMaterial: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
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

supplierSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Supplier', supplierSchema);
