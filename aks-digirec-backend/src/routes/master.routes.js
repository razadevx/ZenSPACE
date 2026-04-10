const express = require('express');
const router = express.Router();
const masterController = require('../controllers/master.controller');
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// ============ SECTIONS ============
router.get('/sections', hasPermission('master.view'), masterController.getSections);
router.post('/sections', hasPermission('master.create'), masterController.createSection);
router.get('/sections/:id', hasPermission('master.view'), masterController.getSection);
router.put('/sections/:id', hasPermission('master.edit'), masterController.updateSection);
router.delete('/sections/:id', hasPermission('master.delete'), masterController.deleteSection);

// ============ UNITS ============
router.get('/units', hasPermission('master.view'), masterController.getUnits);
router.post('/units', hasPermission('master.create'), masterController.createUnit);
router.put('/units/:id', hasPermission('master.edit'), masterController.updateUnit);
router.delete('/units/:id', hasPermission('master.delete'), masterController.deleteUnit);

// ============ MATERIAL TYPES ============
router.get('/material-types', hasPermission('master.view'), masterController.getMaterialTypes);
router.post('/material-types', hasPermission('master.create'), masterController.createMaterialType);
router.put('/material-types/:id', hasPermission('master.edit'), masterController.updateMaterialType);
router.delete('/material-types/:id', hasPermission('master.delete'), masterController.deleteMaterialType);

// ============ RAW MATERIALS ============
router.get('/raw-materials', hasPermission('inventory.view'), masterController.getRawMaterials);
router.post('/raw-materials', hasPermission('inventory.create'), masterController.createRawMaterial);
router.get('/raw-materials/:id', hasPermission('inventory.view'), masterController.getRawMaterial);
router.put('/raw-materials/:id', hasPermission('inventory.edit'), masterController.updateRawMaterial);
router.delete('/raw-materials/:id', hasPermission('inventory.delete'), masterController.deleteRawMaterial);

// ============ WORKERS ============
router.get('/workers', hasPermission('workers.view'), masterController.getWorkers);
router.post('/workers', hasPermission('workers.create'), masterController.createWorker);
router.get('/workers/:id', hasPermission('workers.view'), masterController.getWorker);
router.put('/workers/:id', hasPermission('workers.edit'), masterController.updateWorker);
router.delete('/workers/:id', hasPermission('workers.delete'), masterController.deleteWorker);

// ============ SUPPLIERS ============
router.get('/suppliers', hasPermission('master.view'), masterController.getSuppliers);
router.post('/suppliers', hasPermission('master.create'), masterController.createSupplier);
router.get('/suppliers/:id', hasPermission('master.view'), masterController.getSupplier);
router.put('/suppliers/:id', hasPermission('master.edit'), masterController.updateSupplier);
router.delete('/suppliers/:id', hasPermission('master.delete'), masterController.deleteSupplier);

// ============ CUSTOMERS ============
router.get('/customers', hasPermission('master.view'), masterController.getCustomers);
router.post('/customers', hasPermission('master.create'), masterController.createCustomer);
router.get('/customers/:id', hasPermission('master.view'), masterController.getCustomer);
router.put('/customers/:id', hasPermission('master.edit'), masterController.updateCustomer);
router.delete('/customers/:id', hasPermission('master.delete'), masterController.deleteCustomer);

// ============ FINISHED GOODS ============
router.get('/finished-goods', hasPermission('inventory.view'), masterController.getFinishedGoods);
router.post('/finished-goods', hasPermission('inventory.create'), masterController.createFinishedGood);
router.get('/finished-goods/:id', hasPermission('inventory.view'), masterController.getFinishedGood);
router.put('/finished-goods/:id', hasPermission('inventory.edit'), masterController.updateFinishedGood);
router.delete('/finished-goods/:id', hasPermission('inventory.delete'), masterController.deleteFinishedGood);

module.exports = router;
