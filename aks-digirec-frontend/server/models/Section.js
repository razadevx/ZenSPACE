const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  sectionGroup: {
    type: String,
    required: true,
    enum: ['Clay Group', 'Glaze & Color Group', 'Kiln Group', 'Flower Group', 'Sticker Group', 'Packing Group', 'Other']
  },
  mainSection: {
    type: String,
    required: true
  },
  subSection: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  isNonMaterial: {
    type: Boolean,
    default: false
  },
  description: String,
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

// Compound index for unique sections per company
sectionSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
