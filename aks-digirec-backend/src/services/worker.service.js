const { Worker, WorkerActivity, WorkerPayment, ProductionBatch } = require('../models');
const AccountingService = require('./accounting.service');
const logger = require('../config/logger');

class WorkerService {
  /**
   * Record worker activity
   */
  static async recordActivity(data, userId) {
    const {
      companyId,
      workerId,
      date,
      activityType,
      production,
      timeTracking,
      wages,
      workDetails,
      notes
    } = data;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    // Calculate wages if not provided
    const calculatedWages = await this.calculateWages(worker, timeTracking, production, wages);

    const activity = await WorkerActivity.create({
      companyId,
      workerId,
      date,
      activityType,
      production,
      timeTracking,
      wages: calculatedWages,
      workDetails,
      notes,
      createdBy: userId
    });

    // Update worker statistics - only increment present count if this is first activity for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const activitiesForDay = await WorkerActivity.countDocuments({
      companyId,
      workerId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // Increment present counter only if this is the first activity for this day
    if (activitiesForDay === 1) {
      worker.attendance.present += 1;
    }

    if (timeTracking?.overtimeHours > 0) {
      worker.attendance.overtime += timeTracking.overtimeHours;
    }
    await worker.save();

    logger.info(`Worker activity recorded: ${worker.code} - ${date}`);
    return activity;
  }

  /**
   * Calculate worker wages based on worker type and provided rates
   * For piece-rate workers: use piece wages
   * For time-rate workers: use hourly wages (regular + overtime)
   * If both applicable: use whichever is higher
   */
  static async calculateWages(worker, timeTracking, production, providedWages = {}) {
    const { hourlyRate, overtimeRate, pieceRate } = providedWages;

    let regularHours = 0;
    let overtimeHours = 0;
    let regularWages = 0;
    let overtimeWages = 0;
    let pieceWages = 0;
    let totalWages = 0;

    // Calculate from time tracking
    if (timeTracking?.checkIn && timeTracking?.checkOut) {
      const checkIn = new Date(timeTracking.checkIn);
      const checkOut = new Date(timeTracking.checkOut);
      let totalMs = checkOut - checkIn;

      if (timeTracking.breakStart && timeTracking.breakEnd) {
        totalMs -= (new Date(timeTracking.breakEnd) - new Date(timeTracking.breakStart));
      }

      const totalHours = parseFloat((totalMs / (1000 * 60 * 60)).toFixed(2));
      const regularHoursLimit = 8;

      if (totalHours > regularHoursLimit) {
        regularHours = regularHoursLimit;
        overtimeHours = totalHours - regularHoursLimit;
      } else {
        regularHours = totalHours;
      }

      const rate = hourlyRate || worker.wages?.amount || 0;
      const otRate = overtimeRate || (rate * 1.5);

      regularWages = regularHours * rate;
      overtimeWages = overtimeHours * otRate;
    }

    // Calculate piece wages
    if (production?.quantityApproved && production.quantityApproved > 0) {
      const rate = pieceRate || (worker.wages?.amount || 0) * 0.1; // piece rate is typically lower
      pieceWages = production.quantityApproved * rate;
    }

    // Calculate total wages based on worker type
    const hourlyTotal = regularWages + overtimeWages;
    
    if (worker.workerType === 'piece_rate' && pieceWages > 0) {
      // For piece-rate workers, use piece wages if available
      totalWages = pieceWages;
    } else if (hourlyTotal > 0) {
      // For time-rate workers, use hourly wages
      totalWages = hourlyTotal;
    } else if (pieceWages > 0) {
      // Fallback to piece wages if no time tracking
      totalWages = pieceWages;
    }

    return {
      hourlyRate: hourlyRate || worker.wages?.amount || 0,
      overtimeRate: overtimeRate || (worker.wages?.amount * 1.5) || 0,
      pieceRate: pieceRate || (worker.wages?.amount * 0.1) || 0,
      regularHours,
      overtimeHours,
      piecesProduced: production?.quantityApproved || 0,
      regularWages,
      overtimeWages,
      pieceWages,
      totalWages: parseFloat(totalWages.toFixed(2))
    };
  }

