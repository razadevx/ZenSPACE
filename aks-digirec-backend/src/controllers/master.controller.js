const {
  Section, Unit, MaterialType, RawMaterial,
  Worker, Supplier, Customer, FinishedGood
} = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ============ SECTIONS ============

// Transform section for frontend (add status, flatten name)
const transformSection = (s) => {
  const doc = s && typeof s.toObject === 'function' ? s.toObject() : (s || {});
  return {
    ...doc,
    _id: doc._id,
    companyId: doc.companyId,
    code: doc.code,
    sectionGroup: doc.sectionGroup || doc.name?.en || '',
    mainSection: doc.mainSection || '',
    subSection: doc.subSection || '',
    isNonMaterial: doc.isNonMaterial || false,
    description: doc.description?.en || doc.description,
    status: doc.isActive !== false ? 'active' : 'inactive',
  };
};

exports.getSections = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, type } = req.query;
  const query = { isActive: true };
  if (req.companyId) query.companyId = req.companyId;

  if (type) query.type = type;
  if (search) {
    query.$or = [
      { 'name.en': { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { sectionGroup: { $regex: search, $options: 'i' } },
      { mainSection: { $regex: search, $options: 'i' } },
      { subSection: { $regex: search, $options: 'i' } }
    ];
  }

  const sections = await Section.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await Section.countDocuments(query);
  const transformed = sections.map((s) => transformSection(s));

  res.status(200).json({
    success: true,
    data: transformed,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getSection = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const section = await Section.findOne(q);
  if (!section) return next(new AppError('Section not found', 404));
  res.status(200).json({ success: true, data: transformSection(section) });
});

exports.createSection = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id,
    sectionGroup: req.body.sectionGroup,
    mainSection: req.body.mainSection,
    subSection: req.body.subSection,
    isNonMaterial: req.body.isNonMaterial || false,
    name: req.body.mainSection ? { en: req.body.mainSection } : { en: req.body.subSection || 'Section' }
  };
  if (!payload.code) payload.code = `SEC${Date.now().toString(36).toUpperCase()}`;
  const section = await Section.create(payload);
  logger.info(`Section created: ${section.code} by ${req.user.email}`);
  res.status(201).json({ success: true, message: 'Section created successfully', data: transformSection(section) });
});

exports.updateSection = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const section = await Section.findOneAndUpdate(
    q,
    { ...req.body, sectionGroup: req.body.sectionGroup, mainSection: req.body.mainSection, subSection: req.body.subSection, isNonMaterial: req.body.isNonMaterial, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!section) return next(new AppError('Section not found', 404));
  res.status(200).json({ success: true, message: 'Section updated successfully', data: transformSection(section) });
});

exports.deleteSection = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const section = await Section.findOneAndUpdate(
    q,
    { isActive: false, updatedBy: req.user._id },
    { new: true }
  );
  if (!section) return next(new AppError('Section not found', 404));
  res.status(200).json({ success: true, message: 'Section deleted successfully' });
});

// ============ UNITS ============

exports.getUnits = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const query = { companyId: req.companyId, isActive: true };
  if (type) query.type = type;

  const units = await Unit.find(query).sort({ type: 1, name: 1 });
  res.status(200).json({ success: true, data: units });
});

exports.createUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Unit created successfully', data: unit });
});

exports.updateUnit = asyncHandler(async (req, res, next) => {
  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!unit) return next(new AppError('Unit not found', 404));
  res.status(200).json({ success: true, message: 'Unit updated successfully', data: unit });
});

exports.deleteUnit = asyncHandler(async (req, res, next) => {
  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { isActive: false, updatedBy: req.user._id },
    { new: true }
  );
  if (!unit) return next(new AppError('Unit not found', 404));
  res.status(200).json({ success: true, message: 'Unit deleted successfully' });
});

// ============ MATERIAL TYPES ============

exports.getMaterialTypes = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const query = { companyId: req.companyId, isActive: true };
  if (category) query.category = category;

  const types = await MaterialType.find(query).sort({ category: 1, name: 1 });
  res.status(200).json({ success: true, data: types });
});

exports.createMaterialType = asyncHandler(async (req, res) => {
  const type = await MaterialType.create({
    ...req.body,
    companyId: req.companyId,
    createdBy: req.user._id
  });
  res.status(201).json({ success: true, message: 'Material type created successfully', data: type });
});

exports.updateMaterialType = asyncHandler(async (req, res, next) => {
  const type = await MaterialType.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!type) return next(new AppError('Material type not found', 404));
  res.status(200).json({ success: true, message: 'Material type updated successfully', data: type });
});

exports.deleteMaterialType = asyncHandler(async (req, res, next) => {
  const type = await MaterialType.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { isActive: false, updatedBy: req.user._id },
    { new: true }
  );
  if (!type) return next(new AppError('Material type not found', 404));
  res.status(200).json({ success: true, message: 'Material type deleted successfully' });
});

// ============ RAW MATERIALS ============

// Transform raw material for frontend
const transformRawMaterial = (m) => {
  const doc = m && typeof m.toObject === 'function' ? m.toObject() : (m || {});
  return {
    ...doc,
    _id: doc._id,
    companyId: doc.companyId,
    name: doc.name?.en || doc.name || '',
    code: doc.code || '',
    materialType: doc.materialType?.name?.en || doc.materialType?.name || doc.materialType || '',
    unit: doc.unit?.symbol || doc.unit?.name || doc.unit || '',
    stock: doc.currentStock?.quantity ?? doc.stock ?? 0,
    amount: doc.currentStock?.value ?? doc.amount ?? 0,
    rate: doc.costing?.averageCost ?? doc.costing?.standardCost ?? doc.rate ?? 0,
    minStock: doc.inventory?.minLevel ?? doc.minStock ?? 0,
    maxStock: doc.inventory?.maxLevel ?? doc.maxStock ?? 0,
    status: doc.isActive !== false ? 'active' : 'inactive',
  };
};

