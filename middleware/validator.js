const { body, param, query, validationResult } = require('express-validator');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Validation Result Handler
 * Checks for validation errors and returns response if any
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().reduce((acc, error) => {
      acc[error.path] = error.msg;
      return acc;
    }, {});
    
    return ApiResponse.error(res, 400, 'Validation failed', formattedErrors);
  }
  
  next();
};

/**
 * Auth Validators
 */
const authValidators = {
  register: [
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('phone')
      .optional()
      .trim()
      .matches(/^\+?[\d\s\-()]{7,}$/).withMessage('Please enter a valid phone number'),
    handleValidationErrors,
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please enter a valid email address'),
    body('password')
      .notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
  
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),
    body('phone')
      .optional()
      .trim()
      .matches(/^\+?[\d\s\-()]{7,}$/).withMessage('Please enter a valid phone number'),
    handleValidationErrors,
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
      .matches(/[0-9]/).withMessage('New password must contain at least one number'),
    handleValidationErrors,
  ],
};

/**
 * Product Validators
 */
const productValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Product name is required')
      .isLength({ max: 200 }).withMessage('Product name cannot exceed 200 characters'),
    body('description')
      .trim()
      .notEmpty().withMessage('Product description is required'),
    body('category')
      .notEmpty().withMessage('Category is required')
      .isMongoId().withMessage('Invalid category ID'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('quantity')
      .optional()
      .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    handleValidationErrors,
  ],
  
  update: [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Product name cannot exceed 200 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('quantity')
      .optional()
      .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    handleValidationErrors,
  ],
  
  getById: [
    param('id')
      .isMongoId().withMessage('Invalid product ID'),
    handleValidationErrors,
  ],
  
  list: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('minPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    handleValidationErrors,
  ],
};

/**
 * Cart Validators
 */
const cartValidators = {
  addItem: [
    body('productId')
      .notEmpty().withMessage('Product ID is required')
      .isMongoId().withMessage('Invalid product ID'),
    body('quantity')
      .optional()
      .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    handleValidationErrors,
  ],
  
  updateItem: [
    param('itemId')
      .isMongoId().withMessage('Invalid item ID'),
    body('quantity')
      .notEmpty().withMessage('Quantity is required')
      .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    handleValidationErrors,
  ],
  
  removeItem: [
    param('itemId')
      .isMongoId().withMessage('Invalid item ID'),
    handleValidationErrors,
  ],
};

/**
 * Order Validators
 */
const orderValidators = {
  create: [
    body('shippingAddress')
      .notEmpty().withMessage('Shipping address is required')
      .isObject().withMessage('Shipping address must be an object'),
    body('shippingAddress.street')
      .notEmpty().withMessage('Street is required'),
    body('shippingAddress.city')
      .notEmpty().withMessage('City is required'),
    body('shippingAddress.state')
      .notEmpty().withMessage('State is required'),
    body('shippingAddress.zipCode')
      .notEmpty().withMessage('ZIP code is required'),
    body('paymentMethod')
      .notEmpty().withMessage('Payment method is required')
      .isIn(['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'cod'])
      .withMessage('Invalid payment method'),
    handleValidationErrors,
  ],
  
  updateStatus: [
    param('id')
      .isMongoId().withMessage('Invalid order ID'),
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
      .withMessage('Invalid status'),
    handleValidationErrors,
  ],
};

/**
 * Category Validators
 */
const categoryValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Category name is required')
      .isLength({ max: 100 }).withMessage('Category name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    handleValidationErrors,
  ],
  
  update: [
    param('id')
      .isMongoId().withMessage('Invalid category ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Category name cannot exceed 100 characters'),
    handleValidationErrors,
  ],
};

module.exports = {
  authValidators,
  productValidators,
  cartValidators,
  orderValidators,
  categoryValidators,
  handleValidationErrors,
};
