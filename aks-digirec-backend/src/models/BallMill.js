const mongoose = require('mongoose');

const ballMillSchema = new mongoose.Schema({
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
  // Specifications
  specifications: {
    capacity: { type: Number, required: true }, // in kg
    volume: Number, // in liters
    motorPower: String,
    liningMaterial: String,
    ballCharge: Number // in kg
  },
  // Location
  location: {
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    details: String
  },
  // Status
  operationalStatus: {
    type: String,
    enum: ['operational', 'maintenance', 'repair', 'retired'],
    default: 'operational'
  },
  // Current batch
  currentBatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BallMillBatch',
    default: null
  },
  // Statistics
  statistics: {
    totalBatches: { type: Number, default: 0 },
    totalOutput: { type: Number, default: 0 },
    lastMaintenance: Date,
    nextMaintenance: Date
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
ballMillSchema.index({ companyId: 1, code: 1 }, { unique: true });
ballMillSchema.index({ companyId: 1, operationalStatus: 1 });

module.exports = mongoose.model('BallMill', ballMillSchema);