// Convert frontend format to backend format for raw material
const prepareRawMaterialPayload = async (data, companyId) => {
  const payload = {};

  if (!companyId) {
    throw new Error('Company ID is required to create raw material');
  }

  // Convert materialType string to ObjectId
  if (data.materialType && typeof data.materialType === 'string') {
    const mtStr = data.materialType.trim();

    // Build query with companyId
    const mtQuery = {
      companyId,
      isActive: true,
      $or: [
        { 'name.en': { $regex: new RegExp(`^${mtStr}$`, 'i') } },
        { code: mtStr.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') }
      ]
    };

    // Try exact match first
    let mt = await MaterialType.findOne(mtQuery);

    // If not found, try partial match
    if (!mt) {
      mt = await MaterialType.findOne({
        companyId,
        isActive: true,
        'name.en': { $regex: mtStr, $options: 'i' }
      });
    }

    if (mt) {
      payload.materialType = mt._id;
      logger.debug(`Found material type: ${mt.name.en} (${mt._id})`);
    } else {
      // List available material types for better error message
      const availableTypes = await MaterialType.find({ companyId, isActive: true })
        .select('name.en code')
        .limit(10)
        .lean();
      const typeList = availableTypes.map(t => t.name?.en || t.code).join(', ');
      throw new Error(`Material type "${data.materialType}" not found. Available types: ${typeList || 'None found'}`);
    }
  } else if (data.materialType) {
    payload.materialType = data.materialType; // Already an ObjectId
  }

  // Convert unit string to ObjectId
  if (data.unit && typeof data.unit === 'string') {
    // Normalize unit name (handle plurals, case, etc.)
    const unitStr = data.unit.trim();
    const unitLower = unitStr.toLowerCase();

    // Try exact match first
    let unit = await Unit.findOne({
      companyId,
      isActive: true,
      $or: [
        { symbol: { $regex: new RegExp(`^${unitStr}$`, 'i') } },
        { 'name.en': { $regex: new RegExp(`^${unitStr}$`, 'i') } },
        { code: unitStr.toUpperCase().replace(/\s+/g, '_') }
      ]
    });

    // If not found, try singular/plural variations
    if (!unit) {
      const singular = unitLower.replace(/s$/, ''); // Remove trailing 's'
      const plural = unitLower + 's';

      unit = await Unit.findOne({
        companyId,
        isActive: true,
        $or: [
          { symbol: { $regex: new RegExp(`^${singular}$|^${plural}$`, 'i') } },
          { 'name.en': { $regex: new RegExp(`^${singular}$|^${plural}$`, 'i') } },
          { symbol: { $regex: unitLower, $options: 'i' } },
          { 'name.en': { $regex: unitLower, $options: 'i' } }
        ]
      });
    }

    // Special mappings for common cases
    if (!unit) {
      const unitMappings = {
        'kg': 'kg',
        'kilograms': 'kg',
        'kilogram': 'kg',
        'liters': 'L',
        'litre': 'L',
        'litres': 'L',
        'l': 'L',
        'pieces': 'pcs',
        'piece': 'pcs',
        'pcs': 'pcs',
        'bags': 'box',
        'bag': 'box',
        'boxes': 'box',
        'box': 'box'
      };

      const mappedSymbol = unitMappings[unitLower];
      if (mappedSymbol) {
        unit = await Unit.findOne({
          companyId,
          isActive: true,
          symbol: { $regex: new RegExp(`^${mappedSymbol}$`, 'i') }
        });
      }
    }

    if (unit) {
      payload.unit = unit._id;
      logger.debug(`Found unit: ${unit.symbol || unit.name?.en} (${unit._id})`);
    } else {
      // List available units for better error message
      const availableUnits = await Unit.find({ companyId, isActive: true })
        .select('symbol name.en code')
        .limit(10)
        .lean();
      const unitList = availableUnits.map(u => u.symbol || u.name?.en || u.code).join(', ');
      throw new Error(`Unit "${data.unit}" not found. Available units: ${unitList || 'None found'}`);
    }
  } else if (data.unit) {
    payload.unit = data.unit; // Already an ObjectId
  }

  // Convert flat name to nested structure
  if (data.name && typeof data.name === 'string') {
    payload.name = { en: data.name };
  } else if (data.name) {
    payload.name = data.name; // Already nested
  }

  // Auto-generate code if missing
  if (!data.code) {
    const nameStr = typeof data.name === 'string' ? data.name : (data.name?.en || '');
    if (nameStr) {
      // Generate code from name: take first 3 letters, make uppercase, remove non-alphanumeric
      const codePrefix = nameStr.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'RM';
      // Add timestamp suffix for uniqueness
      const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
      payload.code = `${codePrefix}${timestamp}`;
    } else {
      // Fallback if no name
      const timestamp = Date.now().toString(36).toUpperCase();
      payload.code = `RM${timestamp}`;
    }
    logger.debug(`Auto-generated code: ${payload.code}`);
  } else {
    payload.code = (data.code || '').trim().toUpperCase();
  }

  // Ensure code is not empty
  if (!payload.code) {
    throw new Error('Material code is required');
  }

  // Convert stock/amount to currentStock structure
  // Handle multiple field name variations
  const stock = data.stock ?? data.openingStock ?? data.quantity ?? 0;
  const amount = data.amount ?? data.totalAmount ?? data.value ?? 0;

  payload.currentStock = {
    quantity: parseFloat(stock) || 0,
    value: parseFloat(amount) || 0,
    lastUpdated: new Date()
  };

  // Calculate rate from amount and stock if not provided
  const rate = data.rate ?? (stock > 0 && amount > 0 ? parseFloat(amount) / parseFloat(stock) : 0);

  // Convert rate to costing structure
  payload.costing = {
    standardCost: rate,
    averageCost: rate,
    lastUpdated: new Date()
  };

  // Convert minStock/maxStock to inventory structure
  payload.inventory = {
    minLevel: data.minStock ?? 0,
    maxLevel: data.maxStock ?? 0
  };

  // Copy other fields
  if (data.details) payload.description = { en: data.details };
  if (data.specifications) payload.specifications = data.specifications;
  if (data.supplier) payload.supplier = data.supplier;
  if (data.location) payload.location = data.location;

  // Set defaults
  payload.isActive = data.isActive !== false;

  return payload;
};

exports.getRawMaterials = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, materialType, lowStock } = req.query;
  const query = { isActive: true };
  if (req.companyId) query.companyId = req.companyId;

  if (materialType) query.materialType = materialType;
  if (search) {
    query.$or = [
      { 'name.en': { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }

  const materials = await RawMaterial.find(query)
    .populate('materialType', 'name category')
    .populate('unit', 'symbol')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await RawMaterial.countDocuments(query);
  const transformed = materials.map((m) => transformRawMaterial(m));

  res.status(200).json({
    success: true,
    data: transformed,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getRawMaterial = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const material = await RawMaterial.findOne(q)
    .populate('materialType', 'name category')
    .populate('unit', 'symbol')
    .lean();
  if (!material) return next(new AppError('Raw material not found', 404));
  res.status(200).json({ success: true, data: transformRawMaterial(material) });
});

exports.createRawMaterial = asyncHandler(async (req, res) => {
  try {
    // Ensure companyId is set
    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Please ensure you are logged in and have selected a company.'
      });
    }

    logger.debug('Creating raw material with data:', {
      materialType: req.body.materialType,
      unit: req.body.unit,
      name: req.body.name,
      companyId: req.companyId
    });

    const payload = await prepareRawMaterialPayload(req.body, req.companyId);
    payload.companyId = req.companyId;
    payload.createdBy = req.user._id;

    logger.debug('Prepared payload:', {
      materialType: payload.materialType,
      unit: payload.unit,
      code: payload.code,
      hasName: !!payload.name
    });

    // Validate required fields
    if (!payload.materialType) {
      return res.status(400).json({
        success: false,
        message: 'Material type is required. Please select a valid material type.'
      });
    }
    if (!payload.unit) {
      return res.status(400).json({
        success: false,
        message: 'Unit is required. Please select a valid unit.'
      });
    }
    if (!payload.code) {
      return res.status(400).json({
        success: false,
        message: 'Material code is required.'
      });
    }

    const material = await RawMaterial.create(payload);
    const populated = await RawMaterial.findById(material._id)
      .populate('materialType', 'name category')
      .populate('unit', 'symbol')
      .lean();
    res.status(201).json({ success: true, message: 'Raw material created successfully', data: transformRawMaterial(populated) });
  } catch (error) {
    logger.error('Error creating raw material:', error);
    if (error.message && (error.message.includes('not found') || error.message.includes('required'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: `Validation error: ${messages}` });
    }
    throw error;
  }
});

