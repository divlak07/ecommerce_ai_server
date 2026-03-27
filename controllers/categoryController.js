const { Category } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Category Controller
 * Handles category-related operations
 */

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const { includeInactive, tree } = req.query;

  // If tree view requested, return hierarchical structure
  if (tree === 'true') {
    const categories = await Category.getCategoryTree();
    return ApiResponse.success(res, 200, 'Categories retrieved successfully', {
      categories,
    });
  }

  const query = includeInactive === 'true' ? {} : { isActive: true };

  const categories = await Category.find(query)
    .populate('subcategories', 'name slug icon')
    .sort({ displayOrder: 1, name: 1 })
    .lean();

  ApiResponse.success(res, 200, 'Categories retrieved successfully', {
    categories,
  });
});

/**
 * @desc    Get category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id)
    .populate('subcategories', 'name slug icon')
    .populate('parentCategory', 'name slug');

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  ApiResponse.success(res, 200, 'Category retrieved successfully', { category });
});

/**
 * @desc    Get category by slug
 * @route   GET /api/categories/slug/:slug
 * @access  Public
 */
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const category = await Category.findOne({ slug, isActive: true })
    .populate('subcategories', 'name slug icon')
    .populate('parentCategory', 'name slug');

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  ApiResponse.success(res, 200, 'Category retrieved successfully', { category });
});

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);

  ApiResponse.success(res, 201, 'Category created successfully', { category });
});

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  ApiResponse.success(res, 200, 'Category updated successfully', { category });
});

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if category has subcategories
  const hasSubcategories = await Category.exists({ parentCategory: id });
  if (hasSubcategories) {
    throw new AppError('Cannot delete category with subcategories', 400);
  }

  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  ApiResponse.success(res, 200, 'Category deleted successfully');
});

/**
 * @desc    Toggle category active status
 * @route   PATCH /api/categories/:id/toggle
 * @access  Private/Admin
 */
const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  category.isActive = !category.isActive;
  await category.save();

  ApiResponse.success(res, 200, `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`, {
    category,
  });
});

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
};
