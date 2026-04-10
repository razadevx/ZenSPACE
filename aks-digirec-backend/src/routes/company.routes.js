const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { protect, companyIsolation, authorize } = require('../middleware/auth');

router.use(protect);

// Super Admin routes
router.get('/', authorize('super_admin'), companyController.getCompanies);
router.post('/', authorize('super_admin'), companyController.createCompany);
router.put('/:id/subscription', authorize('super_admin'), companyController.updateSubscription);
router.delete('/:id', authorize('super_admin'), companyController.deleteCompany);

// Company routes (Admin or own company)
router.get('/my', companyIsolation, companyController.getMyCompany);
router.get('/:id', companyIsolation, companyController.getCompany);
router.put('/:id', companyIsolation, companyController.updateCompany);
router.put('/settings/my', companyIsolation, companyController.updateSettings);

module.exports = router;