exports.updateRawMaterial = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const payload = await prepareRawMaterialPayload(req.body, req.companyId);
  payload.updatedBy = req.user._id;
  const material = await RawMaterial.findOneAndUpdate(q, payload, { new: true, runValidators: true })
    .populate('materialType', 'name category')
    .populate('unit', 'symbol')
    .lean();
  if (!material) return next(new AppError('Raw material not found', 404));
  res.status(200).json({ success: true, message: 'Raw material updated successfully', data: transformRawMaterial(material) });
});

exports.deleteRawMaterial = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const material = await RawMaterial.findOneAndUpdate(q, { isActive: false, updatedBy: req.user._id }, { new: true });
  if (!material) return next(new AppError('Raw material not found', 404));
  res.status(200).json({ success: true, message: 'Raw material deleted successfully' });
});

// ============ WORKERS ============

// Transform worker for frontend
const transformWorker = (w) => {
  const doc = w && typeof w.toObject === 'function' ? w.toObject() : (w || {});
  return {
    ...doc,
    _id: doc._id,
    companyId: doc.companyId,
    name: doc.fullName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || doc.name || '',
    code: doc.code || '',
    advanceFixed: doc.currentBalance ?? doc.advanceFixed ?? 0,
    sectionGroup: doc.department?.sectionGroup || doc.department?.name?.en || doc.sectionGroup || '',
    workerType: doc.workerType || doc.wages?.type || '',
    fatherName: doc.fatherName || '',
    cnic: doc.cnic || '',
    cellNumber: doc.mobile || doc.phone || doc.cellNumber || '',
    joinDate: doc.joinDate,
    status: doc.status || (doc.isActive !== false ? 'active' : 'inactive'),
    wages: doc.wages || { type: 'monthly', amount: 0, currency: 'PKR' },
  };
};

// Convert frontend format to backend format for worker
const prepareWorkerPayload = async (data, companyId) => {
  const payload = {};

  if (!companyId) {
    throw new Error('Company ID is required to create worker');
  }

  // Map frontend workerType values to backend enum values
  const workerTypeMap = {
    'Per Piece': 'piece_rate',
    'Daily': 'daily_wage',
    'Weekly': 'contract',
    'Monthly': 'permanent',
    'Office': 'permanent',
    'Temporary': 'contract',
    'Other': 'contract',
    // Also handle backend enum values directly
    'permanent': 'permanent',
    'contract': 'contract',
    'daily_wage': 'daily_wage',
    'piece_rate': 'piece_rate'
  };

  // Map frontend workerType to wages.type enum values
  const wagesTypeMap = {
    'Per Piece': 'piece_rate',
    'Daily': 'daily',
    'Weekly': 'monthly', // Weekly workers typically paid monthly
    'Monthly': 'monthly',
    'Office': 'monthly',
    'Temporary': 'daily',
    'Other': 'monthly',
    // Also handle backend enum values directly
    'monthly': 'monthly',
    'daily': 'daily',
    'hourly': 'hourly',
    'piece_rate': 'piece_rate'
  };

  // Split name into firstName/lastName
  if (data.name && typeof data.name === 'string' && !data.firstName) {
    const parts = data.name.trim().split(/\s+/);
    payload.firstName = parts[0] || 'Worker';
    payload.lastName = parts.slice(1).join(' ') || 'User';
  } else {
    payload.firstName = data.firstName || 'Worker';
    payload.lastName = data.lastName || 'User';
  }

  // Auto-generate code if missing
  if (!data.code) {
    const nameStr = `${payload.firstName} ${payload.lastName}`.trim() || 'WRK';
    const codePrefix = nameStr.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'WRK';
    // Get count of existing workers for this company
    const count = await Worker.countDocuments({ companyId });
    payload.code = `${codePrefix}${String(count + 1).padStart(4, '0')}`;
    logger.debug(`Auto-generated worker code: ${payload.code}`);
  } else {
    payload.code = (data.code || '').trim().toUpperCase();
  }

  // Ensure code is not empty
  if (!payload.code) {
    throw new Error('Worker code is required');
  }

  // Convert workerType with proper enum mapping
  if (data.workerType) {
    const mappedWorkerType = workerTypeMap[data.workerType] || 'contract';
    payload.workerType = mappedWorkerType;

    // Use wages object from frontend if provided, otherwise map from workerType
    if (data.wages && data.wages.type && data.wages.amount) {
      payload.wages = {
        type: data.wages.type,
        amount: parseFloat(data.wages.amount) || 0,
        overtimeRate: data.wages.overtimeRate ? parseFloat(data.wages.overtimeRate) : undefined,
        currency: data.wages.currency || 'PKR'
      };
    } else {
      // Also set wages.type
      const mappedWagesType = wagesTypeMap[data.workerType] || 'monthly';
      payload.wages = {
        type: mappedWagesType,
        currency: 'PKR'
      };
    }
  } else {
    payload.workerType = 'contract'; // Default
    payload.wages = { type: 'monthly', currency: 'PKR' };
  }

  // Set designation (required field)
  payload.designation = data.designation || data.workerType || 'Worker';

  // Set joinDate (required field)
  payload.joinDate = data.joinDate ? new Date(data.joinDate) : new Date();

  // Convert advanceFixed to currentBalance
  if (data.advanceFixed !== undefined) {
    payload.currentBalance = parseFloat(data.advanceFixed) || 0;
  }

  // Map sectionGroup string to a Section ObjectId for 'department' field
  if (data.sectionGroup && companyId) {
    const section = await Section.findOne({
      companyId,
      sectionGroup: { $regex: new RegExp(`^${data.sectionGroup}$`, 'i') },
      isActive: true
    }).select('_id').lean();
    if (section) {
      payload.department = section._id;
    }
  } else if (data.department) {
    payload.department = data.department;
  }

  // Set other personal info fields
  if (data.fatherName) payload.fatherName = data.fatherName.trim();
  if (data.cnic) payload.cnic = data.cnic.trim();
  if (data.cellNumber) payload.mobile = data.cellNumber.trim();
  if (data.phone) payload.phone = data.phone.trim();
  if (data.email) payload.email = data.email.trim();

  // Convert address fields
  if (data.city || data.address) {
    payload.address = {
      city: (data.city || '').trim(),
      street: (data.address || '').trim()
    };
  }

  // Set status
  payload.status = data.status || 'active';
  payload.isActive = data.isActive !== false;

  // Copy other fields
  if (data.notes) payload.notes = data.notes;
  if (data.dateOfBirth) payload.dateOfBirth = new Date(data.dateOfBirth);
  if (data.gender) payload.gender = data.gender;

  return payload;
};

