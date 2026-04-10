const mongoose = require('mongoose');

const materialTypeSchema = new mongoose.Schema({
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
  // Category
  category: {
    type: String,
    enum: ['raw_material', 'chemical', 'additive', 'packaging', 'fuel', 'other'],
    required: true
  },
  // Default unit
  defaultUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  // Stock tracking
  trackStock: {
    type: Boolean,
    default: true
  },
  // For chemicals/dyes with life tracking
  hasLifeTracking: {
    type: Boolean,
    default: false
  },
  // Default ledger account
  defaultLedgerAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LedgerAccount'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystem: {
    type: Boolean,
    default: false
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

// Compound index
materialTypeSchema.index({ companyId: 1, code: 1 }, { unique: true });
materialTypeSchema.index({ companyId: 1, category: 1 });

// Static method to get default material types
materialTypeSchema.statics.getDefaultTypes = function(companyId) {
  return [
    { companyId, code: 'CLAY', name: { en: 'Clay', ur: 'مٹی' }, category: 'raw_material' },
    { companyId, code: 'FELDSPAR', name: { en: 'Feldspar', ur: 'فیلڈسپار' }, category: 'raw_material' },
    { companyId, code: 'SILICA', name: { en: 'Silica Sand', ur: 'سلیکا ریت' }, category: 'raw_material' },
    { companyId, code: 'KAOLIN', name: { en: 'Kaolin', ur: 'کاؤلن' }, category: 'raw_material' },
    { companyId, code: 'QUARTZ', name: { en: 'Quartz', ur: 'کوارٹز' }, category: 'raw_material' },
    { companyId, code: 'GLAZE', name: { en: 'Glaze Material', ur: 'گلیز مواد' }, category: 'chemical' },
    { companyId, code: 'PIGMENT', name: { en: 'Pigment/Dye', ur: 'رنگین مواد' }, category: 'chemical', hasLifeTracking: true },
    { companyId, code: 'BINDER', name: { en: 'Binder', ur: 'بانڈر' }, category: 'additive' },
    { companyId, code: 'BOX', name: { en: 'Packaging Box', ur: 'پیکیجنگ ڈبہ' }, category: 'packaging' },
    { companyId, code: 'GAS', name: { en: 'Natural Gas', ur: 'قدرتی گیس' }, category: 'fuel' },
    { companyId, code: 'ELECTRIC', name: { en: 'Electricity', ur: 'بجلی' }, category: 'fuel' }
  ];
};

module.exports = mongoose.model('MaterialType', materialTypeSchema);
