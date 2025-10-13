const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  addOrderReview,
  getAdminOrders,
  updateAdminOrderStatus,
  getOrderStats,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Admin routes - MUST be before /:id routes to avoid conflicts
router.get('/admin', authorize('admin'), getAdminOrders);
router.get('/admin/stats', authorize('admin'), getOrderStats);
router.patch('/admin/:id/status', authorize('admin'), updateAdminOrderStatus);

// User routes
router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/review', addOrderReview);
router.patch('/:id/status', authorize('admin'), updateOrderStatus);

module.exports = router;