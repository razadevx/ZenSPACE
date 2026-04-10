const express = require('express');
const router = express.Router();
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Production Batch routes
router.get('/batches', hasPermission('production.view'), async (req, res) => {
  const ProductionBatch = require('../models/ProductionBatch');
  const { finishedGood, status, from, to, page = 1, limit = 50 } = req.query;
  
  const query = { companyId: req.companyId };
  if (finishedGood) query.finishedGood = finishedGood;
  if (status) query.status = status;
  if (from || to) {
    query.productionDate = {};
    if (from) query.productionDate.$gte = new Date(from);
    if (to) query.productionDate.$lte = new Date(to);
  }
  
  const batches = await ProductionBatch.find(query)
    .populate('finishedGood', 'name code')
    .populate('stages.stage', 'name code')
    .sort({ productionDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await ProductionBatch.countDocuments(query);
  
  res.json({
    success: true,
    data: batches,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

router.post('/batches', hasPermission('production.create'), async (req, res) => {
  const ProductionBatch = require('../models/ProductionBatch');
  const batch = await ProductionBatch.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Production batch created', data: batch });
});

router.get('/batches/:id', hasPermission('production.view'), async (req, res) => {
  const ProductionBatch = require('../models/ProductionBatch');
  const batch = await ProductionBatch.findOne({ _id: req.params.id, companyId: req.companyId })
    .populate('finishedGood', 'name code variants')
    .populate('stages.stage', 'name code')
    .populate('stages.workers', 'firstName lastName')
    .populate('materialsConsumed.material', 'name code');
  
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  res.json({ success: true, data: batch });
});

router.put('/batches/:id/start', hasPermission('production.edit'), async (req, res) => {
  const ProductionBatch = require('../models/ProductionBatch');
  const batch = await ProductionBatch.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { status: 'in_progress', startedAt: new Date() },
    { new: true }
  );
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  res.json({ success: true, message: 'Production started', data: batch });
});

router.put('/batches/:id/stage/:stageNumber', hasPermission('production.edit'), async (req, res) => {
  const ProductionBatch = require('../models/ProductionBatch');
  const { outputQuantity, rejectedQuantity, workers } = req.body;
  
  const batch = await ProductionBatch.findOne({ _id: req.params.id, companyId: req.companyId });
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  
  const stage = batch.stages.find(s => s.stageNumber === parseInt(req.params.stageNumber));
  if (!stage) return res.status(404).json({ success: false, message: 'Stage not found' });
  
  stage.status = 'completed';
  stage.outputQuantity = outputQuantity;
  stage.rejectedQuantity = rejectedQuantity;
  stage.workers = workers;
  stage.endTime = new Date();
  
  // Update next stage
  const nextStage = batch.stages.find(s => s.stageNumber === parseInt(req.params.stageNumber) + 1);
  if (nextStage) {
    nextStage.status = 'in_progress';
    nextStage.startTime = new Date();
    nextStage.inputQuantity = outputQuantity;
  }
  
  batch.currentStage = parseInt(req.params.stageNumber);
  await batch.save();
  
  res.json({ success: true, message: 'Stage updated', data: batch });
});

router.put('/batches/:id/complete', hasPermission('production.edit'), async (req, res) => {
  const ProductionBatch = require('../models/ProductionBatch');
  const { actualOutput } = req.body;
  
  const batch = await ProductionBatch.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { 
      status: 'completed', 
      completedAt: new Date(),
      actualOutput
    },
    { new: true }
  );
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  res.json({ success: true, message: 'Production completed', data: batch });
});

module.exports = router;
