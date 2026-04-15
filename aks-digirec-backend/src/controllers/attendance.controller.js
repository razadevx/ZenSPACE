const { Attendance, Worker, Section } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const XLSX = require('xlsx');

/**
 * Calculate worker wages based on attendance and worker wage settings
 */
const calculateWorkerWages = (attendance, worker) => {
  console.log('=== WAGE CALC START ===');
  console.log('Worker:', worker?.firstName, worker?.lastName, 'Code:', worker?.code);
  console.log('Worker wages object:', JSON.stringify(worker?.wages, null, 2));
  console.log('Attendance hours:', attendance?.workingHours, 'OT:', attendance?.overtimeHours);

  if (!attendance || !worker) {
    console.log('ERROR: Missing attendance or worker');
    return {
      hourlyRate: 0, overtimeRate: 0, dailyRate: 0,
      regularHours: 0, overtimeHours: 0,
      regularWages: 0, overtimeWages: 0, totalWages: 0
    };
  }

  // Handle case where wages is not set
  if (!worker.wages || !worker.wages.type || !worker.wages.amount) {
    console.log('ERROR: Worker has no wages configured - wages:', worker?.wages);
    return {
      hourlyRate: 0, overtimeRate: 0, dailyRate: 0,
      regularHours: 0, overtimeHours: 0,
      regularWages: 0, overtimeWages: 0, totalWages: 0
    };
  }

  const wageType = worker.wages.type;
  const baseAmount = worker.wages.amount || 0;
  const workingHours = attendance.workingHours || 0;
  const overtimeHours = attendance.overtimeHours || 0;

  console.log('Wage type:', wageType, 'Base amount:', baseAmount);
  console.log('Working hours:', workingHours, 'Overtime hours:', overtimeHours);

  let hourlyRate = 0;
  let overtimeRate = 0;
  let dailyRate = 0;
  let regularWages = 0;
  let overtimeWages = 0;

  if (wageType === 'hourly') {
    hourlyRate = baseAmount;
    overtimeRate = worker.wages.overtimeRate || (baseAmount * 1.5);
    // Cap regular hours at 8, anything beyond is overtime
    const regularHoursCalc = Math.min(workingHours, 8);
    const overtimeHoursCalc = Math.max(0, workingHours - 8) + overtimeHours;
    regularWages = regularHoursCalc * hourlyRate;
    overtimeWages = overtimeHoursCalc * overtimeRate;
  } else if (wageType === 'daily') {
    dailyRate = baseAmount;
    hourlyRate = baseAmount / 8; // Assuming 8-hour workday
    overtimeRate = hourlyRate * 1.5;
    // Pro-rata calculation based on hours worked (max 1 day worth)
    const effectiveHours = Math.min(workingHours, 8);
    const overtimeHoursCalc = Math.max(0, workingHours - 8) + overtimeHours;
    regularWages = (effectiveHours / 8) * dailyRate; // Pro-rata wages
    overtimeWages = overtimeHoursCalc * overtimeRate;
  } else if (wageType === 'monthly') {
    // Assume 26 working days per month, 8 hours per day
    dailyRate = baseAmount / 26;
    hourlyRate = dailyRate / 8;
    overtimeRate = hourlyRate * 1.5;
    // Pro-rata calculation based on hours worked (max 1 day worth)
    const effectiveHours = Math.min(workingHours, 8);
    const overtimeHoursCalc = Math.max(0, workingHours - 8) + overtimeHours;
    regularWages = (effectiveHours / 8) * dailyRate; // Pro-rata daily wages
    overtimeWages = overtimeHoursCalc * overtimeRate;
  } else {
    // piece_rate or default - use hourly equivalent if hours are tracked
    hourlyRate = worker.wages.hourlyEquivalent || 0;
    overtimeRate = hourlyRate * 1.5;
    dailyRate = baseAmount;
    if (hourlyRate > 0 && workingHours > 0) {
      const regularHoursCalc = Math.min(workingHours, 8);
      const overtimeHoursCalc = Math.max(0, workingHours - 8) + overtimeHours;
      regularWages = regularHoursCalc * hourlyRate;
      overtimeWages = overtimeHoursCalc * overtimeRate;
    } else {
      regularWages = 0;
      overtimeWages = 0;
    }
  }

  // Calculate regular hours (cap at 8 hours for standard work)
  const regularHours = Math.min(workingHours, 8);

  const result = {
    hourlyRate: parseFloat(hourlyRate.toFixed(2)),
    overtimeRate: parseFloat(overtimeRate.toFixed(2)),
    dailyRate: parseFloat(dailyRate.toFixed(2)),
    regularHours: parseFloat(regularHours.toFixed(2)),
    overtimeHours: parseFloat(overtimeHours.toFixed(2)),
    regularWages: parseFloat(regularWages.toFixed(2)),
    overtimeWages: parseFloat(overtimeWages.toFixed(2)),
    totalWages: parseFloat((regularWages + overtimeWages).toFixed(2))
  };

  console.log('=== WAGE CALC RESULT ===');
  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('=== WAGE CALC END ===');

  return result;
};

