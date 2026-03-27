const mongoose = require('mongoose');

/**
 * Category Schema
 * Defines product categories for the e-commerce platform
 */
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  icon: {
    type: String, // Emoji or icon class
    default: '📦',
  },
  image: {
    type: String, // URL to category image
    default: null,
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null, // Null means it's a top-level category
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  displayOrder: {
    type: Number,
    default: 0,
  },
  metaTitle: {
    type: String,
    maxlength: [70, 'Meta title cannot exceed 70 characters'],
    default: '',
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description cannot exceed 160 characters'],
    default: '',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory',
});

// Virtual for product count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// Index for faster queries
// Note: slug index is automatically created due to unique: true in schema
categorySchema.index({ isActive: 1 });
categorySchema.index({ parentCategory: 1 });

/**
 * Pre-save middleware to generate slug from name
 */
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

/**
 * Static method to get category tree
 */
categorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true })
    .populate('subcategories', 'name slug icon')
    .sort({ displayOrder: 1, name: 1 })
    .lean();
  
  // Build tree structure
  const tree = [];
  const map = {};
  
  categories.forEach(cat => {
    map[cat._id] = { ...cat, children: [] };
  });
  
  categories.forEach(cat => {
    if (cat.parentCategory && map[cat.parentCategory]) {
      map[cat.parentCategory].children.push(map[cat._id]);
    } else if (!cat.parentCategory) {
      tree.push(map[cat._id]);
    }
  });
  
  return tree;
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
