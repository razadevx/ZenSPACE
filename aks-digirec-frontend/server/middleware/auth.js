const jwt = require('jsonwebtoken');
const { User, Company } = require('../models');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if password was changed after token was issued
      if (req.user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          message: 'User recently changed password. Please log in again'
        });
      }

      // Get company from header (for multi-tenancy)
      const companyId = req.headers['x-company-id'];
      if (companyId && req.user.role !== 'SUPER_ADMIN') {
        // Verify user belongs to this company
        if (req.user.companyId.toString() !== companyId) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to access this company data'
          });
        }
        req.user.company = companyId;
      } else if (req.user.role !== 'SUPER_ADMIN') {
        req.user.company = req.user.companyId.toString();
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check company access for multi-tenancy
exports.checkCompanyAccess = async (req, res, next) => {
  try {
    // Super admin can access all companies
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // For other roles, check if they have access to the requested company
    const requestedCompanyId = req.params.companyId || req.body.companyId || req.query.companyId;
    
    if (requestedCompanyId && requestedCompanyId !== req.user.companyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this company data'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
