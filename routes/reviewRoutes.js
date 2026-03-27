const express = require('express');
const { reviewController } = require('../controllers');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * Review Routes
 * Base path: /api/reviews
 */

// Public routes
// Note: Product reviews are accessed via /api/products/:productId/reviews

// Protected user routes
router.get('/my-reviews', authenticate, reviewController.getMyReviews);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);
router.post('/:id/helpful', authenticate, reviewController.markHelpful);

// Protected admin routes
router.post('/:id/reply', authenticate, adminOnly, reviewController.replyToReview);
router.put('/:id/moderate', authenticate, adminOnly, reviewController.moderateReview);

module.exports = router;
