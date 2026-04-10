const { User, Role, UserPreferences } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, search, role, status } = req.query;
  
  const query = { company: req.companyId };
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) query.role = role;
  if (status !== undefined) query.isActive = status === 'active';
  
  const users = await User.find(query)
    .populate('role', 'name displayName')
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const count = await User.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, company: req.companyId })
    .populate('role', 'name displayName permissions')
    .populate('company', 'name')
    .select('-password');
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, roleId, phone, department, workerType } = req.body;
  
  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError('User already exists with this email', 400));
  }
  
  // Check role
  const role = await Role.findById(roleId);
  if (!role) {
    return next(new AppError('Role not found', 404));
  }
  
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: password || 'TempPass123!',
    role: roleId,
    company: req.companyId,
    phone,
    department,
    workerType,
    createdBy: req.user._id
  });
  
  // Create user preferences
  await UserPreferences.create({
    userId: user._id,
    companyId: req.companyId
  });
  
  logger.info(`User created: ${email} by ${req.user.email}`);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, phone, roleId, department, isActive } = req.body;
  
  let user = await User.findOne({ _id: req.params.id, company: req.companyId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Prevent updating own role through this endpoint
  if (user._id.toString() === req.user._id.toString() && roleId) {
    return next(new AppError('Cannot change your own role', 400));
  }
  
  user = await User.findByIdAndUpdate(
    req.params.id,
    {
      firstName,
      lastName,
      phone,
      role: roleId,
      department,
      isActive,
      updatedBy: req.user._id
    },
    { new: true, runValidators: true }
  ).populate('role', 'name displayName');
  
  logger.info(`User updated: ${user.email} by ${req.user.email}`);
  
  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id, company: req.companyId });
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  // Prevent self-deletion
  if (user._id.toString() === req.user._id.toString()) {
    return next(new AppError('Cannot delete your own account', 400));
  }
  
  await user.deleteOne();
  
  logger.info(`User deleted: ${user.email} by ${req.user.email}`);
  
  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, phone } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      firstName,
      lastName,
      phone,
      updatedBy: req.user._id
    },
    { new: true, runValidators: true }
  ).select('-password');
  
  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
});

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
exports.updatePreferences = asyncHandler(async (req, res, next) => {
  const { theme, language, notifications, dashboard } = req.body;
  
  let preferences = await UserPreferences.findOne({ userId: req.user._id });
  
  if (!preferences) {
    preferences = await UserPreferences.create({
      userId: req.user._id,
      companyId: req.companyId,
      theme,
      language,
      notifications,
      dashboard
    });
  } else {
    preferences = await UserPreferences.findOneAndUpdate(
      { userId: req.user._id },
      {
        theme,
        language,
        notifications,
        dashboard
      },
      { new: true }
    );
  }
  
  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: preferences
  });
});

// @desc    Get user preferences
// @route   GET /api/users/preferences
// @access  Private
exports.getPreferences = asyncHandler(async (req, res, next) => {
  const preferences = await UserPreferences.findOne({ userId: req.user._id });
  
  res.status(200).json({
    success: true,
    data: preferences || {}
  });
});
