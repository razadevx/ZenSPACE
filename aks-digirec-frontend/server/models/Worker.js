const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
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
  advanceFixed: {
    type: Number,
    default: 0
  },
  sectionGroup: String,
  mainSection: String,
  subSection: String,
  workerType: {
    type: String,
    required: true,
    enum: ['Per Piece', 'Daily', 'Weekly', 'Monthly', 'Office', 'Temporary', 'Other']
  },
  joinDate: Date,
  fatherName: String,
  cnic: {
    type: String,
    match: [/^\d{5}-\d{7}-\d$/, 'Please enter valid CNIC format (12345-6789012-3)']
  },
  cellNumber: String,
  address: String,
  city: String,
  emergencyContact: String,
  referredBy: String,
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  notes: String,
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

workerSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Worker', workerSchema);
