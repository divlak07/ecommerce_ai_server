const express = require('express');
const { authController } = require('../controllers');
const { authenticate } = require('../middleware/auth');
const { authValidators } = require('../middleware/validator');

const router = express.Router();

/**
 * Auth Routes
 * Base path: /api/auth
 */

// Public routes
router.post('/register', authValidators.register, authController.register);
router.post('/login', authValidators.login, authController.login);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authValidators.updateProfile, authController.updateProfile);
router.put('/change-password', authenticate, authValidators.changePassword, authController.changePassword);

// Address routes
router.post('/addresses', authenticate, authController.addAddress);
router.put('/addresses/:addressId', authenticate, authController.updateAddress);
router.delete('/addresses/:addressId', authenticate, authController.deleteAddress);

// Wishlist routes
router.get('/wishlist', authenticate, authController.getWishlist);
router.post('/wishlist/:productId', authenticate, authController.addToWishlist);
router.delete('/wishlist/:productId', authenticate, authController.removeFromWishlist);

module.exports = router;
