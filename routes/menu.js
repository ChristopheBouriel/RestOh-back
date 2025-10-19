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
const { uploadMenuImage } = require('../middleware/cloudinaryUpload');

const router = express.Router();

// Public routes
router.get('/', getMenuItems);
router.get('/popular', getPopularItems);
router.get('/:id', getMenuItem);

// Protected routes
router.post('/:id/review', protect, addReview);

// Admin only routes
router.post('/', protect, authorize('admin'), uploadMenuImage, createMenuItem);
router.put('/:id', protect, authorize('admin'), uploadMenuImage, updateMenuItem);
router.delete('/:id', protect, authorize('admin'), deleteMenuItem);

module.exports = router;