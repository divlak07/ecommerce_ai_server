const { Cart, Product } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Cart Controller
 * Handles shopping cart operations
 */

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId })
    .populate({
      path: 'items.product',
      select: 'name slug price emoji images quantity inStock isActive',
    });

  if (!cart) {
    // Return empty cart if none exists
    return ApiResponse.success(res, 200, 'Cart retrieved successfully', {
      cart: {
        items: [],
        itemCount: 0,
        subtotal: 0,
        discountAmount: 0,
        total: 0,
        coupon: null,
      },
    });
  }

  ApiResponse.success(res, 200, 'Cart retrieved successfully', { cart });
});

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/items
 * @access  Private
 */
const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, variant } = req.body;

  // Check if product exists and is active
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    throw new AppError('Product not found', 404);
  }

  // Check if product is in stock
  if (product.trackInventory && product.quantity < quantity) {
    throw new AppError('Insufficient stock available', 400);
  }

  // Get or create cart
  let cart = await Cart.findOne({ user: req.userId });

  if (!cart) {
    cart = new Cart({
      user: req.userId,
      items: [],
    });
  }

  // Add item to cart
  await cart.addItem(productId, quantity, product.price, variant);

  // Populate and return updated cart
  await cart.populate({
    path: 'items.product',
    select: 'name slug price emoji images quantity inStock',
  });

  ApiResponse.success(res, 200, 'Item added to cart', { cart });
});

/**
 * @desc    Update item quantity
 * @route   PUT /api/cart/items/:itemId
 * @access  Private
 */
const updateItemQuantity = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.userId });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Find the cart item
  const cartItem = cart.items.id(itemId);
  if (!cartItem) {
    throw new AppError('Item not found in cart', 404);
  }

  // Check stock if increasing quantity
  if (quantity > cartItem.quantity) {
    const product = await Product.findById(cartItem.product);
    if (product.trackInventory && product.quantity < quantity) {
      throw new AppError('Insufficient stock available', 400);
    }
  }

  await cart.updateQuantity(itemId, quantity);

  await cart.populate({
    path: 'items.product',
    select: 'name slug price emoji images quantity inStock',
  });

  ApiResponse.success(res, 200, 'Cart updated', { cart });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:itemId
 * @access  Private
 */
const removeItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.userId });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  await cart.removeItem(itemId);

  await cart.populate({
    path: 'items.product',
    select: 'name slug price emoji images quantity inStock',
  });

  ApiResponse.success(res, 200, 'Item removed from cart', { cart });
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId });

  if (!cart) {
    return ApiResponse.success(res, 200, 'Cart is already empty');
  }

  await cart.clear();

  ApiResponse.success(res, 200, 'Cart cleared successfully');
});

/**
 * @desc    Apply coupon to cart
 * @route   POST /api/cart/coupon
 * @access  Private
 */
const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  const cart = await Cart.findOne({ user: req.userId });

  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // TODO: Implement actual coupon validation logic
  // For now, using sample coupons
  const validCoupons = {
    'WELCOME10': { discount: 10, discountType: 'percentage' },
    'SAVE20': { discount: 20, discountType: 'percentage' },
    'FLAT50': { discount: 50, discountType: 'fixed' },
  };

  const coupon = validCoupons[code.toUpperCase()];

  if (!coupon) {
    throw new AppError('Invalid coupon code', 400);
  }

  await cart.applyCoupon(code.toUpperCase(), coupon.discount, coupon.discountType);

  await cart.populate({
    path: 'items.product',
    select: 'name slug price emoji images quantity inStock',
  });

  ApiResponse.success(res, 200, 'Coupon applied successfully', { cart });
});

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/cart/coupon
 * @access  Private
 */
const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.userId });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  await cart.removeCoupon();

  await cart.populate({
    path: 'items.product',
    select: 'name slug price emoji images quantity inStock',
  });

  ApiResponse.success(res, 200, 'Coupon removed', { cart });
});

/**
 * @desc    Sync cart (for logged-in users with local cart)
 * @route   POST /api/cart/sync
 * @access  Private
 */
const syncCart = asyncHandler(async (req, res) => {
  const { items } = req.body;

  let cart = await Cart.findOne({ user: req.userId });

  if (!cart) {
    cart = new Cart({ user: req.userId, items: [] });
  }

  // Validate and add each item
  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (product && product.isActive && product.inStock) {
      const existingItem = cart.items.find(
        ci => ci.product.toString() === item.productId
      );

      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        cart.items.push({
          product: item.productId,
          quantity: item.quantity,
          price: product.price,
          variant: item.variant || null,
        });
      }
    }
  }

  await cart.save();

  await cart.populate({
    path: 'items.product',
    select: 'name slug price emoji images quantity inStock',
  });

  ApiResponse.success(res, 200, 'Cart synced successfully', { cart });
});

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  syncCart,
};
