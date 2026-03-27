const express = require('express');
const { productController, reviewController } = require('../controllers');
const { authenticate, adminOnly } = require('../middleware/auth');
const { productValidators } = require('../middleware/validator');

const router = express.Router();

/**
 * Product Routes
 * Base path: /api/products
 */

// Public routes
router.get('/', productValidators.list, productController.getProducts);
router.get('/featured/list', productController.getFeaturedProducts);
router.get('/search/query', productController.searchProducts);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/slug/:slug', productController.getProductBySlug);
router.get('/:id/related', productController.getRelatedProducts);
router.get('/:id', productValidators.getById, productController.getProductById);

// Protected admin routes
router.post('/', authenticate, adminOnly, productValidators.create, productController.createProduct);
router.put('/:id', authenticate, adminOnly, productValidators.update, productController.updateProduct);
router.delete('/:id', authenticate, adminOnly, productController.deleteProduct);

// Review routes (nested under products)
router.get('/:productId/reviews', reviewController.getProductReviews);
router.post('/:productId/reviews', authenticate, reviewController.createReview);

module.exports = router;
