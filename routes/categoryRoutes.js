const express = require('express');
const { categoryController } = require('../controllers');
const { authenticate, adminOnly } = require('../middleware/auth');
const { categoryValidators } = require('../middleware/validator');

const router = express.Router();

/**
 * Category Routes
 * Base path: /api/categories
 */

// Public routes
router.get('/', categoryController.getCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:id', categoryController.getCategoryById);

// Protected admin routes
router.post('/', authenticate, adminOnly, categoryValidators.create, categoryController.createCategory);
router.put('/:id', authenticate, adminOnly, categoryValidators.update, categoryController.updateCategory);
router.delete('/:id', authenticate, adminOnly, categoryController.deleteCategory);
router.patch('/:id/toggle', authenticate, adminOnly, categoryController.toggleCategoryStatus);

module.exports = router;