/**
 * Get attendance records for a specific date
 * GET /api/attendance?date=YYYY-MM-DD&sectionGroup=Clay Group
 */
exports.getAttendance = asyncHandler(async (req, res, next) => {
  const { date, sectionGroup } = req.query;
  const companyId = req.companyId;

  if (!date) {
    return next(new AppError('Date is required', 400));
  }

  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

  let workers = [];

  if (sectionGroup) {
    // Find sections that belong to this sectionGroup
    const sections = await Section.find({
      companyId,
      isActive: true,
      sectionGroup: { $regex: new RegExp(`^${sectionGroup}$`, 'i') }
    }).select('_id').lean();
    const sectionIds = sections.map(s => s._id);

    if (sectionIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        summary: {
          totalWorkers: 0,
          present: 0,
          absent: 0,
          leave: 0,
          halfDay: 0,
          holiday: 0,
          totalWorkingHours: 0,
          totalOvertimeHours: 0
        }
      });
    }

    // Find workers belonging to these sections
    workers = await Worker.find({
      companyId,
      isActive: true,
      department: { $in: sectionIds }
    }).populate('department', 'sectionGroup').lean();
  } else {
    // Return all active workers
    workers = await Worker.find({ companyId, isActive: true })
      .populate('department', 'sectionGroup')
      .lean();
  }

  // Get existing attendance records for this date
  const attendanceQuery = {
    companyId,
    date: { $gte: startOfDay, $lte: endOfDay }
  };

  if (sectionGroup) {
    attendanceQuery.sectionGroup = sectionGroup;
  }

  const existingAttendance = await Attendance.find(attendanceQuery).lean();
  const attendanceMap = new Map(existingAttendance.map(a => [a.workerId.toString(), a]));

  // Build results for all workers with payment calculations
  const results = await Promise.all(workers.map(async (worker) => {
    const attendance = attendanceMap.get(worker._id.toString());
    const fallbackSectionGroup = worker.department?.sectionGroup || null;
    const finalSectionGroup = attendance?.sectionGroup || fallbackSectionGroup;

    // Calculate wages based on attendance and worker settings
    let wageCalc = attendance ? calculateWorkerWages(attendance, worker) : {
      hourlyRate: 0, overtimeRate: 0, dailyRate: 0,
      regularHours: 0, overtimeHours: 0,
      regularWages: 0, overtimeWages: 0, totalWages: 0
    };

      // Log for debugging
    console.log(`Worker ${worker.code}: hours=${attendance?.workingHours}, wages=${worker.wages?.type}:${worker.wages?.amount}, calc=${wageCalc.totalWages}`);

    // Get worker's current balance (Balance B/F is the balance before today)
    // For simplicity, we'll use the worker's currentBalance as Balance B/F
    const balanceBF = worker.currentBalance || 0;

    // Worked amount is the total wages earned today
    const workedAmount = wageCalc.totalWages;

    // Get advance amount from attendance record or default to 0
    const advanceAmount = attendance?.advanceAmount || 0;

    // Amount to pay is worked amount minus advance
    const amountToPay = Math.max(0, workedAmount - advanceAmount);

    // Paid amount (defaults to 0 unless recorded)
    const paidAmount = attendance?.paidAmount || 0;

    // Balance C/F = Balance B/F + Worked Amount - Paid Amount
    const balanceCF = balanceBF + workedAmount - paidAmount;

    return {
      _id: attendance?._id || null,
      workerId: worker._id,
      workerName: `${worker.firstName || ''} ${worker.lastName || ''}`.trim(),
      workerCode: worker.code,
      date: date,
      status: attendance?.status || 'absent',
      checkIn: attendance?.checkIn || null,
      checkOut: attendance?.checkOut || null,
      workingHours: attendance?.workingHours || 0,
      overtimeHours: attendance?.overtimeHours || 0,
      lateMinutes: attendance?.lateMinutes || 0,
      earlyDepartureMinutes: attendance?.earlyDepartureMinutes || 0,
      notes: attendance?.notes || '',
      leaveType: attendance?.leaveType || null,
      isApproved: attendance?.isApproved || false,
      sectionGroup: finalSectionGroup,
      hasAttendance: !!attendance,
      // Payment fields
      balanceBF: balanceBF,
      workedAmount: workedAmount,
      advanceAmount: advanceAmount,
      amountToPay: amountToPay,
      paidAmount: paidAmount,
      balanceCF: balanceCF,
      paymentStatus: attendance?.paymentStatus || 'unpaid',
      wageCalculation: wageCalc,
      // Include worker wage info for reference
      workerWageType: worker.wages?.type || 'daily',
      workerWageAmount: worker.wages?.amount || 0
    };
  }));

  // Calculate summary
  const summary = {
    totalWorkers: results.length,
    present: results.filter(r => r.status === 'present').length,
    absent: results.filter(r => r.status === 'absent').length,
    leave: results.filter(r => r.status === 'leave').length,
    halfDay: results.filter(r => r.status === 'half_day').length,
    holiday: results.filter(r => r.status === 'holiday').length,
    totalWorkingHours: results.reduce((sum, r) => sum + r.workingHours, 0),
    totalOvertimeHours: results.reduce((sum, r) => sum + r.overtimeHours, 0),
    // Payment summaries
    totalWorkedAmount: results.reduce((sum, r) => sum + r.workedAmount, 0),
    totalAdvanceAmount: results.reduce((sum, r) => sum + r.advanceAmount, 0),
    totalPaidAmount: results.reduce((sum, r) => sum + r.paidAmount, 0),
    totalAmountToPay: results.reduce((sum, r) => sum + r.amountToPay, 0),
    totalBalanceCF: results.reduce((sum, r) => sum + r.balanceCF, 0)
  };

  res.status(200).json({ success: true, data: results, summary });
});

