const { ReportService, AccountingService, InventoryService, ProductionService, WorkerService } = require('../services');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// @desc    Get dashboard summary
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await ReportService.getDashboardSummary(req.companyId);
  res.status(200).json({ success: true, data: summary });
});

// @desc    Get stock report
// @route   GET /api/reports/stock
// @access  Private
exports.getStockReport = asyncHandler(async (req, res) => {
  const { itemType, category } = req.query;
  const report = await ReportService.getStockReport(req.companyId, { itemType, category });
  res.status(200).json({ success: true, data: report });
});

// @desc    Get stock movements
// @route   GET /api/reports/stock-movements
// @access  Private
exports.getStockMovements = asyncHandler(async (req, res) => {
  const { itemType, itemId, from, to } = req.query;
  const report = await InventoryService.getStockMovements(req.companyId, { itemType, itemId, fromDate: from, toDate: to });
  res.status(200).json({ success: true, data: report });
});

// @desc    Get low stock report
// @route   GET /api/reports/low-stock
// @access  Private
exports.getLowStockReport = asyncHandler(async (req, res) => {
  const report = await InventoryService.getLowStockItems(req.companyId);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get ledger report
// @route   GET /api/reports/ledger
// @access  Private
exports.getLedgerReport = asyncHandler(async (req, res) => {
  const { asOfDate } = req.query;
  const report = await AccountingService.getTrialBalance(req.companyId, asOfDate ? new Date(asOfDate) : new Date());
  res.status(200).json({ success: true, data: report });
});

// @desc    Get trial balance
// @route   GET /api/reports/trial-balance
// @access  Private
exports.getTrialBalance = asyncHandler(async (req, res) => {
  const { asOfDate } = req.query;
  const report = await AccountingService.getTrialBalance(req.companyId, asOfDate ? new Date(asOfDate) : new Date());
  res.status(200).json({ success: true, data: report });
});

// @desc    Get balance sheet
// @route   GET /api/reports/balance-sheet
// @access  Private
exports.getBalanceSheet = asyncHandler(async (req, res) => {
  const { asOfDate } = req.query;
  const report = await AccountingService.getBalanceSheet(req.companyId, asOfDate ? new Date(asOfDate) : new Date());
  res.status(200).json({ success: true, data: report });
});

// @desc    Get profit and loss
// @route   GET /api/reports/profit-loss
// @access  Private
exports.getProfitLoss = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
  const toDate = to ? new Date(to) : new Date();
  const report = await AccountingService.getProfitLoss(req.companyId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get worker ledger
// @route   GET /api/reports/worker-ledger
// @access  Private
exports.getWorkerLedger = asyncHandler(async (req, res) => {
  const { workerId, from, to } = req.query;
  if (!workerId) {
    throw new AppError('Worker ID is required', 400);
  }
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
  const toDate = to ? new Date(to) : new Date();
  const report = await WorkerService.getWorkerLedger(req.companyId, workerId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get production report
// @route   GET /api/reports/production
// @access  Private
exports.getProductionReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
  const toDate = to ? new Date(to) : new Date();
  const report = await ProductionService.getProductionReport(req.companyId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get WIP report
// @route   GET /api/reports/wip
// @access  Private
exports.getWIPReport = asyncHandler(async (req, res) => {
  const report = await ProductionService.getWIPReport(req.companyId);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get production efficiency
// @route   GET /api/reports/production-efficiency
// @access  Private
exports.getProductionEfficiency = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
  const toDate = to ? new Date(to) : new Date();
  const report = await ProductionService.getEfficiencyReport(req.companyId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = asyncHandler(async (req, res) => {
  const { from, to, groupBy } = req.query;
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
  const toDate = to ? new Date(to) : new Date();
  const report = await ReportService.getSalesReport(req.companyId, fromDate, toDate, groupBy);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get purchase report
// @route   GET /api/reports/purchases
// @access  Private
exports.getPurchaseReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
  const toDate = to ? new Date(to) : new Date();
  const report = await ReportService.getPurchaseReport(req.companyId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get customer statement
// @route   GET /api/reports/customer-statement
// @access  Private
exports.getCustomerStatement = asyncHandler(async (req, res) => {
  const { customerId, from, to } = req.query;
  if (!customerId) {
    throw new AppError('Customer ID is required', 400);
  }
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 90));
  const toDate = to ? new Date(to) : new Date();
  const report = await ReportService.getCustomerStatement(req.companyId, customerId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get supplier statement
// @route   GET /api/reports/supplier-statement
// @access  Private
exports.getSupplierStatement = asyncHandler(async (req, res) => {
  const { supplierId, from, to } = req.query;
  if (!supplierId) {
    throw new AppError('Supplier ID is required', 400);
  }
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 90));
  const toDate = to ? new Date(to) : new Date();
  const report = await ReportService.getSupplierStatement(req.companyId, supplierId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get aging report
// @route   GET /api/reports/aging
// @access  Private
exports.getAgingReport = asyncHandler(async (req, res) => {
  const { type = 'receivable' } = req.query;
  const report = await ReportService.getAgingReport(req.companyId, type);
  res.status(200).json({ success: true, data: report });
});

// @desc    Get daily attendance
// @route   GET /api/reports/daily-attendance
// @access  Private
exports.getDailyAttendance = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const report = await WorkerService.getDailyAttendance(req.companyId, date ? new Date(date) : new Date());
  res.status(200).json({ success: true, data: report });
});

// @desc    Get payroll summary
// @route   GET /api/reports/payroll-summary
// @access  Private
exports.getPayrollSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }
  const report = await WorkerService.getPayrollSummary(req.companyId, {
    startDate: new Date(startDate),
    endDate: new Date(endDate)
  });
  res.status(200).json({ success: true, data: report });
});

// @desc    Get worker productivity
// @route   GET /api/reports/worker-productivity
// @access  Private
exports.getWorkerProductivity = asyncHandler(async (req, res) => {
  const { workerId, from, to } = req.query;
  if (!workerId) {
    throw new AppError('Worker ID is required', 400);
  }
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));
  const toDate = to ? new Date(to) : new Date();
  const report = await WorkerService.getProductivityReport(req.companyId, workerId, fromDate, toDate);
  res.status(200).json({ success: true, data: report });
});
