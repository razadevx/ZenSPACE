const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Dashboard
router.get('/dashboard', hasPermission('reports.view'), reportController.getDashboardSummary);

// Stock Reports
router.get('/stock', hasPermission('reports.view'), reportController.getStockReport);
router.get('/stock-movements', hasPermission('reports.view'), reportController.getStockMovements);
router.get('/low-stock', hasPermission('reports.view'), reportController.getLowStockReport);

// Accounting Reports
router.get('/ledger', hasPermission('reports.view'), reportController.getLedgerReport);
router.get('/trial-balance', hasPermission('reports.view'), reportController.getTrialBalance);
router.get('/balance-sheet', hasPermission('reports.view'), reportController.getBalanceSheet);
router.get('/profit-loss', hasPermission('reports.view'), reportController.getProfitLoss);

// Production Reports
router.get('/production', hasPermission('reports.view'), reportController.getProductionReport);
router.get('/wip', hasPermission('reports.view'), reportController.getWIPReport);
router.get('/production-efficiency', hasPermission('reports.view'), reportController.getProductionEfficiency);

// Sales & Purchase Reports
router.get('/sales', hasPermission('reports.view'), reportController.getSalesReport);
router.get('/purchases', hasPermission('reports.view'), reportController.getPurchaseReport);

// Customer & Supplier Reports
router.get('/customer-statement', hasPermission('reports.view'), reportController.getCustomerStatement);
router.get('/supplier-statement', hasPermission('reports.view'), reportController.getSupplierStatement);
router.get('/aging', hasPermission('reports.view'), reportController.getAgingReport);

// Worker Reports
router.get('/worker-ledger', hasPermission('reports.view'), reportController.getWorkerLedger);
router.get('/daily-attendance', hasPermission('reports.view'), reportController.getDailyAttendance);
router.get('/payroll-summary', hasPermission('reports.view'), reportController.getPayrollSummary);
router.get('/worker-productivity', hasPermission('reports.view'), reportController.getWorkerProductivity);

module.exports = router;