exports.getWorkers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, department, status, workerType } = req.query;
  const query = {};
  if (req.companyId) query.companyId = req.companyId;

  if (department) query.department = department;
  if (status) query.status = status;
  if (workerType) query.workerType = workerType;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { cnic: { $regex: search, $options: 'i' } }
    ];
  }

  const workers = await Worker.find(query)
    .populate('department', 'name code sectionGroup')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await Worker.countDocuments(query);
  const transformed = workers.map((w) => transformWorker(w));

  res.status(200).json({
    success: true,
    data: transformed,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getWorker = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const worker = await Worker.findOne(q).populate('department', 'name code sectionGroup').lean();
  if (!worker) return next(new AppError('Worker not found', 404));
  res.status(200).json({ success: true, data: transformWorker(worker) });
});

exports.createWorker = asyncHandler(async (req, res) => {
  try {
    // Ensure companyId is set
    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Please ensure you are logged in and have selected a company.'
      });
    }

    logger.debug('Creating worker with data:', {
      workerType: req.body.workerType,
      name: req.body.name,
      companyId: req.companyId
    });

    const payload = await prepareWorkerPayload(req.body, req.companyId);
    payload.companyId = req.companyId;
    payload.createdBy = req.user._id;

    logger.debug('Prepared payload:', {
      workerType: payload.workerType,
      wagesType: payload.wages?.type,
      code: payload.code,
      firstName: payload.firstName
    });

    // Validate required fields
    if (!payload.firstName || !payload.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Worker name is required.'
      });
    }
    if (!payload.code) {
      return res.status(400).json({
        success: false,
        message: 'Worker code is required.'
      });
    }
    if (!payload.workerType) {
      return res.status(400).json({
        success: false,
        message: 'Worker type is required.'
      });
    }
    if (!payload.designation) {
      payload.designation = 'Worker';
    }
    if (!payload.joinDate) {
      payload.joinDate = new Date();
    }

    const newWorker = await Worker.create(payload);
    const populated = await Worker.findById(newWorker._id).populate('department', 'name code sectionGroup').lean();
    res.status(201).json({ success: true, message: 'Worker created successfully', data: transformWorker(populated) });
  } catch (error) {
    logger.error('Error creating worker:', error);
    if (error.message && (error.message.includes('required') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: `Validation error: ${messages}` });
    }
    throw error;
  }
});

exports.updateWorker = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const payload = await prepareWorkerPayload(req.body, req.companyId);
  payload.updatedBy = req.user._id;
  const worker = await Worker.findOneAndUpdate(q, payload, { new: true, runValidators: true })
    .populate('department', 'name code sectionGroup')
    .lean();
  if (!worker) return next(new AppError('Worker not found', 404));
  res.status(200).json({ success: true, message: 'Worker updated successfully', data: transformWorker(worker) });
});

exports.deleteWorker = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const worker = await Worker.findOneAndUpdate(q, { isActive: false, status: 'terminated', updatedBy: req.user._id }, { new: true });
  if (!worker) return next(new AppError('Worker not found', 404));
  res.status(200).json({ success: true, message: 'Worker deleted successfully' });
});

// ============ SUPPLIERS ============

// Transform supplier for frontend
const transformSupplier = (s) => {
  const doc = s && typeof s.toObject === 'function' ? s.toObject() : (s || {});
  return {
    ...doc,
    _id: doc._id,
    companyId: doc.companyId,
    name: doc.businessName || doc.name || '',
    code: doc.code || '',
    supplierType: doc.type || doc.supplierType || '',
    contactPerson: doc.contactPerson?.name || doc.contactPerson || '',
    cellNumber: doc.contactPerson?.phone || doc.mobile || doc.phone || doc.cellNumber || '',
    email: doc.contactPerson?.email || doc.email || '',
    address: doc.address?.street || doc.address || '',
    city: doc.address?.city || doc.city || '',
    currentBalance: doc.currentBalance?.amount ?? doc.currentBalance ?? 0,
    paymentTerms: doc.creditTerms?.days ? `${doc.creditTerms.days} days` : doc.paymentTerms || '',
    status: doc.status || (doc.isActive !== false ? 'active' : 'inactive'),
  };
};

