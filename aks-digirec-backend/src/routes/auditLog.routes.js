const express = require('express');
const router = express.Router();
const { protect, companyIsolation, authorize } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Get audit logs
router.get('/', async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const { userId, action, entityType, from, to, page = 1, limit = 50 } = req.query;
  
  const query = { companyId: req.companyId };
  
  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  
  const logs = await AuditLog.find(query)
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await AuditLog.countDocuments(query);
  
  res.json({
    success: true,
    data: logs,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

// Get entity history
router.get('/entity/:entityType/:entityId', async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  
  const logs = await AuditLog.getEntityHistory(req.params.entityType, req.params.entityId);
  
  res.json({ success: true, data: logs });
});

// Get user activity
router.get('/user/:userId', async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const { from, to } = req.query;
  
  const logs = await AuditLog.getUserActivity(req.params.userId, { from, to });
  
  res.json({ success: true, data: logs });
});

// Get recent activity
router.get('/recent', async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const { limit = 20 } = req.query;
  
  const logs = await AuditLog.getRecentActivity(req.companyId, parseInt(limit));
  
  res.json({ success: true, data: logs });
});

module.exports = router;