/**
 * Mark attendance for a worker
 * POST /api/attendance
 */
exports.markAttendance = asyncHandler(async (req, res, next) => {
  const { workerId, date, status, checkIn, checkOut, notes, sectionGroup, leaveType } = req.body;
  const companyId = req.companyId;

  if (!workerId || !date || !status) {
    return next(new AppError('Worker ID, date, and status are required', 400));
  }

  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

  const worker = await Worker.findOne({ _id: workerId, companyId, isActive: true })
    .populate('department', 'sectionGroup')
    .lean();
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  // Check if attendance already exists
  let attendance = await Attendance.findOne({
    companyId,
    workerId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  const attendanceData = {
    companyId,
    workerId,
    date: startOfDay,
    status,
    notes,
    sectionGroup: sectionGroup || worker.department?.sectionGroup || undefined,
    leaveType,
    markedBy: req.user._id,
    updatedBy: req.user._id
  };

  // Only include checkIn/checkOut for present/half_day status
  if (status === 'present' || status === 'half_day') {
    if (checkIn) attendanceData.checkIn = new Date(checkIn);
    if (checkOut) attendanceData.checkOut = new Date(checkOut);
  } else {
    attendanceData.checkIn = null;
    attendanceData.checkOut = null;
  }

  if (attendance) {
    // Update existing attendance
    Object.assign(attendance, attendanceData);
    await attendance.save();

    // Calculate wages based on worker settings
    const wageCalc = calculateWorkerWages(attendance, worker);
    attendance.wageCalculation = wageCalc;
    await attendance.save();

    logger.info(`Attendance updated for worker ${workerId} on ${date}`);
    res.status(200).json({ success: true, message: 'Attendance updated', data: attendance });
  } else {
    // Create new attendance
    attendance = await Attendance.create({
      ...attendanceData,
      createdBy: req.user._id
    });

    // Calculate wages based on worker settings
    const wageCalc = calculateWorkerWages(attendance, worker);
    attendance.wageCalculation = wageCalc;
    attendance.balanceBF = worker.currentBalance || 0;
    await attendance.save();

    logger.info(`Attendance marked for worker ${workerId} on ${date}`);
    res.status(201).json({ success: true, message: 'Attendance marked', data: attendance });
  }
});

/**
 * Mark bulk attendance for multiple workers
 * POST /api/attendance/bulk
 */
exports.markBulkAttendance = asyncHandler(async (req, res, next) => {
  const { date, sectionGroup, attendances } = req.body;
  const companyId = req.companyId;

  if (!date || !Array.isArray(attendances)) {
    return next(new AppError('Date and attendances array are required', 400));
  }

  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

  const results = [];

  for (const att of attendances) {
    const { workerId, status, checkIn, checkOut, notes, leaveType } = att;

    const worker = await Worker.findOne({ _id: workerId, companyId, isActive: true })
      .populate('department', 'sectionGroup')
      .lean();
    if (!worker) {
      results.push({ workerId, status: 'skipped', reason: 'Worker not found' });
      continue;
    }

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      companyId,
      workerId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const attendanceData = {
      companyId,
      workerId,
      date: startOfDay,
      status,
      notes,
      sectionGroup: att.sectionGroup || sectionGroup || worker.department?.sectionGroup || undefined,
      leaveType,
      markedBy: req.user._id,
      updatedBy: req.user._id
    };

    if (status === 'present' || status === 'half_day') {
      if (checkIn) attendanceData.checkIn = new Date(checkIn);
      if (checkOut) attendanceData.checkOut = new Date(checkOut);
    } else {
      attendanceData.checkIn = null;
      attendanceData.checkOut = null;
    }

    if (attendance) {
      Object.assign(attendance, attendanceData);
      await attendance.save();
      results.push({ workerId, status: 'updated', attendance });
    } else {
      attendance = await Attendance.create({
        ...attendanceData,
        createdBy: req.user._id
      });
      results.push({ workerId, status: 'created', attendance });
    }
  }

  logger.info(`Bulk attendance marked for ${results.length} workers on ${date}`);
  res.status(200).json({ 
    success: true, 
    message: `Attendance marked for ${results.length} workers`,
    data: results 
  });
});

/**
 * Update attendance
 * PUT /api/attendance/:id
 */
exports.updateAttendance = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status, checkIn, checkOut, notes, leaveType } = req.body;
  const companyId = req.companyId;

  const attendance = await Attendance.findOne({ _id: id, companyId });

  if (!attendance) {
    return next(new AppError('Attendance record not found', 404));
  }

  if (status) attendance.status = status;
  if (notes !== undefined) attendance.notes = notes;
  if (leaveType) attendance.leaveType = leaveType;
  
  const finalStatus = attendance.status;
  if (finalStatus === 'present' || finalStatus === 'half_day') {
    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
  } else {
    attendance.checkIn = null;
    attendance.checkOut = null;
  }

  attendance.updatedBy = req.user._id;
  await attendance.save();

  res.status(200).json({ success: true, message: 'Attendance updated', data: attendance });
});

