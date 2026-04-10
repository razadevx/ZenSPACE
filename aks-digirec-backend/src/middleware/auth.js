const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const { AppError, asyncHandler } = require('./errorHandler');
const logger = require('../config/logger');

// Protect routes - Verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id)
      .populate('role', 'name permissions')
      .populate('company', 'name status trialEndsAt');

    if (!user) {
      return next(new AppError('User not found', 401));
    }

    if (!user.isActive) {
      return next(new AppError('User account is deactivated', 401));
    }

    // Check company status for non-super-admin users
    if (user.role?.name !== 'super_admin' && user.company) {
      const company = user.company;
      
      if (company.status === 'suspended') {
        return next(new AppError('Company account is suspended', 403));
      }

      if (company.status === 'trial' && new Date(company.trialEndsAt) < new Date()) {
        return next(new AppError('Trial period has expired. Please upgrade your subscription', 403));
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired, please login again', 401));
    }
    return next(new AppError('Not authorized to access this route', 401));
  }
});

// Refresh token
const refresh = asyncHandler(async (req, res, next) => {
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
      accessToken
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }
});

// Company isolation middleware
const companyIsolation = asyncHandler(async (req, res, next) => {
  // Super admin can access all companies
  if (req.user.role?.name === 'super_admin') {
    if (req.headers['x-company-id']) {
      req.companyId = req.headers['x-company-id'];
    } else {
      // Super admin without company - use first available company for demo
      const firstCompany = await Company.findOne({ isActive: true }).select('_id');
      req.companyId = firstCompany?._id?.toString();
    }
    return next();
  }

  // Regular users can only access their own company
  if (!req.user.company) {
    return next(new AppError('User is not associated with any company', 403));
  }

  req.companyId = req.user.company._id.toString();
  next();
});

// Role authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role?.name)) {
      return next(new AppError(`Role ${req.user.role?.name} is not authorized to access this route`, 403));
    }
    next();
  };
};

// Permission authorization
const hasPermission = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.role?.permissions || [];
    const hasAllPermissions = permissions.every(p => userPermissions.includes(p));
    
    if (!hasAllPermissions) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Check if user belongs to company
const belongsToCompany = (paramName = 'companyId') => {
  return asyncHandler(async (req, res, next) => {
    const companyId = req.params[paramName] || req.body.companyId;
    
    if (req.user.role?.name === 'super_admin') {
      return next();
    }

    if (req.user.company._id.toString() !== companyId) {
      return next(new AppError('You do not have access to this company data', 403));
    }
    next();
  });
};

module.exports = {
  protect,
  refresh,
  companyIsolation,
  authorize,
  hasPermission,
  belongsToCompany
};
