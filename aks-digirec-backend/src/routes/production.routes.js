const express = require('express');
const router = express.Router();
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');
const productionController = require('../controllers/production.controller');

router.use(protect);
router.use(companyIsolation);

// Production Batch routes
router.get('/batches', hasPermission('production.view'), productionController.getBatches);
router.post('/batches', hasPermission('production.create'), productionController.createBatch);
router.get('/batches/:id', hasPermission('production.view'), productionController.getBatchById);
router.put('/batches/:id/start', hasPermission('production.edit'), productionController.startBatch);
router.put('/batches/:id/stage/:stageNumber', hasPermission('production.edit'), productionController.updateStage);
router.put('/batches/:id/complete', hasPermission('production.edit'), productionController.completeBatch);

// Production stages/pipeline
router.get('/stages', hasPermission('production.view'), productionController.getProductionStages);

// Production statistics
router.get('/stats', hasPermission('production.view'), productionController.getProductionStats);

module.exports = router;
