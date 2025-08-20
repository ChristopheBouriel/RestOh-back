const express = require('express');
const {
  adminLogin,
  getDashboardStats,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public admin routes
router.post('/login', adminLogin);

// Protected admin routes
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);

module.exports = router;