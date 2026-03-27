const { Review, Product, Order } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Review Controller
 * Handles product review operations
 */

/**
 * @desc    Get reviews for a product
 * @route   GET /api/products/:productId/reviews
 * @access  Public
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const result = await Review.getByProduct(productId, {
    page: Number(page),
    limit: Number(limit),
    sort,
  });

  ApiResponse.success(res, 200, 'Reviews retrieved successfully', result);
});

/**
 * @desc    Create a review
 * @route   POST /api/products/:productId/reviews
 * @access  Private
 */
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, comment, images, orderId } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({
    product: productId,
    user: req.userId,
  });

  if (existingReview) {
    throw new AppError('You have already reviewed this product', 400);
  }

  // Check if user has purchased this product (optional verification)
  let isVerifiedPurchase = false;
  if (orderId) {
    const order = await Order.findOne({
      _id: orderId,
      user: req.userId,
      status: 'delivered',
      'items.product': productId,
    });
    isVerifiedPurchase = !!order;
  }

  // Create review
  const review = await Review.create({
    product: productId,
    user: req.userId,
    order: orderId || null,
    rating,
    title: title || '',
    comment,
    images: images || [],
    isVerifiedPurchase,
  });

  // Update product rating
  await product.updateRating(rating);

  await review.populate('user', 'firstName lastName avatar');

  ApiResponse.success(res, 201, 'Review submitted successfully', { review });
});

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, title, comment, images } = req.body;

  const review = await Review.findOne({
    _id: id,
    user: req.userId,
  });

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  // Update fields
  if (rating) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment) review.comment = comment;
  if (images) review.images = images;

  await review.save();

  await review.populate('user', 'firstName lastName avatar');

  ApiResponse.success(res, 200, 'Review updated successfully', { review });
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findOne({
    _id: id,
    user: req.userId,
  });

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  review.isActive = false;
  await review.save();

  ApiResponse.success(res, 200, 'Review deleted successfully');
});

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
const markHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  await review.markHelpful(req.userId);

  ApiResponse.success(res, 200, 'Review marked as helpful', {
    helpfulCount: review.helpful.count,
  });
});

/**
 * @desc    Get user's reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ user: req.userId, isActive: true })
      .populate('product', 'name slug emoji primaryImage')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments({ user: req.userId, isActive: true }),
  ]);

  ApiResponse.paginated(res, reviews, page, limit, total, 'Your reviews retrieved');
});

// ==================== ADMIN CONTROLLERS ====================

/**
 * @desc    Reply to a review (Admin)
 * @route   POST /api/reviews/:id/reply
 * @access  Private/Admin
 */
const replyToReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  const review = await Review.findById(id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  await review.addReply(comment, req.userId);

  ApiResponse.success(res, 200, 'Reply added successfully', { review });
});

/**
 * @desc    Moderate review (Admin)
 * @route   PUT /api/reviews/:id/moderate
 * @access  Private/Admin
 */
const moderateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const review = await Review.findById(id);

  if (!review) {
    throw new AppError('Review not found', 404);
  }

  review.isActive = isActive;
  await review.save();

  ApiResponse.success(res, 200, `Review ${isActive ? 'approved' : 'hidden'}`, { review });
});

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getMyReviews,
  replyToReview,
  moderateReview,
};
