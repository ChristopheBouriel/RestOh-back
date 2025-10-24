const express = require('express');
const {
  getTables,
  getTableAvailabilityForDate,
  getAvailableTables,
  getTable,
  updateTable,
  addBookingToTable,
  removeBookingFromTable,
  initializeTables
} = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (authenticated users)
router.get('/availability', getTableAvailabilityForDate);
router.get('/available', getAvailableTables);

// Admin only routes
router.get('/', authorize('admin'), getTables);
router.get('/:id', authorize('admin'), getTable);
router.put('/:id', authorize('admin'), updateTable);
// router.post('/:id/bookings', authorize('admin'), addBookingToTable);
// router.delete('/:id/bookings', authorize('admin'), removeBookingFromTable);
router.post('/initialize', authorize('admin'), initializeTables);

module.exports = router;