/**
 * Approve attendance
 * PUT /api/attendance/:id/approve
 */
exports.approveAttendance = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.companyId;

  const attendance = await Attendance.findOne({ _id: id, companyId });

  if (!attendance) {
    return next(new AppError('Attendance record not found', 404));
  }

  attendance.isApproved = true;
  attendance.approvedBy = req.user._id;
  attendance.approvedAt = new Date();
  await attendance.save();

  res.status(200).json({ success: true, message: 'Attendance approved', data: attendance });
});

/**
 * Delete attendance
 * DELETE /api/attendance/:id
 */
exports.deleteAttendance = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.companyId;

  const attendance = await Attendance.findOne({ _id: id, companyId });

  if (!attendance) {
    return next(new AppError('Attendance record not found', 404));
  }

  await attendance.deleteOne();

  res.status(200).json({ success: true, message: 'Attendance record deleted' });
});

/**
 * Record advance or payment for a worker's attendance
 * PUT /api/attendance/:id/payment
 */
exports.recordPayment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { advanceAmount, paidAmount } = req.body;
  const companyId = req.companyId;

  const attendance = await Attendance.findOne({ _id: id, companyId });

  if (!attendance) {
    return next(new AppError('Attendance record not found', 404));
  }

  // Update payment fields
  if (advanceAmount !== undefined) {
    attendance.advanceAmount = Math.max(0, advanceAmount);
  }
  if (paidAmount !== undefined) {
    attendance.paidAmount = Math.max(0, paidAmount);
  }

  // Get worker to calculate balance CF
  const worker = await Worker.findById(attendance.workerId);
  const balanceBF = worker?.currentBalance || 0;
  const workedAmount = attendance.wageCalculation?.totalWages || 0;

  // Recalculate balance CF
  attendance.balanceBF = balanceBF;
  attendance.balanceCF = balanceBF + workedAmount - attendance.paidAmount;

  // Determine payment status
  if (attendance.paidAmount >= workedAmount) {
    attendance.paymentStatus = 'paid';
  } else if (attendance.paidAmount > 0) {
    attendance.paymentStatus = 'partial';
  } else {
    attendance.paymentStatus = 'unpaid';
  }

  attendance.updatedBy = req.user._id;
  await attendance.save();

  logger.info(`Payment recorded for attendance ${id}: advance=${attendance.advanceAmount}, paid=${attendance.paidAmount}`);

  res.status(200).json({
    success: true,
    message: 'Payment recorded successfully',
    data: attendance
  });
});

