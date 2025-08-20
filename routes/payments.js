const express = require('express');
const {
  createStripePaymentIntent,
  confirmStripePayment,
  getPaymentMethods,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All payment routes require authentication
router.use(protect);

// Payment methods
router.get('/methods', getPaymentMethods);

// Stripe routes
router.post('/stripe/create-intent', createStripePaymentIntent);
router.post('/stripe/confirm', confirmStripePayment);

module.exports = router;