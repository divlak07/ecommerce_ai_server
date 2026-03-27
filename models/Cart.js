const mongoose = require('mongoose');

/**
 * Cart Schema
 * Defines the structure for shopping cart documents
 */
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1,
  },
  variant: {
    type: mongoose.Schema.Types.Mixed, // Store variant details if applicable
    default: null,
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One cart per user
  },
  items: [cartItemSchema],
  coupon: {
    code: { type: String, default: null },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for total items count
cartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for subtotal (before discount)
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// Virtual for total discount
cartSchema.virtual('discountAmount').get(function() {
  const subtotal = this.subtotal;
  if (!this.coupon || !this.coupon.code) return 0;
  
  if (this.coupon.discountType === 'percentage') {
    return Math.round((subtotal * this.coupon.discount) / 100);
  }
  return this.coupon.discount;
});

// Virtual for total after discount
cartSchema.virtual('total').get(function() {
  return Math.max(0, this.subtotal - this.discountAmount);
});

// Index for faster queries
// Note: user index is automatically created due to unique: true in schema
cartSchema.index({ lastActivity: 1 });

/**
 * Pre-save middleware to update last activity
 */
cartSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

/**
 * Static method to get or create cart for user
 */
cartSchema.statics.getOrCreate = async function(userId) {
  let cart = await this.findOne({ user: userId }).populate('items.product');
  
  if (!cart) {
    cart = await this.create({ user: userId, items: [] });
  }
  
  return cart;
};

/**
 * Instance method to add item to cart
 */
cartSchema.methods.addItem = async function(productId, quantity = 1, price, variant = null) {
  const existingItemIndex = this.items.findIndex(
    item => item.product.toString() === productId.toString() && 
    JSON.stringify(item.variant) === JSON.stringify(variant)
  );
  
  if (existingItemIndex > -1) {
    // Update existing item quantity
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    this.items.push({
      product: productId,
      quantity,
      price,
      variant,
    });
  }
  
  return this.save();
};

/**
 * Instance method to update item quantity
 */
cartSchema.methods.updateQuantity = async function(itemId, quantity) {
  const itemIndex = this.items.findIndex(
    item => item._id.toString() === itemId
  );
  
  if (itemIndex === -1) {
    throw new Error('Item not found in cart');
  }
  
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    this.items.splice(itemIndex, 1);
  } else {
    this.items[itemIndex].quantity = quantity;
  }
  
  return this.save();
};

/**
 * Instance method to remove item from cart
 */
cartSchema.methods.removeItem = async function(itemId) {
  this.items = this.items.filter(
    item => item._id.toString() !== itemId
  );
  return this.save();
};

/**
 * Instance method to clear cart
 */
cartSchema.methods.clear = async function() {
  this.items = [];
  this.coupon = { code: null, discount: 0, discountType: 'percentage' };
  return this.save();
};

/**
 * Instance method to apply coupon
 */
cartSchema.methods.applyCoupon = async function(code, discount, discountType = 'percentage') {
  this.coupon = { code, discount, discountType };
  return this.save();
};

/**
 * Instance method to remove coupon
 */
cartSchema.methods.removeCoupon = async function() {
  this.coupon = { code: null, discount: 0, discountType: 'percentage' };
  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
