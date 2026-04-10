const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: [true, 'Section code is required'],
    trim: true,
    uppercase: true
  },
  // Frontend-compatible flat fields
  sectionGroup: { type: String, trim: true },
  mainSection: { type: String, trim: true },
  subSection: { type: String, trim: true },
  isNonMaterial: { type: Boolean, default: false },
  name: {
    en: { type: String },
    ur: { type: String }
  },
  description: {
    en: String,
    ur: String
  },
  // Section type
  type: {
    type: String,
    enum: ['production', 'storage', 'administration', 'sales', 'quality_control', 'maintenance'],
    default: 'production'
  },
  // Parent section for hierarchical structure
  parentSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    default: null
  },
  level: {
    type: Number,
    default: 1
  },
  // Section head/manager
  headId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  },
  // Location
  location: {
    building: String,
    floor: String,
    room: String
  },
  // Capacity
  capacity: {
    workers: Number,
    machines: Number,
    storage: Number,
    storageUnit: String
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  // For production sections
  productionStages: [{
    stageNumber: Number,
    name: { en: String, ur: String },
    description: String,
    defaultWorkers: Number,
    estimatedTime: Number // in minutes
  }],
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

// Compound index for unique code per company
sectionSchema.index({ companyId: 1, code: 1 }, { unique: true });
sectionSchema.index({ companyId: 1, isActive: 1 });
sectionSchema.index({ companyId: 1, type: 1 });

// Pre-save middleware to auto-generate code
sectionSchema.pre('save', async function(next) {
  if (!this.code && this.isNew) {
    const count = await mongoose.model('Section').countDocuments({ companyId: this.companyId });
    this.code = `SEC${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Section', sectionSchema);
