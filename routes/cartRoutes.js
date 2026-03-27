const express = require('express');
const { cartController } = require('../controllers');
const { authenticate } = require('../middleware/auth');
const { cartValidators } = require('../middleware/validator');

const router = express.Router();

/**
 * Cart Routes
 * Base path: /api/cart
 */

// All cart routes require authentication
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', cartValidators.addItem, cartController.addItem);
router.put('/items/:itemId', cartValidators.updateItem, cartController.updateItemQuantity);
router.delete('/items/:itemId', cartValidators.removeItem, cartController.removeItem);
router.delete('/', cartController.clearCart);
router.post('/coupon', cartController.applyCoupon);
router.delete('/coupon', cartController.removeCoupon);
router.post('/sync', cartController.syncCart);

module.exports = router;