// Convert frontend format to backend format for supplier
const prepareSupplierPayload = async (data, companyId) => {
  const payload = {};

  if (!companyId) {
    throw new Error('Company ID is required to create supplier');
  }

  // Map frontend supplier types to backend enum values
  const supplierTypeMap = {
    'Raw Material': 'manufacturer',
    'Equipment': 'distributor',
    'Service': 'other',
    'Other': 'other',
    // Also handle backend enum values directly
    'manufacturer': 'manufacturer',
    'distributor': 'distributor',
    'wholesaler': 'wholesaler',
    'retailer': 'retailer',
    'importer': 'importer',
    'other': 'other'
  };

  // Convert supplierType to type with proper enum mapping
  if (data.supplierType) {
    const mappedType = supplierTypeMap[data.supplierType] || 'other';
    payload.type = mappedType;
  } else {
    payload.type = 'other'; // Default
  }

  // Convert name to businessName
  if (data.name && typeof data.name === 'string') {
    payload.businessName = data.name.trim();
  } else if (data.businessName) {
    payload.businessName = data.businessName.trim();
  }

  // Auto-generate code if missing
  if (!data.code) {
    const nameStr = payload.businessName || 'SUP';
    const codePrefix = nameStr.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SUP';
    // Get count of existing suppliers for this company
    const count = await Supplier.countDocuments({ companyId });
    payload.code = `${codePrefix}${String(count + 1).padStart(4, '0')}`;
    logger.debug(`Auto-generated supplier code: ${payload.code}`);
  } else {
    payload.code = (data.code || '').trim().toUpperCase();
  }

  // Ensure code is not empty
  if (!payload.code) {
    throw new Error('Supplier code is required');
  }

  // Convert contactPerson string to object
  if (data.contactPerson && typeof data.contactPerson === 'string') {
    payload.contactPerson = {
      name: data.contactPerson.trim(),
      phone: data.cellNumber || data.phone || '',
      email: data.email || ''
    };
  } else if (data.contactPerson && typeof data.contactPerson === 'object') {
    payload.contactPerson = data.contactPerson;
  }

  // Set phone/mobile/email fields
  if (data.cellNumber) payload.mobile = data.cellNumber.trim();
  if (data.phone) payload.phone = data.phone.trim();
  if (data.email) payload.email = data.email.trim();

  // Convert address fields
  if (data.address || data.city) {
    payload.address = {
      street: (data.address || '').trim(),
      city: (data.city || '').trim(),
      country: 'Pakistan'
    };
  }

  // Convert paymentTerms string to creditTerms
  if (data.paymentTerms && typeof data.paymentTerms === 'string') {
    if (data.paymentTerms.toLowerCase() === 'cash') {
      payload.creditTerms = { days: 0, limit: 0, currency: 'PKR' };
    } else {
      const daysMatch = data.paymentTerms.match(/(\d+)/);
      if (daysMatch) {
        payload.creditTerms = {
          days: parseInt(daysMatch[1]),
          limit: 0,
          currency: 'PKR'
        };
      } else {
        payload.creditTerms = { days: 0, limit: 0, currency: 'PKR' };
      }
    }
  }

  // Convert openingBalance to currentBalance
  if (data.openingBalance !== undefined) {
    payload.currentBalance = {
      amount: parseFloat(data.openingBalance) || 0,
      lastUpdated: new Date()
    };
  }

  // Set status
  payload.status = data.status || 'active';
  payload.isActive = data.isActive !== false;

  // Copy other fields
  if (data.notes) payload.notes = data.notes;
  if (data.website) payload.website = data.website;
  if (data.legalName) payload.legalName = data.legalName;

  return payload;
};

exports.getSuppliers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, type } = req.query;
  const query = { isActive: true };
  if (req.companyId) query.companyId = req.companyId;

  if (type) query.type = type;
  if (search) {
    query.$or = [
      { businessName: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { 'contactPerson.name': { $regex: search, $options: 'i' } }
    ];
  }

  const suppliers = await Supplier.find(query)
    .sort({ businessName: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await Supplier.countDocuments(query);
  const transformed = suppliers.map((s) => transformSupplier(s));

  res.status(200).json({
    success: true,
    data: transformed,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getSupplier = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const supplier = await Supplier.findOne(q).lean();
  if (!supplier) return next(new AppError('Supplier not found', 404));
  res.status(200).json({ success: true, data: transformSupplier(supplier) });
});

exports.createSupplier = asyncHandler(async (req, res) => {
  try {
    // Ensure companyId is set
    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Please ensure you are logged in and have selected a company.'
      });
    }

    logger.debug('Creating supplier with data:', {
      supplierType: req.body.supplierType,
      name: req.body.name,
      companyId: req.companyId
    });

    const payload = await prepareSupplierPayload(req.body, req.companyId);
    payload.companyId = req.companyId;
    payload.createdBy = req.user._id;

    logger.debug('Prepared payload:', {
      type: payload.type,
      code: payload.code,
      businessName: payload.businessName
    });

    // Validate required fields
    if (!payload.businessName) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required.'
      });
    }
    if (!payload.code) {
      return res.status(400).json({
        success: false,
        message: 'Supplier code is required.'
      });
    }
    if (!payload.type) {
      return res.status(400).json({
        success: false,
        message: 'Supplier type is required.'
      });
    }

    const supplier = await Supplier.create(payload);
    const doc = supplier.toObject ? supplier.toObject() : supplier;
    res.status(201).json({ success: true, message: 'Supplier created successfully', data: transformSupplier(doc) });
  } catch (error) {
    logger.error('Error creating supplier:', error);
    if (error.message && (error.message.includes('required') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: `Validation error: ${messages}` });
    }
    throw error;
  }
});

exports.updateSupplier = asyncHandler(async (req, res, next) => {
  try {
    const q = { _id: req.params.id };
    if (req.companyId) q.companyId = req.companyId;
    const payload = await prepareSupplierPayload(req.body, req.companyId);
    payload.updatedBy = req.user._id;
    const supplier = await Supplier.findOneAndUpdate(q, payload, { new: true, runValidators: true }).lean();
    if (!supplier) return next(new AppError('Supplier not found', 404));
    res.status(200).json({ success: true, message: 'Supplier updated successfully', data: transformSupplier(supplier) });
  } catch (error) {
    logger.error('Error updating supplier:', error);
    if (error.message && (error.message.includes('required') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: `Validation error: ${messages}` });
    }
    throw error;
  }
});

