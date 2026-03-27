const { User } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Auth Controller
 * Handles user authentication operations
 */

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already registered. Please log in.', 400);
  }

  // Create new user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    phone,
  });

  // Generate token
  const token = user.generateAuthToken();

  // Return user data (excluding password)
  ApiResponse.success(res, 201, 'Account created successfully', {
    user: user.toPublicProfile(),
    token,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and explicitly select password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate token
  const token = user.generateAuthToken();

  ApiResponse.success(res, 200, 'Login successful', {
    user: user.toPublicProfile(),
    token,
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId)
    .populate('wishlist', 'name slug price emoji primaryImage rating');

  ApiResponse.success(res, 200, 'Profile retrieved successfully', {
    user: user.toPublicProfile(),
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.userId,
    {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone }),
      ...(avatar && { avatar }),
    },
    { new: true, runValidators: true }
  );

  ApiResponse.success(res, 200, 'Profile updated successfully', {
    user: user.toPublicProfile(),
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = user.generateAuthToken();

  ApiResponse.success(res, 200, 'Password changed successfully', { token });
});

/**
 * @desc    Add address to user
 * @route   POST /api/auth/addresses
 * @access  Private
 */
const addAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zipCode, country, isDefault, label } = req.body;

  const user = await User.findById(req.userId);

  // If setting as default, remove default from other addresses
  if (isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  user.addresses.push({
    street,
    city,
    state,
    zipCode,
    country: country || 'USA',
    isDefault: isDefault || false,
    label: label || 'home',
  });

  await user.save();

  ApiResponse.success(res, 201, 'Address added successfully', {
    addresses: user.addresses,
  });
});

/**
 * @desc    Update address
 * @route   PUT /api/auth/addresses/:addressId
 * @access  Private
 */
const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const updates = req.body;

  const user = await User.findById(req.userId);

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new AppError('Address not found', 404);
  }

  // If setting as default, remove default from other addresses
  if (updates.isDefault) {
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  Object.assign(address, updates);
  await user.save();

  ApiResponse.success(res, 200, 'Address updated successfully', {
    addresses: user.addresses,
  });
});

/**
 * @desc    Delete address
 * @route   DELETE /api/auth/addresses/:addressId
 * @access  Private
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.userId);

  const address = user.addresses.id(addressId);
  if (!address) {
    throw new AppError('Address not found', 404);
  }

  address.deleteOne();
  await user.save();

  ApiResponse.success(res, 200, 'Address deleted successfully', {
    addresses: user.addresses,
  });
});

/**
 * @desc    Add product to wishlist
 * @route   POST /api/auth/wishlist/:productId
 * @access  Private
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const user = await User.findById(req.userId);

  // Check if already in wishlist
  if (user.wishlist.includes(productId)) {
    throw new AppError('Product already in wishlist', 400);
  }

  user.wishlist.push(productId);
  await user.save();

  ApiResponse.success(res, 200, 'Added to wishlist', {
    wishlist: user.wishlist,
  });
});

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/auth/wishlist/:productId
 * @access  Private
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const user = await User.findById(req.userId);

  user.wishlist = user.wishlist.filter(
    id => id.toString() !== productId
  );
  await user.save();

  ApiResponse.success(res, 200, 'Removed from wishlist', {
    wishlist: user.wishlist,
  });
});

/**
 * @desc    Get user's wishlist
 * @route   GET /api/auth/wishlist
 * @access  Private
 */
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId)
    .populate('wishlist', 'name slug price emoji primaryImage rating badge');

  ApiResponse.success(res, 200, 'Wishlist retrieved successfully', {
    wishlist: user.wishlist,
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};
