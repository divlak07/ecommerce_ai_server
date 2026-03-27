/**
 * Controllers Index
 * Central export point for all controllers
 */

const authController = require('./authController');
const productController = require('./productController');
const categoryController = require('./categoryController');
const cartController = require('./cartController');
const orderController = require('./orderController');
const reviewController = require('./reviewController');

module.exports = {
  authController,
  productController,
  categoryController,
  cartController,
  orderController,
  reviewController,
};