exports.deleteSupplier = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const supplier = await Supplier.findOneAndUpdate(q, { isActive: false, updatedBy: req.user._id }, { new: true });
  if (!supplier) return next(new AppError('Supplier not found', 404));
  res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
});

// ============ CUSTOMERS ============

// Transform customer for frontend
const transformCustomer = (c) => {
  const doc = c && typeof c.toObject === 'function' ? c.toObject() : (c || {});
  return {
    ...doc,
    _id: doc._id,
    companyId: doc.companyId,
    name: doc.name || doc.businessName || '',
    code: doc.code || '',
    customerType: doc.customerType || doc.category || '',
    contactPerson: doc.contactPersons?.[0]?.name || doc.contactPerson || '',
    cellNumber: doc.mobile || doc.phone || doc.contactPersons?.[0]?.phone || doc.cellNumber || '',
    currentBalance: doc.currentBalance?.amount ?? doc.currentBalance ?? 0,
    creditLimit: doc.creditTerms?.limit ?? doc.creditLimit ?? 0,
    status: doc.status || (doc.isActive !== false ? 'active' : 'inactive'),
  };
};

// Convert frontend format to backend format for customer
const prepareCustomerPayload = async (data, companyId) => {
  const payload = {};

  if (!companyId) {
    throw new Error('Company ID is required to create customer');
  }

  // Map frontend customer types to backend enum values
  const customerTypeMap = {
    'Retail': 'retailer',
    'Wholesale': 'distributor',
    'Corporate': 'business',
    'Export': 'business',
    'Other': 'individual',
    // Also handle backend enum values directly
    'individual': 'individual',
    'business': 'business',
    'distributor': 'distributor',
    'retailer': 'retailer'
  };

  // Convert customerType with proper enum mapping
  if (data.customerType) {
    const mappedType = customerTypeMap[data.customerType] || 'individual';
    payload.customerType = mappedType;
  } else {
    payload.customerType = 'individual'; // Default
  }

  // Convert name to both name and businessName
  if (data.name && typeof data.name === 'string') {
    payload.name = data.name.trim();
    if (!payload.businessName) payload.businessName = data.name.trim();
  } else if (data.businessName) {
    payload.name = data.businessName.trim();
    payload.businessName = data.businessName.trim();
  }

  // Auto-generate code if missing
  if (!data.code) {
    const nameStr = payload.name || 'CUS';
    const codePrefix = nameStr.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'CUS';
    // Get count of existing customers for this company
    const count = await Customer.countDocuments({ companyId });
    payload.code = `${codePrefix}${String(count + 1).padStart(4, '0')}`;
    logger.debug(`Auto-generated customer code: ${payload.code}`);
  } else {
    payload.code = (data.code || '').trim().toUpperCase();
  }

  // Ensure code is not empty
  if (!payload.code) {
    throw new Error('Customer code is required');
  }

  // Convert contactPerson string to array
  if (data.contactPerson && typeof data.contactPerson === 'string') {
    payload.contactPersons = [{
      name: data.contactPerson.trim(),
      phone: data.cellNumber || data.phone || '',
      email: data.email || '',
      isPrimary: true
    }];
  } else if (data.contactPersons && Array.isArray(data.contactPersons)) {
    payload.contactPersons = data.contactPersons;
  }

  // Set phone/mobile/email fields
  if (data.cellNumber) payload.mobile = data.cellNumber.trim();
  if (data.phone) payload.phone = data.phone.trim();
  if (data.email) payload.email = data.email.trim();

  // Convert address fields
  if (data.address || data.city) {
    payload.address = {
      street: (data.address || '').trim(),
      city: (data.city || '').trim(),
      country: 'Pakistan'
    };
  }

  // Convert paymentTerms string to creditTerms
  if (data.paymentTerms && typeof data.paymentTerms === 'string') {
    if (data.paymentTerms.toLowerCase() === 'cash') {
      payload.creditTerms = { days: 0, limit: data.creditLimit || 0, currency: 'PKR' };
    } else {
      const daysMatch = data.paymentTerms.match(/(\d+)/);
      if (daysMatch) {
        payload.creditTerms = {
          days: parseInt(daysMatch[1]),
          limit: data.creditLimit || 0,
          currency: 'PKR'
        };
      } else {
        payload.creditTerms = { days: 0, limit: data.creditLimit || 0, currency: 'PKR' };
      }
    }
  } else if (data.creditLimit !== undefined) {
    payload.creditTerms = {
      days: 0,
      limit: data.creditLimit || 0,
      currency: 'PKR'
    };
  }

  // Convert openingBalance to currentBalance
  if (data.openingBalance !== undefined) {
    payload.currentBalance = {
      amount: parseFloat(data.openingBalance) || 0,
      lastUpdated: new Date()
    };
  }

  // Set status
  payload.status = data.status || 'active';
  payload.isActive = data.isActive !== false;

  // Copy other fields
  if (data.notes) payload.notes = data.notes;
  if (data.website) payload.website = data.website;

  return payload;
};

exports.getCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, customerType, category } = req.query;
  const query = { isActive: true };
  if (req.companyId) query.companyId = req.companyId;

  if (customerType) query.customerType = customerType;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { businessName: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }

  const customers = await Customer.find(query)
    .sort({ name: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await Customer.countDocuments(query);
  const transformed = customers.map((c) => transformCustomer(c));

  res.status(200).json({
    success: true,
    data: transformed,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getCustomer = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const customer = await Customer.findOne(q).lean();
  if (!customer) return next(new AppError('Customer not found', 404));
  res.status(200).json({ success: true, data: transformCustomer(customer) });
});

exports.createCustomer = asyncHandler(async (req, res) => {
  try {
    // Ensure companyId is set
    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Please ensure you are logged in and have selected a company.'
      });
    }

    logger.debug('Creating customer with data:', {
      customerType: req.body.customerType,
      name: req.body.name,
      companyId: req.companyId
    });

    const payload = await prepareCustomerPayload(req.body, req.companyId);
    payload.companyId = req.companyId;
    payload.createdBy = req.user._id;

    logger.debug('Prepared payload:', {
      customerType: payload.customerType,
      code: payload.code,
      name: payload.name
    });

    // Validate required fields
    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required.'
      });
    }
    if (!payload.code) {
      return res.status(400).json({
        success: false,
        message: 'Customer code is required.'
      });
    }
    if (!payload.customerType) {
      return res.status(400).json({
        success: false,
        message: 'Customer type is required.'
      });
    }

    const customer = await Customer.create(payload);
    const doc = customer.toObject ? customer.toObject() : customer;
    res.status(201).json({ success: true, message: 'Customer created successfully', data: transformCustomer(doc) });
  } catch (error) {
    logger.error('Error creating customer:', error);
    if (error.message && (error.message.includes('required') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: `Validation error: ${messages}` });
    }
    throw error;
  }
});