  /**
   * Create worker payment
   */
  static async createPayment(data, userId) {
    const {
      companyId,
      workerId,
      period,
      paymentDate,
      paymentMethod,
      notes
    } = data;

    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    // Get activities for the period
    const activities = await WorkerActivity.find({
      companyId,
      workerId,
      date: { $gte: period.startDate, $lte: period.endDate },
      status: 'approved',
      paymentId: null
    });

    if (activities.length === 0) {
      throw new Error('No approved activities found for this period');
    }

    // Calculate earnings
    const earnings = {
      basicWages: activities.reduce((sum, a) => sum + (a.wages?.regularWages || 0), 0),
      overtimeWages: activities.reduce((sum, a) => sum + (a.wages?.overtimeWages || 0), 0),
      pieceWages: activities.reduce((sum, a) => sum + (a.wages?.pieceWages || 0), 0),
      bonus: 0,
      allowance: 0
    };
    earnings.totalEarnings = earnings.basicWages + earnings.overtimeWages + earnings.pieceWages + earnings.bonus + earnings.allowance;

    // Calculate deductions
    const deductions = {
      advance: 0,
      loan: 0,
      tax: 0,
      insurance: 0,
      other: 0
    };
    deductions.totalDeductions = 0;

    const netPayment = earnings.totalEarnings - deductions.totalDeductions;

    // Calculate attendance
    const attendance = {
      present: activities.length,
      absent: 0,
      leave: 0,
      overtime: activities.reduce((sum, a) => sum + (a.wages?.overtimeHours || 0), 0),
      totalHours: activities.reduce((sum, a) => sum + (a.wages?.regularHours || 0), 0)
    };

    // Calculate production
    const production = {
      quantityProduced: activities.reduce((sum, a) => sum + (a.production?.quantityProduced || 0), 0),
      quantityApproved: activities.reduce((sum, a) => sum + (a.production?.quantityApproved || 0), 0),
      quantityRejected: activities.reduce((sum, a) => sum + (a.production?.quantityRejected || 0), 0)
    };

    const payment = await WorkerPayment.create({
      companyId,
      workerId,
      period,
      paymentDate,
      earnings,
      deductions,
      netPayment,
      paymentMethod,
      activities: activities.map(a => a._id),
      attendance,
      production,
      notes,
      status: 'calculated',
      calculatedBy: userId,
      calculatedAt: new Date(),
      createdBy: userId
    });

    // Update activities with payment reference
    await WorkerActivity.updateMany(
      { _id: { $in: activities.map(a => a._id) } },
      { paymentId: payment._id }
    );

    logger.info(`Worker payment calculated: ${payment.paymentNumber} for ${worker.code}`);
    return payment;
  }

  /**
   * Approve worker payment
   */
  static async approvePayment(companyId, paymentId, userId) {
    const payment = await WorkerPayment.findOne({ _id: paymentId, companyId });
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'calculated') {
      throw new Error('Payment already processed');
    }

    payment.status = 'approved';
    payment.approvedBy = userId;
    payment.approvedAt = new Date();
    await payment.save();

