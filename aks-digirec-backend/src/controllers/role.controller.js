const { Role } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private
exports.getRoles = asyncHandler(async (req, res, next) => {
  const roles = await Role.find()
    .select('-__v')
    .sort({ level: -1 });

  res.status(200).json({
    success: true,
    data: roles
  });
});

// @desc    Get single role
// @route   GET /api/roles/:id
// @access  Private
exports.getRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id).select('-__v');

  if (!role) {
    return next(new AppError('Role not found', 404));
  }

  res.status(200).json({
    success: true,
    data: role
  });
});
