const express = require('express');
const { orderController } = require('../controllers');
const { authenticate, adminOnly } = require('../middleware/auth');
const { orderValidators } = require('../middleware/validator');

const router = express.Router();

/**
 * Order Routes
 * Base path: /api/orders
 */

// User routes (protected)
router.use(authenticate);

router.post('/', orderValidators.create, orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', orderController.getOrderById);
router.put('/:id/cancel', orderController.cancelOrder);

// Admin routes
router.get('/admin/all', adminOnly, orderController.getAllOrders);
router.put('/:id/status', adminOnly, orderValidators.updateStatus, orderController.updateOrderStatus);
router.put('/:id/tracking', adminOnly, orderController.addTracking);
router.put('/:id/refund', adminOnly, orderController.processRefund);

module.exports = router;