    logger.info(`Worker payment approved: ${payment.paymentNumber}`);
    return payment;
  }

  /**
   * Process worker payment
   */
  static async processPayment(companyId, paymentId, paymentDetails, userId) {
    const payment = await WorkerPayment.findOne({ _id: paymentId, companyId });
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'approved') {
      throw new Error('Payment must be approved before processing');
    }

    payment.status = 'paid';
    payment.paidBy = userId;
    payment.paidAt = new Date();
    payment.paymentDetails = paymentDetails;
    await payment.save();

    // Update worker balance
    const worker = await Worker.findById(payment.workerId);
    if (worker) {
      worker.currentBalance += payment.netPayment;
      await worker.save();
    }

    // Create ledger entry
    await AccountingService.postWorkerPayment(companyId, payment, userId);

    // Update activity statuses
    await WorkerActivity.updateMany(
      { _id: { $in: payment.activities } },
      { status: 'paid' }
    );

    logger.info(`Worker payment processed: ${payment.paymentNumber}`);
    return payment;
  }

  /**
   * Get worker ledger
   */
  static async getWorkerLedger(companyId, workerId, fromDate, toDate) {
    const worker = await Worker.findById(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    const activities = await WorkerActivity.find({
      companyId,
      workerId,
      date: { $gte: fromDate, $lte: toDate }
    }).sort({ date: 1 });

    const payments = await WorkerPayment.find({
      companyId,
      workerId,
      paymentDate: { $gte: fromDate, $lte: toDate }
    }).sort({ paymentDate: 1 });

    // Calculate running balance
    let balance = 0;
    const ledger = [];

    for (const activity of activities) {
      balance += activity.wages?.totalWages || 0;
      ledger.push({
        date: activity.date,
        type: 'activity',
        description: `Activity - ${activity.activityType}`,
        debit: activity.wages?.totalWages || 0,
        credit: 0,
        balance
      });
    }

    for (const payment of payments) {
      balance -= payment.netPayment;
      ledger.push({
        date: payment.paymentDate,
        type: 'payment',
        description: `Payment ${payment.paymentNumber}`,
        debit: 0,
        credit: payment.netPayment,
        balance
      });
    }

    return {
      worker: {
        id: worker._id,
        code: worker.code,
        name: worker.fullName
      },
      ledger,
      summary: {
        totalEarnings: activities.reduce((sum, a) => sum + (a.wages?.totalWages || 0), 0),
        totalPaid: payments.reduce((sum, p) => sum + p.netPayment, 0),
        balance: worker.currentBalance
      }
    };
  }

  /**
   * Get daily attendance report
   */
  static async getDailyAttendance(companyId, date) {
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(queryDate.getFullYear(), queryDate.getMonth(), queryDate.getDate(), 23, 59, 59, 999);

    const activities = await WorkerActivity.find({
      companyId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('workerId', 'firstName lastName code department');

    const present = activities.filter(a => a.timeTracking?.checkIn);
    const absent = await Worker.countDocuments({
      companyId,
      status: 'active',
      isActive: true,
      _id: { $nin: present.map(a => a.workerId?._id) }
    });

    return {
      date,
      present: present.length,
      absent,
      details: activities
    };
  }

  /**
   * Get worker productivity report
   */
  static async getProductivityReport(companyId, workerId, fromDate, toDate) {
    const activities = await WorkerActivity.find({
      companyId,
      workerId,
      date: { $gte: fromDate, $lte: toDate },
      'production.quantityProduced': { $gt: 0 }
    });

    const totalProduced = activities.reduce((sum, a) => sum + (a.production?.quantityProduced || 0), 0);
    const totalApproved = activities.reduce((sum, a) => sum + (a.production?.quantityApproved || 0), 0);
    const totalRejected = activities.reduce((sum, a) => sum + (a.production?.quantityRejected || 0), 0);
    const totalHours = activities.reduce((sum, a) => sum + (a.wages?.regularHours || 0), 0);

    return {
      workerId,
      period: { from: fromDate, to: toDate },
      totalProduced,
      totalApproved,
      totalRejected,
      rejectionRate: totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0,
      totalHours,
      piecesPerHour: totalHours > 0 ? totalApproved / totalHours : 0,
      activities
    };
  }

  /**
   * Get payroll summary
   */
  static async getPayrollSummary(companyId, period) {
    const payments = await WorkerPayment.find({
      companyId,
      'period.startDate': period.startDate,
      'period.endDate': period.endDate
    }).populate('workerId', 'firstName lastName code');

    const summary = {
      totalWorkers: payments.length,
      totalEarnings: payments.reduce((sum, p) => sum + (p.earnings?.totalEarnings || 0), 0),
      totalDeductions: payments.reduce((sum, p) => sum + (p.deductions?.totalDeductions || 0), 0),
      netPayable: payments.reduce((sum, p) => sum + p.netPayment, 0),
      byStatus: {
        calculated: payments.filter(p => p.status === 'calculated').length,
        approved: payments.filter(p => p.status === 'approved').length,
        paid: payments.filter(p => p.status === 'paid').length
      }
    };

    return {
      period,
      summary,
      payments
    };
  }
}

module.exports = WorkerService;
