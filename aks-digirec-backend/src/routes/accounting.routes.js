const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accounting.controller');
const { protect, companyIsolation, hasPermission } = require('../middleware/auth');

router.use(protect);
router.use(companyIsolation);

// ============ ACCOUNT GROUPS ============
router.get('/account-groups', hasPermission('accounting.view'), accountingController.getAccountGroups);
router.post('/account-groups', hasPermission('accounting.create'), accountingController.createAccountGroup);
router.put('/account-groups/:id', hasPermission('accounting.edit'), accountingController.updateAccountGroup);

// ============ LEDGER ACCOUNTS ============
router.get('/ledger-accounts', hasPermission('accounting.view'), accountingController.getLedgerAccounts);
router.post('/ledger-accounts', hasPermission('accounting.create'), accountingController.createLedgerAccount);
router.get('/ledger-accounts/:id', hasPermission('accounting.view'), accountingController.getLedgerAccount);
router.get('/ledger-accounts/:id/entries', hasPermission('accounting.view'), accountingController.getAccountLedger);
router.put('/ledger-accounts/:id', hasPermission('accounting.edit'), accountingController.updateLedgerAccount);
router.delete('/ledger-accounts/:id', hasPermission('accounting.delete'), accountingController.deleteLedgerAccount);

// ============ CHART OF ACCOUNTS ============
router.get('/chart-of-accounts', hasPermission('accounting.view'), accountingController.getChartOfAccounts);

// ============ FISCAL YEARS ============
router.get('/fiscal-years', hasPermission('accounting.view'), accountingController.getFiscalYears);
router.get('/fiscal-years/current', hasPermission('accounting.view'), accountingController.getCurrentFiscalYear);
router.post('/fiscal-years', hasPermission('accounting.create'), accountingController.createFiscalYear);

// ============ TRANSACTIONS ============
router.get('/transactions', hasPermission('accounting.view'), accountingController.getTransactions);
router.post('/transactions', hasPermission('accounting.create'), accountingController.createTransaction);
router.get('/transactions/:id', hasPermission('accounting.view'), accountingController.getTransaction);
router.post('/transactions/:id/post', hasPermission('accounting.edit'), accountingController.postTransaction);
router.post('/transactions/:id/reverse', hasPermission('accounting.edit'), accountingController.reverseTransaction);

// ============ TRIAL BALANCE ============
router.get('/trial-balance', hasPermission('accounting.view'), accountingController.getTrialBalance);

module.exports = router;
