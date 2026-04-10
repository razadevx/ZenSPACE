const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  // Attendance status
  status: {
    type: String,
    enum: ['present', 'absent', 'leave', 'half_day', 'holiday'],
    default: 'absent',
    required: true
  },
  // Check in/out times
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  // Working hours
  workingHours: {
    type: Number,
    default: 0
  },
  // Overtime hours
  overtimeHours: {
    type: Number,
    default: 0
  },
  // Late arrival (in minutes)
  lateMinutes: {
    type: Number,
    default: 0
  },
  // Early departure (in minutes)
  earlyDepartureMinutes: {
    type: Number,
    default: 0
  },
  // Section/Department where worker marked attendance
  sectionGroup: {
    type: String,
    index: true
  },
  // Notes/remarks
  notes: {
    type: String
  },
  // Who marked the attendance
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Approval status
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  // For leave - leave type
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'annual', 'unpaid', 'other']
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

// Compound indexes for efficient queries
attendanceSchema.index({ companyId: 1, date: -1, sectionGroup: 1 });
attendanceSchema.index({ companyId: 1, workerId: 1, date: -1 });
attendanceSchema.index({ companyId: 1, date: 1, status: 1 });

// Pre-save middleware to calculate working hours and late/early
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const checkInTime = new Date(this.checkIn);
    const checkOutTime = new Date(this.checkOut);
    
    // Calculate total working hours
    const diffMs = checkOutTime - checkInTime;
    if (diffMs < 0) {
      this.workingHours = 0;
      this.overtimeHours = 0;
      this.lateMinutes = 0;
      this.earlyDepartureMinutes = 0;
      return next();
    }
    this.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    
    // Standard check-in time is 9:00 AM
    const standardCheckIn = new Date(checkInTime);
    standardCheckIn.setHours(9, 0, 0, 0);
    
    // Standard check-out time is 5:00 PM (9 hours including 1 hour lunch)
    const standardCheckOut = new Date(checkInTime);
    standardCheckOut.setHours(17, 0, 0, 0);
    
    // Calculate late minutes
    if (checkInTime > standardCheckIn) {
      this.lateMinutes = Math.floor((checkInTime - standardCheckIn) / (1000 * 60));
    } else {
      this.lateMinutes = 0;
    }
    
    // Calculate early departure
    if (checkOutTime < standardCheckOut) {
      this.earlyDepartureMinutes = Math.floor((standardCheckOut - checkOutTime) / (1000 * 60));
    } else {
      this.earlyDepartureMinutes = 0;
    }
    
    // Calculate overtime (assuming 8 hours standard work)
    const standardWorkHours = 8;
    if (this.workingHours > standardWorkHours) {
      this.overtimeHours = parseFloat((this.workingHours - standardWorkHours).toFixed(2));
    } else {
      this.overtimeHours = 0;
    }
  } else {
    this.workingHours = 0;
    this.overtimeHours = 0;
    this.lateMinutes = 0;
    this.earlyDepartureMinutes = 0;
  }
  
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