/**
 * Get attendance report for a date range
 * GET /api/attendance/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&workerId=...
 */
exports.getAttendanceReport = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, workerId, sectionGroup } = req.query;
  const companyId = req.companyId;

  if (!startDate || !endDate) {
    return next(new AppError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const query = {
    companyId,
    date: { $gte: start, $lte: end }
  };

  if (workerId) query.workerId = workerId;
  if (sectionGroup) query.sectionGroup = sectionGroup;

  const attendances = await Attendance.find(query)
    .populate('workerId', 'firstName lastName code')
    .sort({ date: -1 })
    .lean();

  // Calculate statistics
  const stats = {
    totalDays: attendances.length,
    present: attendances.filter(a => a.status === 'present').length,
    absent: attendances.filter(a => a.status === 'absent').length,
    leave: attendances.filter(a => a.status === 'leave').length,
    halfDay: attendances.filter(a => a.status === 'half_day').length,
    holiday: attendances.filter(a => a.status === 'holiday').length,
    totalWorkingHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
    totalOvertimeHours: attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
    totalLateMinutes: attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0)
  };

  res.status(200).json({ success: true, data: attendances, stats });
});

/**
 * Export attendance to Excel
 * GET /api/attendance/export?date=YYYY-MM-DD&sectionGroup=...
 */
