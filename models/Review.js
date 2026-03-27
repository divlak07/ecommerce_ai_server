const mongoose = require('mongoose');

/**
 * Review Schema
 * Defines the structure for product reviews
 */
const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
  },
  title: {
    type: String,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    default: '',
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
  },
  images: [{
    url: { type: String, required: true },
    caption: { type: String, default: '' },
  }],
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
  helpful: {
    count: { type: Number, default: 0 },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  reply: {
    comment: { type: String, default: null },
    repliedAt: { type: Date, default: null },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
}, {
  timestamps: true,
});

// Compound index to ensure one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isActive: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

/**
 * Static method to get reviews by product
 */
reviewSchema.statics.getByProduct = async function(productId, options = {}) {
  const { page = 1, limit = 10, sort = '-createdAt' } = options;
  
  const [reviews, total, ratingStats] = await Promise.all([
    this.find({ product: productId, isActive: true })
      .populate('user', 'firstName lastName avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments({ product: productId, isActive: true }),
    this.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isActive: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  
  // Calculate rating distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  let totalCount = 0;
  
  ratingStats.forEach(stat => {
    distribution[stat._id] = stat.count;
    totalRating += stat._id * stat.count;
    totalCount += stat.count;
  });
  
  const averageRating = totalCount > 0 ? (totalRating / totalCount).toFixed(1) : 0;
  
  return {
    reviews,
    total,
    page,
    limit,
    ratingSummary: {
      average: parseFloat(averageRating),
      total: totalCount,
      distribution,
    },
  };
};

/**
 * Instance method to mark as helpful
 */
reviewSchema.methods.markHelpful = async function(userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count += 1;
    return this.save();
  }
  return this;
};

/**
 * Instance method to add reply
 */
reviewSchema.methods.addReply = async function(comment, repliedBy) {
  this.reply = {
    comment,
    repliedAt: new Date(),
    repliedBy,
  };
  return this.save();
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
