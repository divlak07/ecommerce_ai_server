const { Product, Category } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Product Controller
 * Handles product-related operations
 */

/**
 * @desc    Get all products with filters and pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    sort = '-createdAt',
    category,
    minPrice,
    maxPrice,
    search,
    badge,
    featured,
    inStock,
  } = req.query;

  // Build query
  const query = { isActive: true };

  if (category) {
    query.category = category;
  }

  if (badge) {
    query.badge = badge;
  }

  if (featured === 'true') {
    query.isFeatured = true;
  }

  if (inStock === 'true') {
    query.quantity = { $gt: 0 };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
  }

  if (search) {
    query.$text = { $search: search };
  }

  // Execute query with pagination
  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug icon')
      .sort(search ? { score: { $meta: 'textScore' } } : sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Product.countDocuments(query),
  ]);

  ApiResponse.paginated(res, products, page, limit, total, 'Products retrieved successfully');
});

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id)
    .populate('category', 'name slug icon');

  if (!product || !product.isActive) {
    throw new AppError('Product not found', 404);
  }

  // Increment views
  await product.incrementViews();

  ApiResponse.success(res, 200, 'Product retrieved successfully', { product });
});

/**
 * @desc    Get single product by slug
 * @route   GET /api/products/slug/:slug
 * @access  Public
 */
const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const product = await Product.findOne({ slug, isActive: true })
    .populate('category', 'name slug icon');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Increment views
  await product.incrementViews();

  ApiResponse.success(res, 200, 'Product retrieved successfully', { product });
});

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured/list
 * @access  Public
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query;

  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug icon')
    .limit(Number(limit))
    .lean();

  ApiResponse.success(res, 200, 'Featured products retrieved successfully', { products });
});

/**
 * @desc    Get products by category
 * @route   GET /api/products/category/:categoryId
 * @access  Public
 */
const getProductsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 12, sort = '-createdAt' } = req.query;

  const result = await Product.getByCategory(categoryId, {
    page: Number(page),
    limit: Number(limit),
    sort,
  });

  ApiResponse.paginated(
    res,
    result.products,
    result.page,
    result.limit,
    result.total,
    'Products retrieved successfully'
  );
});

/**
 * @desc    Search products
 * @route   GET /api/products/search/query
 * @access  Public
 */
const searchProducts = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 12, category, minPrice, maxPrice } = req.query;

  if (!q) {
    throw new AppError('Search query is required', 400);
  }

  const result = await Product.search(q, {
    page: Number(page),
    limit: Number(limit),
    category,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  });

  ApiResponse.paginated(
    res,
    result.products,
    result.page,
    result.limit,
    result.total,
    'Search results retrieved successfully'
  );
});

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const productData = {
    ...req.body,
    createdBy: req.userId,
  };

  const product = await Product.create(productData);

  await product.populate('category', 'name slug icon');

  ApiResponse.success(res, 201, 'Product created successfully', { product });
});

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  ).populate('category', 'name slug icon');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  ApiResponse.success(res, 200, 'Product updated successfully', { product });
});

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  ApiResponse.success(res, 200, 'Product deleted successfully');
});

/**
 * @desc    Get related products
 * @route   GET /api/products/:id/related
 * @access  Public
 */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 4 } = req.query;

  const product = await Product.findById(id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const relatedProducts = await Product.find({
    _id: { $ne: id },
    category: product.category,
    isActive: true,
  })
    .populate('category', 'name slug icon')
    .limit(Number(limit))
    .lean();

  ApiResponse.success(res, 200, 'Related products retrieved successfully', {
    products: relatedProducts,
  });
});

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
};
