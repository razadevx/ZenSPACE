const express = require('express');
const { protect } = require('../middleware/auth');
const {
  sectionController,
  rawMaterialController,
  supplierController,
  workerController,
  customerController,
  finishedGoodController
} = require('../controllers/master.controller');

const router = express.Router();

// All routes are protected
router.use(protect);

// ========== SECTIONS ==========
router.get('/sections', sectionController.getAll);
router.get('/sections/search', sectionController.search);
router.get('/sections/:id', sectionController.getById);
router.post('/sections', sectionController.create);
router.put('/sections/:id', sectionController.update);
router.delete('/sections/:id', sectionController.delete);

// ========== RAW MATERIALS ==========
router.get('/raw-materials', rawMaterialController.getAll);
router.get('/raw-materials/search', rawMaterialController.search);
router.get('/raw-materials/low-stock', rawMaterialController.getLowStock);
router.get('/raw-materials/:id', rawMaterialController.getById);
router.post('/raw-materials', rawMaterialController.create);
router.put('/raw-materials/:id', rawMaterialController.update);
router.delete('/raw-materials/:id', rawMaterialController.delete);

// ========== SUPPLIERS ==========
router.get('/suppliers', supplierController.getAll);
router.get('/suppliers/search', supplierController.search);
router.get('/suppliers/:id', supplierController.getById);
router.get('/suppliers/:id/ledger', supplierController.getLedger);
router.post('/suppliers', supplierController.create);
router.put('/suppliers/:id', supplierController.update);
router.delete('/suppliers/:id', supplierController.delete);

// ========== WORKERS ==========
router.get('/workers', workerController.getAll);
router.get('/workers/search', workerController.search);
router.get('/workers/active', workerController.getActive);
router.get('/workers/by-section', workerController.getBySection);
router.get('/workers/:id', workerController.getById);
router.post('/workers', workerController.create);
router.put('/workers/:id', workerController.update);
router.delete('/workers/:id', workerController.delete);

// ========== CUSTOMERS ==========
router.get('/customers', customerController.getAll);
router.get('/customers/search', customerController.search);
router.get('/customers/:id', customerController.getById);
router.get('/customers/:id/ledger', customerController.getLedger);
router.get('/customers/:id/credit-check', customerController.checkCreditLimit);
router.post('/customers', customerController.create);
router.put('/customers/:id', customerController.update);
router.delete('/customers/:id', customerController.delete);

// ========== FINISHED GOODS ==========
router.get('/finished-goods', finishedGoodController.getAll);
router.get('/finished-goods/search', finishedGoodController.search);
router.get('/finished-goods/low-stock', finishedGoodController.getLowStock);
router.get('/finished-goods/:id', finishedGoodController.getById);
router.post('/finished-goods', finishedGoodController.create);
router.put('/finished-goods/:id', finishedGoodController.update);
router.delete('/finished-goods/:id', finishedGoodController.delete);

module.exports = router;
