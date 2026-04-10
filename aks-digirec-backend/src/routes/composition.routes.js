const express = require('express');
const router = express.Router();
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// Composition routes
router.get('/compositions', hasPermission('production.view'), async (req, res) => {
  const Composition = require('../models/Composition');
  const { type } = req.query;
  const query = { companyId: req.companyId, isActive: true };
  if (type) query.type = type;
  
  const compositions = await Composition.find(query)
    .populate('items.material', 'name code')
    .populate('outputUnit', 'symbol');
  
  res.json({ success: true, data: compositions });
});

router.post('/compositions', hasPermission('production.create'), async (req, res) => {
  const Composition = require('../models/Composition');
  const composition = await Composition.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Composition created', data: composition });
});

router.get('/compositions/:id', hasPermission('production.view'), async (req, res) => {
  const Composition = require('../models/Composition');
  const composition = await Composition.findOne({ _id: req.params.id, companyId: req.companyId })
    .populate('items.material', 'name code unit')
    .populate('outputUnit', 'symbol');
  if (!composition) return res.status(404).json({ success: false, message: 'Composition not found' });
  res.json({ success: true, data: composition });
});

// Ball Mill routes
router.get('/ball-mills', hasPermission('production.view'), async (req, res) => {
  const BallMill = require('../models/BallMill');
  const mills = await BallMill.find({ companyId: req.companyId, isActive: true });
  res.json({ success: true, data: mills });
});

router.post('/ball-mills', hasPermission('production.create'), async (req, res) => {
  const BallMill = require('../models/BallMill');
  const mill = await BallMill.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Ball mill created', data: mill });
});

// Ball Mill Batch routes
router.get('/batches', hasPermission('production.view'), async (req, res) => {
  const BallMillBatch = require('../models/BallMillBatch');
  const { ballMill, status } = req.query;
  
  const query = { companyId: req.companyId };
  if (ballMill) query.ballMill = ballMill;
  if (status) query.status = status;
  
  const batches = await BallMillBatch.find(query)
    .populate('ballMill', 'name code')
    .populate('composition', 'name')
    .sort({ batchDate: -1 });
  
  res.json({ success: true, data: batches });
});

router.post('/batches', hasPermission('production.create'), async (req, res) => {
  const BallMillBatch = require('../models/BallMillBatch');
  const batch = await BallMillBatch.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Batch created', data: batch });
});

router.put('/batches/:id/complete', hasPermission('production.edit'), async (req, res) => {
  const BallMillBatch = require('../models/BallMillBatch');
  const batch = await BallMillBatch.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { status: 'completed', 'processing.endTime': new Date() },
    { new: true }
  );
  if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
  res.json({ success: true, message: 'Batch completed', data: batch });
});

module.exports = router;
