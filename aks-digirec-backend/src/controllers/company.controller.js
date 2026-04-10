const { Company, AccountGroup, LedgerAccount, Unit, MaterialType, Dictionary } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// @desc    Get all companies (Super Admin only)
// @route   GET /api/companies
// @access  Private (Super Admin)
exports.getCompanies = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, search, status } = req.query;
  
  const query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { 'contactInfo.email': { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status) query.status = status;
  
  const companies = await Company.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await Company.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: companies,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
});

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private
exports.getCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.params.id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check access
  if (req.user.role?.name !== 'super_admin' && company._id.toString() !== req.companyId) {
    return next(new AppError('Not authorized to access this company', 403));
  }
  
  res.status(200).json({
    success: true,
    data: company
  });
});

// @desc    Get my company
// @route   GET /api/companies/my
// @access  Private
exports.getMyCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.companyId);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  res.status(200).json({
    success: true,
    data: company
  });
});

// @desc    Create company (Super Admin only)
// @route   POST /api/companies
// @access  Private (Super Admin)
exports.createCompany = asyncHandler(async (req, res, next) => {
  const { name, businessName, contactInfo, address, settings } = req.body;
  
  const company = await Company.create({
    name,
    businessName,
    contactInfo,
    address,
    settings,
    status: 'active',
    createdBy: req.user._id
  });
  
  // Initialize default data for the company
  await initializeCompanyData(company._id, req.user._id);
  
  logger.info(`Company created: ${name} by ${req.user.email}`);
  
  res.status(201).json({
    success: true,
    message: 'Company created successfully',
    data: company
  });
});

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private (Admin)
exports.updateCompany = asyncHandler(async (req, res, next) => {
  const { name, businessName, contactInfo, address, settings, theme, language } = req.body;
  
  let company = await Company.findById(req.params.id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  // Check access
  if (req.user.role?.name !== 'super_admin' && company._id.toString() !== req.companyId) {
    return next(new AppError('Not authorized to update this company', 403));
  }
  
  company = await Company.findByIdAndUpdate(
    req.params.id,
    {
      name,
      businessName,
      contactInfo,
      address,
      settings,
      theme,
      language,
      updatedBy: req.user._id
    },
    { new: true, runValidators: true }
  );
  
  logger.info(`Company updated: ${company.name} by ${req.user.email}`);
  
  res.status(200).json({
    success: true,
    message: 'Company updated successfully',
    data: company
  });
});

// @desc    Update company settings
// @route   PUT /api/companies/settings
// @access  Private (Admin)
exports.updateSettings = asyncHandler(async (req, res, next) => {
  const { settings } = req.body;
  
  const company = await Company.findByIdAndUpdate(
    req.companyId,
    {
      settings,
      updatedBy: req.user._id
    },
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    data: company.settings
  });
});

// @desc    Delete company (Super Admin only)
// @route   DELETE /api/companies/:id
// @access  Private (Super Admin)
exports.deleteCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.params.id);
  
  if (!company) {
    return next(new AppError('Company not found', 404));
  }
  
  await company.deleteOne();
  
  logger.info(`Company deleted: ${company.name} by ${req.user.email}`);
  
  res.status(200).json({
    success: true,
    message: 'Company deleted successfully'
  });
});

// @desc    Update subscription (Super Admin only)
// @route   PUT /api/companies/:id/subscription
// @access  Private (Super Admin)
exports.updateSubscription = asyncHandler(async (req, res, next) => {
  const { plan, maxUsers, maxStorage, expiresAt } = req.body;
  
  const company = await Company.findByIdAndUpdate(
    req.params.id,
    {
      'subscription.plan': plan,
      'subscription.maxUsers': maxUsers,
      'subscription.maxStorage': maxStorage,
      'subscription.expiresAt': expiresAt,
      status: plan === 'trial' ? 'trial' : 'active'
    },
    { new: true }
  );
  
  res.status(200).json({
    success: true,
    message: 'Subscription updated successfully',
    data: company.subscription
  });
});

// Helper function to initialize company data
async function initializeCompanyData(companyId, userId) {
  try {
    // Create default account groups
    const accountGroups = AccountGroup.getDefaultGroups(companyId);
    await AccountGroup.insertMany(accountGroups);
    
    // Create default ledger accounts
    const createdGroups = await AccountGroup.find({ companyId });
    const ledgerAccounts = LedgerAccount.getDefaultAccounts(companyId, createdGroups);
    await LedgerAccount.insertMany(ledgerAccounts);
    
    // Create default units
    const units = Unit.getDefaultUnits(companyId);
    await Unit.insertMany(units);
    
    // Create default material types
    const materialTypes = MaterialType.getDefaultTypes(companyId);
    await MaterialType.insertMany(materialTypes);
    
    // Seed dictionary
    await Dictionary.seedDefaults(companyId);
    
    logger.info(`Company data initialized for: ${companyId}`);
  } catch (error) {
    logger.error(`Error initializing company data: ${error.message}`);
    throw error;
  }
}
