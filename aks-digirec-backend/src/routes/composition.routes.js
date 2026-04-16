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
    .populate('items.material', 'name code unit')
    .populate('outputUnit', 'symbol name')
    .populate('finishedGood', 'name code');
  
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
  const mills = await BallMill.find({ companyId: req.companyId, isActive: true })
    .populate('currentBatch', 'batchNumber status');
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
    .populate('ballMill', 'name code specifications operationalStatus')
    .populate('composition', 'name code type')
    .populate('output.processedStock', 'name code currentStock')
    .sort({ batchDate: -1 });
  
  res.json({ success: true, data: batches });
});

router.post('/batches', hasPermission('production.create'), async (req, res) => {
  const BallMillBatch = require('../models/BallMillBatch');
  const BallMill = require('../models/BallMill');
  
  try {
    // Set the initial status to 'preparing' and record start time
    const batchData = {
      ...req.body,
      companyId: req.companyId,
      createdBy: req.user._id,
      status: 'preparing',
      processing: {
        ...req.body.processing,
        startTime: new Date()
      },
      inputs: req.body.inputs || [],
      totalInput: { quantity: 0, cost: 0 },
      output: { quantity: 0 },
      cost: { materialCost: 0, labourCost: 0, overheadCost: 0, totalCost: 0, costPerUnit: 0 },
      wastage: { quantity: 0, percentage: 0 },
      batchNumber: `BMB${Date.now().toString(36).toUpperCase()}`
    };
    
    const batch = new BallMillBatch(batchData);
    await batch.save();
    
    // Update ball mill with current batch reference
    await BallMill.findByIdAndUpdate(
      req.body.ballMill,
      { currentBatch: batch._id }
    );
    
    // Populate the batch data before returning
    const populatedBatch = await BallMillBatch.findById(batch._id)
      .populate('ballMill', 'name code specifications')
      .populate('composition', 'name code type');
    
    res.status(201).json({ success: true, message: 'Batch created and started', data: populatedBatch });
  } catch (error) {
    console.error('=== BATCH CREATION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/batches/:id/complete', hasPermission('production.edit'), async (req, res) => {
  const BallMillBatch = require('../models/BallMillBatch');
  const ProcessedStock = require('../models/ProcessedStock');
  const Unit = require('../models/Unit');
  
  try {
    const { output, qualityTest } = req.body;
    
    // Find and update the batch
    const batch = await BallMillBatch.findOne({
      _id: req.params.id,
      companyId: req.companyId
    }).populate('composition');
    
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }
    
    // Update batch with completion data
    batch.status = 'completed';
    batch.processing.endTime = new Date();
    
    if (output) {
      batch.output.quantity = output.quantity;
      batch.output.tankNumber = output.tankNumber || '';
    }
    
    if (qualityTest) {
      batch.qualityTest = {
        ...batch.qualityTest,
        ...qualityTest,
        testedAt: new Date(),
        testedBy: req.user._id,
        status: 'pass'
      };
    }
    
    await batch.save();
    
    // Create or update ProcessedStock
    if (output && output.quantity > 0 && batch.composition) {
      const composition = batch.composition;
      const processedStockCode = `PS-${composition.code}`;
      
      // Find existing processed stock or create new
      let processedStock = await ProcessedStock.findOne({
        companyId: req.companyId,
        code: processedStockCode
      });
      
      const batchData = {
        batchNumber: batch.batchNumber,
        ballMillBatch: batch._id,
        quantity: output.quantity,
        cost: batch.cost?.totalCost || 0,
        producedDate: new Date(),
        status: 'active'
      };
      
      if (processedStock) {
        // Add batch to existing processed stock
        processedStock.batches.push(batchData);
        processedStock.currentStock.quantity += output.quantity;
        processedStock.currentStock.value += (batch.cost?.totalCost || 0);
        processedStock.currentStock.lastUpdated = new Date();
        processedStock.usage.totalProduced += output.quantity;
        
        // Update cost
        if (processedStock.currentStock.quantity > 0) {
          processedStock.costing.averageCost = processedStock.currentStock.value / processedStock.currentStock.quantity;
        }
        processedStock.costing.lastBatchCost = output.quantity > 0 ? (batch.cost?.totalCost || 0) / output.quantity : 0;
        
        await processedStock.save();
      } else {
        // Get default unit (kg)
        const defaultUnit = await Unit.findOne({ symbol: 'kg', companyId: req.companyId });
        
        // Create new processed stock
        processedStock = new ProcessedStock({
          companyId: req.companyId,
          code: processedStockCode,
          name: {
            en: composition.name?.en || composition.name,
            ur: composition.name?.ur || ''
          },
          description: {
            en: `Processed stock from composition: ${composition.name?.en || composition.name}`,
            ur: ''
          },
          type: composition.type === 'body' ? 'ball_mill_slip' : 
                composition.type === 'glaze' ? 'glaze' : 
                composition.type === 'engobe' ? 'body' : 'other',
          composition: composition._id,
          unit: defaultUnit?._id || null,
          currentStock: {
            quantity: output.quantity,
            value: batch.cost?.totalCost || 0,
            lastUpdated: new Date()
          },
          costing: {
            averageCost: output.quantity > 0 ? (batch.cost?.totalCost || 0) / output.quantity : 0,
            lastBatchCost: output.quantity > 0 ? (batch.cost?.totalCost || 0) / output.quantity : 0
          },
          batches: [batchData],
          usage: {
            totalProduced: output.quantity,
            totalConsumed: 0,
            lastUsed: null
          },
          isActive: true,
          createdBy: req.user._id
        });
        
        await processedStock.save();
      }
      
      // Update batch with processed stock reference
      batch.output.processedStock = processedStock._id;
      await batch.save();
    }
    
    res.json({ success: true, message: 'Batch completed', data: batch });
  } catch (error) {
    console.error('=== BATCH COMPLETION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
