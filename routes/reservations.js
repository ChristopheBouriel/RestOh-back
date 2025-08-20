const express = require('express');
const {
  createReservation,
  getUserReservations,
  getAdminReservations,
  updateAdminReservation,
  getReservationStats,
} = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// User routes
router.post('/', createReservation);
router.get('/', getUserReservations);

// Admin routes
router.get('/admin/all', authorize('admin'), getAdminReservations);
router.get('/admin/stats', authorize('admin'), getReservationStats);
router.put('/admin/:id', authorize('admin'), updateAdminReservation);

module.exports = router;