const { Attendance, Worker, Section } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const XLSX = require('xlsx');

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

  // Build results for all workers
  const results = workers.map(worker => {
    const attendance = attendanceMap.get(worker._id.toString());
    const fallbackSectionGroup = worker.department?.sectionGroup || null;
    const finalSectionGroup = attendance?.sectionGroup || fallbackSectionGroup;
    
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
      hasAttendance: !!attendance
    };
  });

  // Calculate summary
  const summary = {
    totalWorkers: results.length,
    present: results.filter(r => r.status === 'present').length,
    absent: results.filter(r => r.status === 'absent').length,
    leave: results.filter(r => r.status === 'leave').length,
    halfDay: results.filter(r => r.status === 'half_day').length,
    holiday: results.filter(r => r.status === 'holiday').length,
    totalWorkingHours: results.reduce((sum, r) => sum + r.workingHours, 0),
    totalOvertimeHours: results.reduce((sum, r) => sum + r.overtimeHours, 0)
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
    
    logger.info(`Attendance updated for worker ${workerId} on ${date}`);
    res.status(200).json({ success: true, message: 'Attendance updated', data: attendance });
  } else {
    // Create new attendance
    attendance = await Attendance.create({
      ...attendanceData,
      createdBy: req.user._id
    });
    
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

  // Prepare data for Excel
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
