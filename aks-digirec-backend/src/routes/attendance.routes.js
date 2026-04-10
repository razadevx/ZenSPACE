const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Get attendance records for a date
router.get('/', hasPermission('workers.view'), attendanceController.getAttendance);

// Get attendance report for date range
router.get('/report', hasPermission('workers.view'), attendanceController.getAttendanceReport);

// Export attendance to Excel
router.get('/export', hasPermission('workers.view'), attendanceController.exportAttendance);

// Get monthly summary
router.get('/monthly-summary', hasPermission('workers.view'), attendanceController.getMonthlySummary);

// Mark attendance for a worker
router.post('/', hasPermission('workers.create'), attendanceController.markAttendance);

// Mark bulk attendance
router.post('/bulk', hasPermission('workers.create'), attendanceController.markBulkAttendance);

// Update attendance
router.put('/:id', hasPermission('workers.edit'), attendanceController.updateAttendance);

// Approve attendance
router.put('/:id/approve', hasPermission('workers.edit'), attendanceController.approveAttendance);

// Delete attendance
router.delete('/:id', hasPermission('workers.delete'), attendanceController.deleteAttendance);

module.exports = router;
