const express = require('express');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  addReview,
  getPopularItems,
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingleImage, handleUploadError } = require('../middleware/imageUpload');

const router = express.Router();

// Public routes
router.get('/', getMenuItems);
router.get('/popular', getPopularItems);
router.get('/:id', getMenuItem);

// Protected routes
router.post('/:id/reviews', protect, addReview);

// Admin only routes
router.post('/', protect, authorize('admin'), uploadSingleImage, handleUploadError, createMenuItem);
router.put('/:id', protect, authorize('admin'), uploadSingleImage, handleUploadError, updateMenuItem);
router.delete('/:id', protect, authorize('admin'), deleteMenuItem);

module.exports = router;