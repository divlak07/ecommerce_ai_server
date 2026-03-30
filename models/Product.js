const mongoose = require('mongoose');

/**
 * Product Schema
 * Defines the structure for product documents in the database
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'Short description cannot exceed 300 characters'],
    default: '',
  },
  emoji: {
    type: String,
    default: '📦',
  },
  sku: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required'],
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
  },
  compareAtPrice: {
    type: Number,
    min: [0, 'Compare at price cannot be negative'],
    default: null, // Original price before discount
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative'],
    select: false, // Only visible to admin
  },
  quantity: {
    type: Number,
    required: [true, 'Product quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  trackInventory: {
    type: Boolean,
    default: true,
  },
  images: [{
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false },
  }],
  attributes: [{
    name: { type: String, required: true },
    values: [{ type: String }],
  }],
  variants: [{
    name: { type: String, required: true },
    sku: { type: String },
    price: { type: Number },
    quantity: { type: Number, default: 0 },
    attributes: { type: Map, of: String },
    images: [{ type: String }],
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  rating: {
    average: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
      default: 0,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
  }],
  badge: {
    type: String,
    enum: ['New', 'Sale', 'Hot', 'Best Seller', 'Limited', null],
    default: null,
  },
  weight: {
    type: Number, // in grams
    default: 0,
  },
  dimensions: {
    length: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  shipping: {
    freeShipping: { type: Boolean, default: false },
    estimatedDays: { type: Number, default: 3 },
  },
  seo: {
    title: { type: String, maxlength: 70 },
    description: { type: String, maxlength: 160 },
    keywords: [{ type: String }],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  salesCount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    select: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0]?.url || null);
});

// Virtual for in stock status
productSchema.virtual('inStock').get(function() {
  return !this.trackInventory || this.quantity > 0;
});

// Indexes for faster queries
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
// Note: slug index is automatically created due to unique: true in schema
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ badge: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'rating.average': -1 });
productSchema.index({ salesCount: -1 });

/**
 * Pre-save middleware to generate slug and SKU
 */
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Generate SKU if not provided
  if (!this.sku) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.sku = `LUX-${timestamp}-${random}`;
  }
  
  next();
});

/**
 * Static method to get featured products
 */
productSchema.statics.getFeatured = async function(limit = 8) {
  return this.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug icon')
    .limit(limit)
    .lean();
};

/**
 * Static method to get products by category
 */
productSchema.statics.getByCategory = async function(categoryId, options = {}) {
  const { page = 1, limit = 12, sort = '-createdAt' } = options;
  
  const query = { 
    isActive: true, 
    category: categoryId 
  };
  
  const [products, total] = await Promise.all([
    this.find(query)
      .populate('category', 'name slug icon')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);
  
  return { products, total, page, limit };
};

/**
 * Static method to search products
 */
productSchema.statics.search = async function(searchQuery, options = {}) {
  const { page = 1, limit = 12, category, minPrice, maxPrice } = options;
  
  const query = { 
    isActive: true,
    $text: { $search: searchQuery }
  };
  
  if (category) query.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }
  
  const [products, total] = await Promise.all([
    this.find(query)
      .populate('category', 'name slug icon')
      .sort({ score: { $meta: 'textScore' } })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);
  
  return { products, total, page, limit };
};

/**
 * Instance method to increment views
 */
productSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save({ validateBeforeSave: false });
};

/**
 * Instance method to update rating
 */
productSchema.methods.updateRating = async function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save({ validateBeforeSave: false });
};

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
