/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors and pass them to Express error middleware
 * Eliminates need for try-catch blocks in every controller function
 */

/**
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