exports.exportAttendance = asyncHandler(async (req, res, next) => {
  const { date, sectionGroup } = req.query;
  const companyId = req.companyId;

  if (!date) {
    return next(new AppError('Date is required', 400));
  }

  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  let query = {
    companyId,
    date: { $gte: startOfDay, $lte: endOfDay }
  };

  if (sectionGroup) {
    query.sectionGroup = sectionGroup;
  }

  const attendances = await Attendance.find(query)
    .populate('workerId', 'firstName lastName code department')
    .sort({ 'workerId.firstName': 1 })
    .lean();

  // Prepare data for Excel with payment information
  const data = attendances.map(att => ({
    'Worker Code': att.workerId?.code || '',
    'Worker Name': att.workerId ? `${att.workerId.firstName} ${att.workerId.lastName}` : '',
    'Date': new Date(att.date).toLocaleDateString('en-GB'),
    'Status': att.status?.toUpperCase() || '',
    'Check In': att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
    'Check Out': att.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '',
    'Working Hours': att.workingHours || 0,
    'Overtime Hours': att.overtimeHours || 0,
    'Late Minutes': att.lateMinutes || 0,
    'Early Departure': att.earlyDepartureMinutes || 0,
    // Wage calculation
    'Hourly Rate': att.wageCalculation?.hourlyRate || 0,
    'Overtime Rate': att.wageCalculation?.overtimeRate || 0,
    'Regular Hours': att.wageCalculation?.regularHours || 0,
    'Regular Wages': att.wageCalculation?.regularWages || 0,
    'Overtime Wages': att.wageCalculation?.overtimeWages || 0,
    'Total Wages (Worked Amount)': att.wageCalculation?.totalWages || 0,
    // Payment information
    'Balance B/F': att.balanceBF || 0,
    'Advance Amount': att.advanceAmount || 0,
    'Amount to Pay': (att.wageCalculation?.totalWages || 0) - (att.advanceAmount || 0),
    'Paid Amount': att.paidAmount || 0,
    'Balance C/F': att.balanceCF || 0,
    'Payment Status': att.paymentStatus || 'unpaid',
    'Leave Type': att.leaveType || '',
    'Notes': att.notes || '',
    'Section Group': att.sectionGroup || '',
    'Approved': att.isApproved ? 'Yes' : 'No'
  }));

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Set headers for download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_${date}.xlsx`);
  
  res.send(buffer);
});

/**
 * Get monthly attendance summary
 * GET /api/attendance/monthly-summary?month=1&year=2024
 */
exports.getMonthlySummary = asyncHandler(async (req, res, next) => {
  const { month, year } = req.query;
  const companyId = req.companyId;

  if (!month || !year) {
    return next(new AppError('Month and year are required', 400));
  }

  const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

  const attendances = await Attendance.find({
    companyId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  })
    .populate('workerId', 'firstName lastName code')
    .lean();

  // Group by worker
  const workerSummary = {};
  
  attendances.forEach(att => {
    const workerId = att.workerId?._id?.toString();
    if (!workerId) return;

    if (!workerSummary[workerId]) {
      workerSummary[workerId] = {
        workerId,
        workerName: `${att.workerId.firstName} ${att.workerId.lastName}`,
        workerCode: att.workerId.code,
        present: 0,
        absent: 0,
        leave: 0,
        halfDay: 0,
        holiday: 0,
        totalWorkingHours: 0,
        totalOvertimeHours: 0
      };
    }

    workerSummary[workerId][att.status]++;
    workerSummary[workerId].totalWorkingHours += att.workingHours || 0;
    workerSummary[workerId].totalOvertimeHours += att.overtimeHours || 0;
  });

  res.status(200).json({ 
    success: true, 
    data: Object.values(workerSummary),
    month: parseInt(month),
    year: parseInt(year)
  });
});

/**
 * Recalculate wages for all attendance on a specific date
 * POST /api/attendance/recalculate-wages?date=YYYY-MM-DD
 */
exports.recalculateWages = asyncHandler(async (req, res, next) => {
  const { date } = req.query;
  const companyId = req.companyId;

  if (!date) {
    return next(new AppError('Date is required', 400));
  }

  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

  // Get all attendance for this date
  const attendances = await Attendance.find({
    companyId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).populate('workerId', 'firstName lastName code wages currentBalance');

  let updatedCount = 0;
  let failedCount = 0;

  for (const att of attendances) {
    try {
      const worker = att.workerId;
      if (!worker || !worker.wages || !worker.wages.type || !worker.wages.amount) {
        console.log(`Skipping ${att._id}: Worker has no wages configured`);
        failedCount++;
        continue;
      }

      // Recalculate wages
      const wageCalc = calculateWorkerWages(att, worker);

      // Update the record
      att.wageCalculation = wageCalc;
      att.balanceBF = worker.currentBalance || 0;
      att.balanceCF = (worker.currentBalance || 0) + wageCalc.totalWages - (att.paidAmount || 0);

      await att.save();
      updatedCount++;
      console.log(`Updated ${worker.code}: hours=${att.workingHours}, wageType=${worker.wages.type}, workedAmount=${wageCalc.totalWages}`);
    } catch (err) {
      console.error(`Failed to update attendance ${att._id}:`, err.message);
      failedCount++;
    }
  }

  res.status(200).json({
    success: true,
    message: `Wages recalculated for ${updatedCount} records, ${failedCount} failed`,
    updated: updatedCount,
    failed: failedCount,
    date: date
  });
});