exports.updateCustomer = asyncHandler(async (req, res, next) => {
  try {
    const q = { _id: req.params.id };
    if (req.companyId) q.companyId = req.companyId;
    const payload = await prepareCustomerPayload(req.body, req.companyId);
    payload.updatedBy = req.user._id;
    const customer = await Customer.findOneAndUpdate(q, payload, { new: true, runValidators: true }).lean();
    if (!customer) return next(new AppError('Customer not found', 404));
    res.status(200).json({ success: true, message: 'Customer updated successfully', data: transformCustomer(customer) });
  } catch (error) {
    logger.error('Error updating customer:', error);
    if (error.message && (error.message.includes('required') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: `Validation error: ${messages}` });
    }
    throw error;
  }
});

exports.deleteCustomer = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const customer = await Customer.findOneAndUpdate(q, { isActive: false, updatedBy: req.user._id }, { new: true });
  if (!customer) return next(new AppError('Customer not found', 404));
  res.status(200).json({ success: true, message: 'Customer deleted successfully' });
});

// ============ FINISHED GOODS ============

// Transform finished good for frontend
const transformFinishedGood = (f) => {
  const doc = f && typeof f.toObject === 'function' ? f.toObject() : (f || {});
  const dims = doc.specifications?.dimensions || {};
  return {
    ...doc,
    _id: doc._id,
    companyId: doc.companyId,
    name: doc.name?.en || doc.name || '',
    code: doc.code || '',
    size: doc.specifications?.dimensions ? `${dims.length || ''}x${dims.width || ''}` : doc.size || '',
    category: doc.category || '',
    color: doc.variants?.colors?.[0]?.name || doc.color || '',
    stock: doc.totalStock?.quantity ?? doc.currentStock?.[0]?.quantity ?? doc.stock ?? 0,
    costPrice: doc.pricing?.costPrice ?? doc.costing?.totalCost ?? doc.costPrice ?? 0,
    sellingPrice: doc.pricing?.retailPrice ?? doc.pricing?.wholesalePrice ?? doc.sellingPrice ?? 0,
    minStock: doc.inventory?.minLevel ?? doc.minStock ?? 0,
    maxStock: doc.inventory?.maxLevel ?? doc.maxStock ?? 0,
    status: doc.status || (doc.isActive !== false ? 'active' : 'inactive'),
  };
};

// Convert frontend format to backend format for finished good
const prepareFinishedGoodPayload = async (data, companyId) => {
  const payload = {};

  if (!companyId) {
    throw new Error('Company ID is required to create finished good');
  }

  // Map frontend category values to backend enum values
  const categoryMap = {
    'Simple': 'tableware',
    'Color': 'tableware',
    'Full Color': 'tableware',
    'Flower': 'decorative',
    'Full Flower': 'decorative',
    'Other': 'other',
    // Also handle backend enum values directly
    'tiles': 'tiles',
    'sanitary': 'sanitary',
    'tableware': 'tableware',
    'decorative': 'decorative',
    'industrial': 'industrial',
    'other': 'other'
  };

  // Convert name string to nested structure
  if (data.name && typeof data.name === 'string') {
    payload.name = { en: data.name.trim() };
  } else if (data.name && typeof data.name === 'object') {
    payload.name = data.name;
  }

  // Auto-generate code if missing
  if (!data.code) {
    const nameStr = typeof data.name === 'string' ? data.name : (data.name?.en || '');
    const codePrefix = nameStr.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'FG';
    // Get count of existing finished goods for this company
    const count = await FinishedGood.countDocuments({ companyId });
    payload.code = `${codePrefix}${String(count + 1).padStart(4, '0')}`;
    logger.debug(`Auto-generated finished good code: ${payload.code}`);
  } else {
    payload.code = (data.code || '').trim().toUpperCase();
  }

  // Ensure code is not empty
  if (!payload.code) {
    throw new Error('Product code is required');
  }

  // Convert category with proper enum mapping
  if (data.category) {
    const mappedCategory = categoryMap[data.category] || 'other';
    payload.category = mappedCategory;
  } else {
    payload.category = 'other'; // Default
  }

  // Convert unit string to ObjectId (handle plural/singular variations)
  if (data.unit && typeof data.unit === 'string') {
    const unitStr = data.unit.trim();
    const unitLower = unitStr.toLowerCase();

    // Try exact match first
    let unit = await Unit.findOne({
      companyId,
      isActive: true,
      $or: [
        { symbol: { $regex: new RegExp(`^${unitStr}$`, 'i') } },
        { 'name.en': { $regex: new RegExp(`^${unitStr}$`, 'i') } },
        { code: unitStr.toUpperCase().replace(/\s+/g, '_') }
      ]
    });

    // If not found, try singular/plural variations
    if (!unit) {
      const singular = unitLower.replace(/s$/, ''); // Remove trailing 's'
      const plural = unitLower + 's';

      unit = await Unit.findOne({
        companyId,
        isActive: true,
        $or: [
          { symbol: { $regex: new RegExp(`^${singular}$|^${plural}$`, 'i') } },
          { 'name.en': { $regex: new RegExp(`^${singular}$|^${plural}$`, 'i') } }
        ]
      });
    }

    // Special mappings for common cases
    if (!unit) {
      const unitMappings = {
        'pieces': 'pcs',
        'piece': 'pcs',
        'pcs': 'pcs',
        'boxes': 'box',
        'box': 'box',
        'bora': 'box' // Assuming Bora maps to box
      };

      const mappedSymbol = unitMappings[unitLower];
      if (mappedSymbol) {
        unit = await Unit.findOne({
          companyId,
          isActive: true,
          symbol: { $regex: new RegExp(`^${mappedSymbol}$`, 'i') }
        });
      }
    }

    if (unit) {
      payload.unit = unit._id;
      logger.debug(`Found unit: ${unit.symbol || unit.name?.en} (${unit._id})`);
    } else {
      // List available units for better error message
      const availableUnits = await Unit.find({ companyId, isActive: true })
        .select('symbol name.en code')
        .limit(10)
        .lean();
      const unitList = availableUnits.map(u => u.symbol || u.name?.en || u.code).join(', ');
      throw new Error(`Unit "${data.unit}" not found. Available units: ${unitList || 'None found'}`);
    }
  } else if (data.unit) {
    payload.unit = data.unit; // Already an ObjectId
  }

  // Convert size string to specifications.dimensions
  if (data.size && typeof data.size === 'string') {
    const sizeMatch = data.size.match(/(\d+)x(\d+)/);
    if (sizeMatch) {
      payload.specifications = {
        ...payload.specifications,
        dimensions: {
          length: parseFloat(sizeMatch[1]),
          width: parseFloat(sizeMatch[2]),
          unit: 'inch'
        }
      };
    }
  }

  // Handle gross weight, glaze, color
  if (data.grossWeight || data.grossGlaze || data.grossColor) {
    payload.specifications = {
      ...payload.specifications,
      weight: {
        value: data.grossWeight || 0,
        unit: 'g'
      },
      custom: {
        grossGlaze: data.grossGlaze || 0,
        grossColor: data.grossColor || 0
      }
    };
  }

  // Convert stock to currentStock array
  const stock = data.stock ?? data.openingStock ?? 0;
  const costPrice = data.costPrice ?? 0;
  if (stock !== undefined) {
    payload.currentStock = [{
      variantId: 'default',
      quantity: parseFloat(stock) || 0,
      value: (parseFloat(stock) || 0) * (parseFloat(costPrice) || 0),
      lastUpdated: new Date()
    }];
  }

  // Convert costPrice/sellingPrice to pricing structure
  if (data.costPrice !== undefined || data.sellingPrice !== undefined) {
    payload.pricing = {
      costPrice: parseFloat(data.costPrice) || 0,
      retailPrice: parseFloat(data.sellingPrice) || 0,
      wholesalePrice: parseFloat(data.sellingPrice) || 0,
      currency: 'PKR'
    };
  }

  // Convert minStock/maxStock to inventory structure
  if (data.minStock !== undefined || data.maxStock !== undefined) {
    payload.inventory = {
      minLevel: parseFloat(data.minStock) || 0,
      maxLevel: parseFloat(data.maxStock) || 0,
      reorderLevel: parseFloat(data.minStock) || 0,
      reorderQuantity: parseFloat(data.maxStock) || 0
    };
  }

  // Convert color to variants.colors
  if (data.color && typeof data.color === 'string') {
    payload.variants = {
      ...payload.variants,
      colors: [{ name: data.color.trim(), code: data.color.toUpperCase().trim(), hex: '' }]
    };
  }

  // Set defaults
  payload.isActive = data.isActive !== false;

  // Copy other fields
  if (data.description) payload.description = { en: data.description };
  if (data.subCategory) payload.subCategory = data.subCategory;

  return payload;
};

