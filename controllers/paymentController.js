const Stripe = require('stripe');
const asyncHandler = require('../utils/asyncHandler');

// Initialize payment gateway
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo_key'); // Demo key


// @desc    Create Stripe payment intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
const createStripePaymentIntent = asyncHandler(async (req, res) => {
  const { amount, currency = 'usd' } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount is required',
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe expects amount in cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message,
    });
  }
});

// @desc    Confirm Stripe payment
// @route   POST /api/payments/stripe/confirm
// @access  Private
const confirmStripePayment = asyncHandler(async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return res.status(400).json({
      success: false,
      message: 'Payment intent ID is required',
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: paymentIntent.status,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message,
    });
  }
});


// @desc    Get payment methods
// @route   GET /api/payments/methods
// @access  Private
const getPaymentMethods = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      methods: [
        {
          id: 'stripe',
          name: 'Stripe (Cards)',
          type: 'gateway',
          currencies: ['USD', 'EUR', 'GBP'],
          enabled: true,
        },
        {
          id: 'cod',
          name: 'Cash on Delivery',
          type: 'offline',
          currencies: ['USD', 'EUR', 'GBP'],
          enabled: true,
        },
      ],
    },
  });
});

module.exports = {
  createStripePaymentIntent,
  confirmStripePayment,
  getPaymentMethods,
};