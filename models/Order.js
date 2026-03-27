const mongoose = require('mongoose');

/**
 * Order Schema
 * Defines the structure for order documents in the database
 */

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  emoji: {
    type: String,
    default: '📦',
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  },
  variant: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: 'USA' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: shippingAddressSchema,
    required: true,
  },
  billingAddress: {
    type: shippingAddressSchema,
    required: true,
  },
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay', 'cod'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    transactionId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
  },
  coupon: {
    code: { type: String, default: null },
    discount: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
  },
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  shipping: {
    carrier: { type: String, default: null },
    trackingNumber: { type: String, default: null },
    estimatedDelivery: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  notes: {
    customer: { type: String, default: '' },
    internal: { type: String, default: '' },
  },
  isGuest: {
    type: Boolean,
    default: false,
  },
  guestEmail: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for item count
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Indexes for faster queries
// Note: orderNumber index is automatically created due to unique: true in schema
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });

/**
 * Pre-save middleware to generate order number
 */
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const prefix = 'LUX';
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `${prefix}-${year}${month}${day}-${random}`;
  }
  
  // Add status to history if new or status changed
  if (this.isNew || this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
    });
  }
  
  next();
});

/**
 * Static method to get orders by user
 */
orderSchema.statics.getByUser = async function(userId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  
  const query = { user: userId };
  if (status) query.status = status;
  
  const [orders, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);
  
  return { orders, total, page, limit };
};

/**
 * Static method to get order statistics
 */
orderSchema.statics.getStatistics = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' },
      },
    },
  ]);
  
  return stats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 };
};

/**
 * Instance method to update status
 */
orderSchema.methods.updateStatus = async function(newStatus, note = '', updatedBy = null) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy,
  });
  
  // Update timestamps based on status
  if (newStatus === 'shipped' && !this.shipping.shippedAt) {
    this.shipping.shippedAt = new Date();
  }
  if (newStatus === 'delivered' && !this.shipping.deliveredAt) {
    this.shipping.deliveredAt = new Date();
  }
  
  return this.save();
};

/**
 * Instance method to add tracking info
 */
orderSchema.methods.addTracking = async function(carrier, trackingNumber, estimatedDelivery) {
  this.shipping.carrier = carrier;
  this.shipping.trackingNumber = trackingNumber;
  if (estimatedDelivery) {
    this.shipping.estimatedDelivery = estimatedDelivery;
  }
  return this.save();
};

/**
 * Instance method to process refund
 */
orderSchema.methods.processRefund = async function(amount, reason = '') {
  this.payment.status = amount < this.pricing.total ? 'partially_refunded' : 'refunded';
  this.status = 'refunded';
  this.statusHistory.push({
    status: 'refunded',
    timestamp: new Date(),
    note: `Refund of $${amount}. Reason: ${reason}`,
  });
  return this.save();
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
