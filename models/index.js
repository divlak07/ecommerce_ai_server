/**
 * Models Index
 * Central export point for all Mongoose models
 */

const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Cart = require('./Cart');
const Order = require('./Order');
const Review = require('./Review');

module.exports = {
  User,
  Category,
  Product,
  Cart,
  Order,
  Review,
};
