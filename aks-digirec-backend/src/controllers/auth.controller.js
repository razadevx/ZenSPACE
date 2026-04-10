const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User, Company, Role, UserPreferences } = require('../models');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { firstName, lastName, name, email, password, companyName, phone, city, country } = req.body;

  // Derive firstName/lastName from name if not provided
  let fName = firstName;
  let lName = lastName;
  if (name && !firstName && !lastName) {
    const parts = String(name).trim().split(/\s+/);
    fName = parts[0] || 'User';
    lName = parts.slice(1).join(' ') || 'Account';
  }
  if (!fName || !lName) {
    return next(new AppError('Name is required (provide name or firstName and lastName)', 400));
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError('User already exists with this email', 400));
  }

  // Create company
  const company = await Company.create({
    name: companyName,
    contactInfo: { email, phone },
    address: { city: city || undefined, country: country || 'Pakistan' }
  });

  // Get admin role
  const adminRole = await Role.findOne({ name: 'admin' });
  if (!adminRole) {
    return next(new AppError('System roles not initialized', 500));
  }

  // Create user
  const user = await User.create({
    firstName: fName,
    lastName: lName,
    email,
    password,
    role: adminRole._id,
    company: company._id,
    phone
  });

  // Create user preferences
  await UserPreferences.create({
    userId: user._id,
    companyId: company._id
  });

  // Generate token
  const token = user.getSignedJwtToken();
  const refreshToken = user.getRefreshToken();

  logger.info(`New user registered: ${email}, Company: ${company.name}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      accessToken: token,
      token,
      refreshToken,
      user: {
        _id: user._id,
        id: user._id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: adminRole.name.toUpperCase().replace(' ', '_'),
        companyId: company._id,
        company: {
          _id: company._id,
          id: company._id,
          name: company.name,
          code: company.code
        },
        permissions: adminRole.permissions || [],
        preferences: { theme: 'default', language: 'en', dateFormat: 'DD/MM/YYYY', currency: 'PKR' }
      }
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password').populate('role', 'name permissions').populate('company', 'name status trialEndsAt');

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated', 401));
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Increment login attempts
    await user.incrementLoginAttempts();
    return next(new AppError('Invalid credentials', 401));
  }

  // Reset login attempts
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = user.getSignedJwtToken();
  const refreshToken = user.getRefreshToken();

  logger.info(`User logged in: ${email}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      accessToken: token,
      token,
      refreshToken,
      user: {
        _id: user._id,
        id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: (user.role?.name || 'operator').toUpperCase().replace(' ', '_'),
        permissions: user.role?.permissions || [],
        companyId: user.company?._id,
        company: user.company ? {
          _id: user.company._id,
          id: user.company._id,
          name: user.company.name,
          code: user.company.code,
          status: user.company.status,
          trialDaysRemaining: user.company.trialDaysRemaining
        } : null,
        preferences: user.preferences || { theme: 'default', language: 'en', dateFormat: 'DD/MM/YYYY', currency: 'PKR' }
      }
    }
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('role', 'name permissions')
    .populate('company', 'name status trialEndsAt theme language')
    .select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Get user preferences
  const preferences = await UserPreferences.findOne({ userId: user._id });

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role?.name,
        permissions: user.role?.permissions,
        company: user.company,
        preferences: preferences || user.preferences
      }
    }
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Generate new access token
    const accessToken = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      data: { accessToken }
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  logger.info(`User logged out: ${req.user.email}`);
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  logger.info(`Password updated for user: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User not found with this email', 404));
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // TODO: Send email with reset token
  // For now, just return the token in development

  logger.info(`Password reset requested for: ${email}`);

  res.status(200).json({
    success: true,
    message: 'Password reset email sent',
    ...(process.env.NODE_ENV === 'development' && { resetToken })
  });
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;

  // Get hashed token
  const resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Invalid or expired token', 400));
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  logger.info(`Password reset successful for: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});
