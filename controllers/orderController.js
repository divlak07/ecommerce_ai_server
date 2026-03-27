const { Order, Cart, Product, User } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Order Controller
 * Handles order operations
 */

/**
 * @desc    Create new order from cart
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    shippingAddress,
    billingAddress,
    paymentMethod,
    notes,
  } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ user: req.userId }).populate('items.product');

  if (!cart || cart.items.length === 0) {
    throw new AppError('Your cart is empty', 400);
  }

  // Validate cart items stock
  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    if (product.trackInventory && product.quantity < item.quantity) {
      throw new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
        400
      );
    }
  }

  // Calculate pricing
  const subtotal = cart.subtotal;
  const shippingCost = subtotal >= 49 ? 0 : 5.99; // Free shipping over $49
  const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
  const discount = cart.discountAmount;
  const total = subtotal + shippingCost + tax - discount;

  // Create order items
  const orderItems = cart.items.map(item => ({
    product: item.product._id,
    name: item.product.name,
    emoji: item.product.emoji,
    quantity: item.quantity,
    price: item.price,
    variant: item.variant,
  }));

  // Create order
  const order = await Order.create({
    user: req.userId,
    items: orderItems,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    payment: {
      method: paymentMethod,
      status: paymentMethod === 'cod' ? 'pending' : 'completed',
    },
    pricing: {
      subtotal,
      shippingCost,
      tax,
      discount,
      total,
    },
    coupon: cart.coupon.code ? {
      code: cart.coupon.code,
      discount,
    } : null,
    notes: {
      customer: notes || '',
    },
  });

  // Update product quantities
  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    if (product.trackInventory) {
      product.quantity -= item.quantity;
      product.salesCount += item.quantity;
      await product.save({ validateBeforeSave: false });
    }
  }

  // Clear cart
  await cart.clear();

  ApiResponse.success(res, 201, 'Order placed successfully', { order });
});

/**
 * @desc    Get user's orders
 * @route   GET /api/orders
 * @access  Private
 */
const getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const result = await Order.getByUser(req.userId, {
    page: Number(page),
    limit: Number(limit),
    status,
  });

  ApiResponse.paginated(
    res,
    result.orders,
    result.page,
    result.limit,
    result.total,
    'Orders retrieved successfully'
  );
});

/**
 * @desc    Get single order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({
    _id: id,
    user: req.userId,
  }).populate('items.product', 'name slug emoji images');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  ApiResponse.success(res, 200, 'Order retrieved successfully', { order });
});

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = await Order.findOne({
    _id: id,
    user: req.userId,
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Can only cancel pending or confirmed orders
  if (!['pending', 'confirmed'].includes(order.status)) {
    throw new AppError(
      `Cannot cancel order with status: ${order.status}. Please contact support.`,
      400
    );
  }

  // Restore product quantities
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product && product.trackInventory) {
      product.quantity += item.quantity;
      product.salesCount -= item.quantity;
      await product.save({ validateBeforeSave: false });
    }
  }

  await order.updateStatus('cancelled', reason || 'Cancelled by customer');

  ApiResponse.success(res, 200, 'Order cancelled successfully', { order });
});

/**
 * @desc    Get order statistics
 * @route   GET /api/orders/stats
 * @access  Private
 */
const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await Order.getStatistics(req.userId);

  ApiResponse.success(res, 200, 'Order statistics retrieved', { stats });
});

// ==================== ADMIN CONTROLLERS ====================

/**
 * @desc    Get all orders (Admin)
 * @route   GET /api/orders/admin/all
 * @access  Private/Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;

  const query = {};
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(query),
  ]);

  ApiResponse.paginated(res, orders, page, limit, total, 'All orders retrieved');
});

/**
 * @desc    Update order status (Admin)
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  await order.updateStatus(status, note, req.userId);

  ApiResponse.success(res, 200, 'Order status updated', { order });
});

/**
 * @desc    Add tracking info to order (Admin)
 * @route   PUT /api/orders/:id/tracking
 * @access  Private/Admin
 */
const addTracking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { carrier, trackingNumber, estimatedDelivery } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  await order.addTracking(carrier, trackingNumber, estimatedDelivery);

  // If adding tracking, update status to shipped if not already
  if (order.status !== 'shipped' && order.status !== 'delivered') {
    await order.updateStatus('shipped', 'Tracking information added', req.userId);
  }

  ApiResponse.success(res, 200, 'Tracking information added', { order });
});

/**
 * @desc    Process refund (Admin)
 * @route   PUT /api/orders/:id/refund
 * @access  Private/Admin
 */
const processRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.status === 'refunded') {
    throw new AppError('Order has already been refunded', 400);
  }

  await order.processRefund(amount, reason);

  ApiResponse.success(res, 200, 'Refund processed successfully', { order });
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  getOrderStats,
  getAllOrders,
  updateOrderStatus,
  addTracking,
  processRefund,
};