exports.getFinishedGoods = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, category } = req.query;
  const query = { isActive: true };
  if (req.companyId) query.companyId = req.companyId;

  if (category) query.category = category;
  if (search) {
    query.$or = [
      { 'name.en': { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }

  const products = await FinishedGood.find(query)
    .populate('unit', 'symbol')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await FinishedGood.countDocuments(query);
  const transformed = products.map((f) => transformFinishedGood(f));

  res.status(200).json({
    success: true,
    data: transformed,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count, pages: Math.ceil(count / limit) }
  });
});

exports.getFinishedGood = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const product = await FinishedGood.findOne(q)
    .populate('unit', 'symbol')
    .lean();
  if (!product) return next(new AppError('Finished good not found', 404));
  res.status(200).json({ success: true, data: transformFinishedGood(product) });
});

exports.createFinishedGood = asyncHandler(async (req, res) => {
  try {
    // Ensure companyId is set
    if (!req.companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required. Please ensure you are logged in and have selected a company.'
      });
    }

    logger.debug('Creating finished good with data:', {
      category: req.body.category,
      unit: req.body.unit,
      name: req.body.name,
      companyId: req.companyId
    });

    const payload = await prepareFinishedGoodPayload(req.body, req.companyId);
    payload.companyId = req.companyId;
    payload.createdBy = req.user._id;

    logger.debug('Prepared payload:', {
      category: payload.category,
      unit: payload.unit,
      code: payload.code,
      name: payload.name
    });

    // Validate required fields
    if (!payload.name || !payload.name.en) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required.'
      });
    }
    if (!payload.code) {
      return res.status(400).json({
        success: false,
        message: 'Product code is required.'
      });
    }
    if (!payload.category) {
      return res.status(400).json({
        success: false,
        message: 'Product category is required.'
      });
    }
    if (!payload.unit) {
      return res.status(400).json({
        success: false,
        message: 'Unit is required. Please select a valid unit.'
      });
    }

    const product = await FinishedGood.create(payload);
    const populated = await FinishedGood.findById(product._id).populate('unit', 'symbol').lean();
    res.status(201).json({ success: true, message: 'Finished good created successfully', data: transformFinishedGood(populated) });
  } catch (error) {
    logger.error('Error creating finished good:', error);
    if (error.message && (error.message.includes('required') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: `Validation error: ${messages}` });
    }
    throw error;
  }
});

exports.updateFinishedGood = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const payload = await prepareFinishedGoodPayload(req.body, req.companyId);
  payload.updatedBy = req.user._id;
  const product = await FinishedGood.findOneAndUpdate(q, payload, { new: true, runValidators: true })
    .populate('unit', 'symbol')
    .lean();
  if (!product) return next(new AppError('Finished good not found', 404));
  res.status(200).json({ success: true, message: 'Finished good updated successfully', data: transformFinishedGood(product) });
});

exports.deleteFinishedGood = asyncHandler(async (req, res, next) => {
  const q = { _id: req.params.id };
  if (req.companyId) q.companyId = req.companyId;
  const product = await FinishedGood.findOneAndUpdate(q, { isActive: false, status: 'discontinued', updatedBy: req.user._id }, { new: true });
  if (!product) return next(new AppError('Finished good not found', 404));
  res.status(200).json({ success: true, message: 'Finished good deleted successfully' });
});
