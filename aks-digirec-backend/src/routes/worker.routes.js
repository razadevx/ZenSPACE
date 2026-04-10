const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

router.use(protect);
router.use(companyIsolation);

// Get all dynamic section groups from sections master data
router.get('/section-groups', hasPermission('workers.view'), workerController.getSectionGroups);

// Worker Activity routes
router.get('/activities', hasPermission('workers.view'), workerController.getWorkerActivities);

// Create worker activity with validation
router.post('/activities', 
  hasPermission('workers.create'),
  validate({
    workerId: 'required|string',
    date: 'required|date',
    activityType: 'required|in:production,maintenance,cleaning,training,overtime,idle,other',
    timeTracking: 'object',
    production: 'object',
    workDetails: 'object'
  }),
  workerController.createWorkerActivity
);

// Approve worker activity
router.put('/activities/:id/approve', 
  hasPermission('workers.edit'),
  workerController.approveWorkerActivity
);

// Close day
router.post('/close-day', 
  hasPermission('workers.edit'),
  validate({ date: 'required|date' }),
  workerController.closeDay
);

// Close week
router.post('/close-week',
  hasPermission('workers.edit'),
  validate({ date: 'required|date' }),
  workerController.closeWeek
);

// Worker Payment routes
router.get('/payments', hasPermission('workers.view'), workerController.getWorkerPayments);

router.post('/payments', 
  hasPermission('workers.create'),
  validate({
    workerId: 'required|string',
    period: 'required|object',
    paymentDate: 'required|date',
    paymentMethod: 'required|in:cash,bank_transfer,cheque'
  }),
  workerController.createWorkerPayment
);

router.put('/payments/:id/approve', 
  hasPermission('workers.edit'),
  workerController.approveWorkerPayment
);

router.put('/payments/:id/pay', 
  hasPermission('workers.edit'),
  workerController.processWorkerPayment
);

module.exports = router;
