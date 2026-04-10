const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Unit code is required'],
    trim: true,
    uppercase: true
  },
  name: {
    en: { type: String, required: true },
    ur: { type: String }
  },
  symbol: {
    type: String,
    required: true,
    trim: true
  },
  // Unit type
  type: {
    type: String,
    enum: ['weight', 'volume', 'length', 'area', 'piece', 'time', 'other'],
    required: true
  },
  // Conversion to base unit
  baseUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    default: null
  },
  conversionFactor: {
    type: Number,
    default: 1
  },
  // Decimal places for display
  decimalPlaces: {
    type: Number,
    default: 2
  },
  // Is this a system unit (cannot be deleted)
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    en: String,
    ur: String
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
unitSchema.index({ companyId: 1, code: 1 }, { unique: true });
unitSchema.index({ companyId: 1, type: 1 });

// Static method to get default units
unitSchema.statics.getDefaultUnits = function(companyId) {
  return [
    // Weight
    { companyId, code: 'KG', name: { en: 'Kilogram', ur: 'کلوگرام' }, symbol: 'kg', type: 'weight', isSystem: true, decimalPlaces: 3 },
    { companyId, code: 'GM', name: { en: 'Gram', ur: 'گرام' }, symbol: 'g', type: 'weight', baseUnit: null, conversionFactor: 0.001, isSystem: true },
    { companyId, code: 'TON', name: { en: 'Ton', ur: 'ٹن' }, symbol: 'ton', type: 'weight', baseUnit: null, conversionFactor: 1000, isSystem: true },
    { companyId, code: 'LB', name: { en: 'Pound', ur: 'پاؤنڈ' }, symbol: 'lb', type: 'weight', baseUnit: null, conversionFactor: 0.453592, isSystem: true },
    
    // Volume
    { companyId, code: 'LTR', name: { en: 'Liter', ur: 'لیٹر' }, symbol: 'L', type: 'volume', isSystem: true },
    { companyId, code: 'ML', name: { en: 'Milliliter', ur: 'ملی لیٹر' }, symbol: 'ml', type: 'volume', baseUnit: null, conversionFactor: 0.001, isSystem: true },
    { companyId, code: 'GAL', name: { en: 'Gallon', ur: 'گیلن' }, symbol: 'gal', type: 'volume', baseUnit: null, conversionFactor: 3.78541, isSystem: true },
    
    // Length
    { companyId, code: 'MTR', name: { en: 'Meter', ur: 'میٹر' }, symbol: 'm', type: 'length', isSystem: true },
    { companyId, code: 'CM', name: { en: 'Centimeter', ur: 'سینٹی میٹر' }, symbol: 'cm', type: 'length', baseUnit: null, conversionFactor: 0.01, isSystem: true },
    { companyId, code: 'FT', name: { en: 'Foot', ur: 'فٹ' }, symbol: 'ft', type: 'length', baseUnit: null, conversionFactor: 0.3048, isSystem: true },
    { companyId, code: 'INCH', name: { en: 'Inch', ur: 'انچ' }, symbol: 'in', type: 'length', baseUnit: null, conversionFactor: 0.0254, isSystem: true },
    
    // Area
    { companyId, code: 'SQFT', name: { en: 'Square Foot', ur: 'مربع فٹ' }, symbol: 'sq ft', type: 'area', isSystem: true },
    { companyId, code: 'SQM', name: { en: 'Square Meter', ur: 'مربع میٹر' }, symbol: 'sq m', type: 'area', baseUnit: null, conversionFactor: 10.7639, isSystem: true },
    
    // Piece
    { companyId, code: 'PCS', name: { en: 'Pieces', ur: 'پیس' }, symbol: 'pcs', type: 'piece', isSystem: true, decimalPlaces: 0 },
    { companyId, code: 'DOZ', name: { en: 'Dozen', ur: 'درجن' }, symbol: 'doz', type: 'piece', baseUnit: null, conversionFactor: 12, isSystem: true },
    { companyId, code: 'BOX', name: { en: 'Box', ur: 'ڈبہ' }, symbol: 'box', type: 'piece', isSystem: true },
    { companyId, code: 'PKT', name: { en: 'Packet', ur: 'پیکٹ' }, symbol: 'pkt', type: 'piece', isSystem: true },
    
    // Time
    { companyId, code: 'HR', name: { en: 'Hour', ur: 'گھنٹہ' }, symbol: 'hr', type: 'time', isSystem: true },
    { companyId, code: 'MIN', name: { en: 'Minute', ur: 'منٹ' }, symbol: 'min', type: 'time', baseUnit: null, conversionFactor: 1/60, isSystem: true },
    { companyId, code: 'DAY', name: { en: 'Day', ur: 'دن' }, symbol: 'day', type: 'time', baseUnit: null, conversionFactor: 24, isSystem: true }
  ];
};

module.exports = mongoose.model('Unit', unitSchema);
