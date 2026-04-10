const { Worker, WorkerActivity, WorkerPayment, Section } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Get all unique section groups that have workers
 * GET /api/workers/section-groups
 */
exports.getSectionGroups = asyncHandler(async (req, res) => {
  const companyId = req.companyId;

  // Get unique sectionGroup values from sections that have workers
  const sections = await Section.find({ companyId, isActive: true })
    .select('sectionGroup code')
    .lean();

  // Get unique, non-empty sectionGroups
  const groups = [...new Set(
    sections.map(s => s.sectionGroup).filter(Boolean)
  )].sort();

  // Also find sections where workers are directly assigned (via department)
  // Return them in a format usable by the frontend tabs
  const result = groups.map((group, idx) => ({
    id: group,
    label: group,
  }));

  res.status(200).json({ success: true, data: result });
});

/**
 * Get worker activities for a specific date and section group
 * GET /api/workers/activities?date=YYYY-MM-DD&sectionGroup=Clay Group
 */
exports.getWorkerActivities = asyncHandler(async (req, res, next) => {
  const { date, sectionGroup } = req.query;
  const companyId = req.companyId;

  if (!date) {
    return next(new AppError('Date is required', 400));
  }

  // Properly create date boundaries without modifying original date
  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

  let workers = [];

  if (sectionGroup) {
    // 1. Find sections that belong to this sectionGroup
    const sections = await Section.find({
      companyId,
      isActive: true,
      sectionGroup: { $regex: new RegExp(`^${sectionGroup}$`, 'i') }
    }).select('_id').lean();
    const sectionIds = sections.map(s => s._id);

    // If sectionIds is empty, we can't filter by anything meaningful — return empty
    if (sectionIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 2. Find workers belonging to these sections
    const workerQuery = {
      companyId,
      isActive: true,
      department: { $in: sectionIds }
    };

    workers = await Worker.find(workerQuery).lean();
  } else {
    // No sectionGroup filter — return all active workers
    workers = await Worker.find({ companyId, isActive: true }).lean();
  }

  // 3. For each worker, gather activity and payment data for that day
  const results = await Promise.all(workers.map(async (worker) => {
    const activities = await WorkerActivity.find({
      companyId,
      workerId: worker._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    const payments = await WorkerPayment.find({
      companyId,
      workerId: worker._id,
      paymentDate: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    const workedAmount = activities.reduce((sum, act) => sum + (act.wages?.totalWages || 0), 0);
    const advanceDaily = payments.reduce((sum, p) => sum + (p.deductions?.advance || 0), 0);
    const paid = payments.reduce((sum, p) => sum + (p.netPayment || 0), 0);
    const balanceBF = worker.currentBalance || 0;
    const amountToPay = balanceBF + workedAmount - advanceDaily;
    const balanceCF = amountToPay - paid;

    return {
      _id: worker._id,
      code: worker.code,
      workerName: `${worker.firstName} ${worker.lastName}`,
      group: sectionGroup || 'All Groups',
      attendance: activities.length > 0 ? 'present' : 'absent',
      checkIn: activities[0]?.timeTracking?.checkIn,
      checkOut: activities[0]?.timeTracking?.checkOut,
      hours: activities[0]?.timeTracking?.totalHours || 0,
      balanceBF,
      workedAmount,
      advanceDaily,
      amountToPay,
      paid,
      balanceCF,
      status: activities[0]?.status || 'pending',
      activityCount: activities.length
    };
  }));

  res.status(200).json({ success: true, data: results });
});

/**
 * Close the day for worker activities
 * POST /api/workers/close-day
 */
exports.closeDay = asyncHandler(async (req, res, next) => {
  const { date } = req.body;
  const companyId = req.companyId;

  if (!date) {
    return next(new AppError('Date is required', 400));
  }

  // Properly create date boundaries without modifying original date
  const queryDate = new Date(date);
  const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

  // 1. Mark all pending activities for this day as approved/closed
  const result = await WorkerActivity.updateMany(
    {
      companyId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'pending'
    },
    {
      $set: {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date()
      }
    }
  );

  // 2. Logic to update worker balances could be added here if not already handled by pre-save hooks
  // However, updating balance on "Close Day" is better than on every save if you want a formal "closing".
  // For now, we'll assume the current model of live balancing.

  res.status(200).json({
    success: true,
    message: `Day closed successfully. ${result.modifiedCount} activities updated.`,
    data: { modifiedCount: result.modifiedCount }
  });
});

/**
 * Close the week for worker activities
 * POST /api/workers/close-week
 */
exports.closeWeek = asyncHandler(async (req, res, next) => {
  const { date } = req.body;
  const companyId = req.companyId;

  if (!date) {
    return next(new AppError('Date is required', 400));
  }

  // Calculate the start and end of the week (assuming Sunday to Saturday)
  const queryDate = new Date(date);
  const day = queryDate.getDay();
  const diff = queryDate.getDate() - day; // Back to Sunday
  
  const startOfWeek = new Date(queryDate.getFullYear(), queryDate.getMonth(), diff, 0, 0, 0, 0);
  const endOfWeek = new Date(queryDate.getFullYear(), queryDate.getMonth(), diff + 6, 23, 59, 59, 999);

  const result = await WorkerActivity.updateMany(
    {
      companyId,
      date: { $gte: startOfWeek, $lte: endOfWeek },
      status: 'pending'
    },
    {
      $set: {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date()
      }
    }
  );

  res.status(200).json({
    success: true,
    message: `Week closed successfully. ${result.modifiedCount} activities updated.`,
    data: { modifiedCount: result.modifiedCount }
  });
});

/**
 * Create worker activity with proper validation
 * POST /api/workers/activities
 */
exports.createWorkerActivity = asyncHandler(async (req, res, next) => {
  const { workerId, date, activityType, timeTracking, production, workDetails, notes } = req.body;
  const companyId = req.companyId;

  // Validate worker exists
  const worker = await Worker.findOne({ _id: workerId, companyId });
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  // Validate date
  const activityDate = new Date(date);
  if (isNaN(activityDate)) {
    return next(new AppError('Invalid date format', 400));
  }

  const activity = await WorkerActivity.create({
    companyId,
    workerId,
    date: activityDate,
    activityType,
    timeTracking,
    production,
    workDetails,
    notes,
    createdBy: req.user._id
  });

  // Update worker statistics
  const startOfDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate(), 23, 59, 59, 999);

  const activitiesForDay = await WorkerActivity.countDocuments({
    companyId,
    workerId,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  if (activitiesForDay === 1) {
    worker.attendance.present += 1;
    await worker.save();
  }

  res.status(201).json({
    success: true,
    message: 'Activity recorded successfully',
    data: activity
  });
});

/**
 * Approve worker activity
 * PUT /api/workers/activities/:id/approve
 */
exports.approveWorkerActivity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.companyId;

  const activity = await WorkerActivity.findOneAndUpdate(
    { _id: id, companyId },
    {
      status: 'approved',
      approvedBy: req.user._id,
      approvedAt: new Date()
    },
    { new: true }
  );

  if (!activity) {
    return next(new AppError('Activity not found', 404));
  }

  res.json({
    success: true,
    message: 'Activity approved successfully',
    data: activity
  });
});

/**
 * Get worker payments
 * GET /api/workers/payments
 */
exports.getWorkerPayments = asyncHandler(async (req, res) => {
  const { workerId, status, page = 1, limit = 50 } = req.query;
  const companyId = req.companyId;

  const query = { companyId };
  if (workerId) query.workerId = workerId;
  if (status) query.status = status;

  const payments = await WorkerPayment.find(query)
    .populate('workerId', 'firstName lastName code')
    .sort({ paymentDate: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const count = await WorkerPayment.countDocuments(query);

  res.json({
    success: true,
    data: payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    }
  });
});

/**
 * Create worker payment
 * POST /api/workers/payments
 */
exports.createWorkerPayment = asyncHandler(async (req, res, next) => {
  const { workerId, period, paymentDate, paymentMethod, notes } = req.body;
  const companyId = req.companyId;

  // Validate worker exists
  const worker = await Worker.findOne({ _id: workerId, companyId });
  if (!worker) {
    return next(new AppError('Worker not found', 404));
  }

  // Validate period dates
  if (!period || !period.startDate || !period.endDate) {
    return next(new AppError('Period with startDate and endDate is required', 400));
  }

  const payment = await WorkerPayment.create({
    companyId,
    workerId,
    period,
    paymentDate: new Date(paymentDate),
    paymentMethod,
    notes,
    status: 'draft',
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Payment created successfully',
    data: payment
  });
});

/**
 * Approve worker payment
 * PUT /api/workers/payments/:id/approve
 */
exports.approveWorkerPayment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.companyId;

  const payment = await WorkerPayment.findOne({ _id: id, companyId });
  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  if (payment.status !== 'draft' && payment.status !== 'calculated') {
    return next(new AppError('Can only approve draft or calculated payments', 400));
  }

  payment.status = 'approved';
  payment.approvedBy = req.user._id;
  payment.approvedAt = new Date();
  await payment.save();

  res.json({
    success: true,
    message: 'Payment approved successfully',
    data: payment
  });
});

/**
 * Process worker payment (mark as paid)
 * PUT /api/workers/payments/:id/pay
 */
exports.processWorkerPayment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.companyId;
  const { paymentDetails } = req.body;

  const payment = await WorkerPayment.findOne({ _id: id, companyId });
  if (!payment) {
    return next(new AppError('Payment not found', 404));
  }

  if (payment.status !== 'approved') {
    return next(new AppError('Payment must be approved before marking as paid', 400));
  }

  payment.status = 'paid';
  payment.paidBy = req.user._id;
  payment.paidAt = new Date();
  if (paymentDetails) {
    payment.paymentDetails = paymentDetails;
  }
  await payment.save();

  res.json({
    success: true,
    message: 'Payment processed successfully',
    data: payment
  });
});
