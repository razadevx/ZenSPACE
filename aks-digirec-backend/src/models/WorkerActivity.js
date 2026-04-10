const mongoose = require('mongoose');

const workerActivitySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  // Worker reference
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
    index: true
  },
  // Date
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Activity type
  activityType: {
    type: String,
    required: true,
    enum: ['production', 'maintenance', 'cleaning', 'training', 'overtime', 'idle', 'other'],
    default: 'production'
  },
  // Production details
  production: {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionBatch' },
    stageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    finishedGoodId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinishedGood' },
    quantityProduced: Number,
    quantityApproved: Number,
    quantityRejected: Number,
    rejectionReason: String
  },
  // Time tracking
  timeTracking: {
    checkIn: Date,
    checkOut: Date,
    breakStart: Date,
    breakEnd: Date,
    totalHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    idleHours: { type: Number, default: 0 }
  },
  // Work details
  workDetails: {
    operation: String,
    machineUsed: String,
    description: String
  },
  // Wages calculation
  wages: {
    hourlyRate: Number,
    overtimeRate: Number,
    pieceRate: Number,
    regularHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    piecesProduced: { type: Number, default: 0 },
    regularWages: { type: Number, default: 0 },
    overtimeWages: { type: Number, default: 0 },
    pieceWages: { type: Number, default: 0 },
    totalWages: { type: Number, default: 0 },
    currency: { type: String, default: 'PKR' }
  },
  // Quality
  quality: {
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grade: { type: String, enum: ['A', 'B', 'C', 'Reject'] },
    remarks: String
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending'
  },
  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  // Payment reference
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerPayment'
  },
  // Notes
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

// Indexes
workerActivitySchema.index({ companyId: 1, workerId: 1, date: -1 });
workerActivitySchema.index({ companyId: 1, date: -1 });
workerActivitySchema.index({ companyId: 1, 'production.batchId': 1 });
workerActivitySchema.index({ companyId: 1, status: 1 });

// Pre-save middleware to calculate wages
workerActivitySchema.pre('save', function(next) {
  // Calculate time
  if (this.timeTracking.checkIn && this.timeTracking.checkOut) {
    const checkIn = new Date(this.timeTracking.checkIn);
    const checkOut = new Date(this.timeTracking.checkOut);
    let totalMs = checkOut - checkIn;
    
    // Subtract break time
    if (this.timeTracking.breakStart && this.timeTracking.breakEnd) {
      totalMs -= (new Date(this.timeTracking.breakEnd) - new Date(this.timeTracking.breakStart));
    }
    
    this.timeTracking.totalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));
    
    // Calculate regular and overtime hours (assuming 8 hours regular)
    const regularHoursLimit = 8;
    if (this.timeTracking.totalHours > regularHoursLimit) {
      this.wages.regularHours = regularHoursLimit;
      this.wages.overtimeHours = this.timeTracking.totalHours - regularHoursLimit;
    } else {
      this.wages.regularHours = this.timeTracking.totalHours;
      this.wages.overtimeHours = 0;
    }
  }
  
  // Calculate wages
  this.wages.regularWages = this.wages.regularHours * (this.wages.hourlyRate || 0);
  this.wages.overtimeWages = this.wages.overtimeHours * (this.wages.overtimeRate || 0);
  this.wages.pieceWages = (this.production?.quantityApproved || 0) * (this.wages.pieceRate || 0);
  
  // Total wages (whichever is higher - hourly or piece rate)
  const hourlyTotal = this.wages.regularWages + this.wages.overtimeWages;
  this.wages.totalWages = Math.max(hourlyTotal, this.wages.pieceWages);
  
  next();
});

module.exports = mongoose.model('WorkerActivity', workerActivitySchema);
