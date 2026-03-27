const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    throw new AppError('Access denied. No token provided.', 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new AppError('User not found. Token may be invalid.', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('User account has been deactivated.', 401);
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please log in again.', 401);
    }
    throw error;
  }
});

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;
      }
    } catch (error) {
      // Silently fail for optional auth
      req.user = null;
    }
  }

  next();
});

/**
 * Authorization Middleware
 * Restricts access to specific roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 401, 'Please log in to access this resource');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res, 
        403, 
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }

    next();
  };
};

/**
 * Admin-only Middleware
 * Shortcut for authorize('admin')
 */
const adminOnly = authorize('admin');

/**
 * Admin or Moderator Middleware
 * Shortcut for authorize('admin', 'moderator')
 */
const adminOrModerator = authorize('admin', 'moderator');

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  adminOrModerator,
};
