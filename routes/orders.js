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

// User routes
router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.post('/:id/review', addOrderReview);

// Admin routes
router.get('/admin/all', authorize('admin'), getAdminOrders);
router.get('/admin/stats', authorize('admin'), getOrderStats);
router.put('/admin/:id/status', authorize('admin'), updateAdminOrderStatus);
router.put('/:id/status', authorize('admin'), updateOrderStatus);

module.exports = router;