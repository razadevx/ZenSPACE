const express = require('express');
const router = express.Router();
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Stock Ledger routes
router.get('/stock-ledger', hasPermission('inventory.view'), async (req, res) => {
  const StockLedger = require('../models/StockLedger');
  const { itemType, itemId, from, to, page = 1, limit = 50 } = req.query;
  
  const query = { companyId: req.companyId };
  if (itemType) query.itemType = itemType;
  if (itemId) query.itemId = itemId;
  if (from || to) {
    query.movementDate = {};
    if (from) query.movementDate.$gte = new Date(from);
    if (to) query.movementDate.$lte = new Date(to);
  }
  
  const entries = await StockLedger.find(query)
    .populate('itemId', 'name code')
    .populate('unit', 'symbol')
    .sort({ movementDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await StockLedger.countDocuments(query);
  
  res.json({
    success: true,
    data: entries,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

// Stock Balance routes
router.get('/stock-balance/:itemType/:itemId', hasPermission('inventory.view'), async (req, res) => {
  const StockLedger = require('../models/StockLedger');
  const { itemType, itemId } = req.params;
  
  const balance = await StockLedger.getCurrentStock(req.companyId, itemType, itemId);
  
  res.json({
    success: true,
    data: balance
  });
});

// Processed Stock routes
router.get('/processed-stock', hasPermission('inventory.view'), async (req, res) => {
  const ProcessedStock = require('../models/ProcessedStock');
  const { type } = req.query;
  
  const query = { companyId: req.companyId, isActive: true };
  if (type) query.type = type;
  
  const stocks = await ProcessedStock.find(query).sort({ name: 1 });
  res.json({ success: true, data: stocks });
});

router.post('/processed-stock', hasPermission('inventory.create'), async (req, res) => {
  const ProcessedStock = require('../models/ProcessedStock');
  const stock = await ProcessedStock.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Processed stock created', data: stock });
});

module.exports = router;
