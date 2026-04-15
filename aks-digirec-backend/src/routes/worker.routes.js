const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
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
  validate([
    body('workerId').notEmpty().isString().withMessage('workerId is required and must be a string'),
    body('date').isISO8601().toDate().withMessage('date is required and must be a valid date'),
    body('activityType').notEmpty().isIn(['production','maintenance','cleaning','training','overtime','idle','other']).withMessage('activityType is required and must be one of: production, maintenance, cleaning, training, overtime, idle, other'),
    body('timeTracking').optional().isObject().withMessage('timeTracking must be an object'),
    body('production').optional().isObject().withMessage('production must be an object'),
    body('workDetails').optional().isObject().withMessage('workDetails must be an object')
  ]),
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
  validate([
    body('date').isISO8601().toDate().withMessage('date is required and must be a valid date')
  ]),
  workerController.closeDay
);

// Close week
router.post('/close-week',
  hasPermission('workers.edit'),
  validate([
    body('date').isISO8601().toDate().withMessage('date is required and must be a valid date')
  ]),
  workerController.closeWeek
);

// Worker Payment routes
router.get('/payments', hasPermission('workers.view'), workerController.getWorkerPayments);

router.post('/payments', 
  hasPermission('workers.create'),
  validate([
    body('workerId').notEmpty().isString().withMessage('workerId is required and must be a string'),
    body('period').notEmpty().isObject().withMessage('period is required and must be an object'),
    body('paymentDate').isISO8601().toDate().withMessage('paymentDate is required and must be a valid date'),
    body('paymentMethod').notEmpty().isIn(['cash','bank_transfer','cheque']).withMessage('paymentMethod is required and must be one of: cash, bank_transfer, cheque')
  ]),
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
