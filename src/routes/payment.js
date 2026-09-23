// server/routes/payment.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.rzp_test_SPP4ufDhAiF2wQ,
  key_secret: process.env.hf2yd9478VQxNPq6aBbi9j26
});

// ==================== STRIPE PAYMENT ROUTES ====================

/**
 * Create Stripe Payment Intent
 * POST /api/payments/stripe/create-intent
 */
router.post('/stripe/create-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', paymentMethodType = 'card', bookingId, metadata = {} } = req.body;

    // Validate amount
    if (!amount || amount < 0.5) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid amount. Minimum amount is $0.50' 
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: [paymentMethodType],
      metadata: {
        integration_check: 'accept_a_payment',
        bookingId: bookingId || 'N/A',
        ...metadata
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('Stripe Payment Intent Error:', error);
    
    // Handle specific Stripe errors
    switch (error.type) {
      case 'StripeCardError':
        return res.status(400).json({ 
          success: false,
          error: 'Your card was declined',
          code: 'card_declined'
        });
      case 'StripeInvalidRequestError':
        return res.status(400).json({ 
          success: false,
          error: 'Invalid payment parameters',
          code: 'invalid_request'
        });
      case 'StripeAPIError':
        return res.status(500).json({ 
          success: false,
          error: 'Payment service error',
          code: 'service_error'
        });
      default:
        return res.status(500).json({ 
          success: false,
          error: 'Payment processing failed',
          code: 'unknown_error'
        });
    }
  }
});

/**
 * Confirm Stripe Payment
 * POST /api/payments/stripe/confirm
 */
router.post('/stripe/confirm', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      success: true,
      status: paymentIntent.status,
      paymentIntent
    });

  } catch (error) {
    console.error('Stripe Confirm Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
      code: error.code
    });
  }
});

// ==================== RAZORPAY PAYMENT ROUTES ====================

/**
 * Create Razorpay Order
 * POST /api/payments/razorpay/create-order
 */
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', bookingId, notes = {} } = req.body;

    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Minimum amount is ₹1'
      });
    }

    // Convert to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: currency.toUpperCase(),
      receipt: `receipt_${bookingId || 'test'}_${Date.now()}`,
      payment_capture: 1, // Auto capture
      notes: {
        bookingId: bookingId || 'N/A',
        ...notes
      }
    };

    console.log('Creating Razorpay order:', options);

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created:', order.id);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });

  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    
    // Handle specific Razorpay errors
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        code: 'invalid_request',
        details: error.error
      });
    }
    
    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Razorpay API keys',
        code: 'invalid_keys'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create payment order',
      code: 'order_creation_failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Verify Razorpay Payment
 * POST /api/payments/razorpay/verify
 */
router.post('/razorpay/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters'
      });
    }

    // Create signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('Verifying payment:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signatureMatch: expectedSignature === razorpay_signature
    });

    // Verify signature
    if (expectedSignature === razorpay_signature) {
      // Payment is verified
      // Here you would update booking status in database
      // and add payment record

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          razorpay_order_id,
          razorpay_payment_id,
          bookingId: bookingId || 'N/A',
          verified: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid signature',
        code: 'invalid_signature'
      });
    }
  } catch (error) {
    console.error('Razorpay Verification Error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      code: 'verification_failed'
    });
  }
});

/**
 * Get Razorpay Payment Details
 * GET /api/payments/razorpay/payment/:paymentId
 */
router.get('/razorpay/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // You would typically fetch this from your database
    // For now, return mock data
    res.json({
      success: true,
      payment: {
        id: paymentId,
        status: 'captured',
        amount: 10000,
        currency: 'INR',
        method: 'card',
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details'
    });
  }
});

// ==================== COMMON PAYMENT ROUTES ====================

/**
 * Get Payment History
 * GET /api/payments/history
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.id; // Assuming auth middleware
    
    // Here you would fetch payments from database
    // For now, return mock data
    const payments = [
      {
        id: 'PAY_001',
        amount: 5000,
        currency: 'INR',
        status: 'success',
        method: 'razorpay',
        date: '2024-01-15T10:30:00Z',
        bookingId: 'BK_001'
      },
      {
        id: 'PAY_002',
        amount: 2500,
        currency: 'INR',
        status: 'success',
        method: 'stripe',
        date: '2024-01-10T15:45:00Z',
        bookingId: 'BK_002'
      }
    ];

    res.json({
      success: true,
      payments,
      total: payments.length
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

/**
 * Get Payment by ID
 * GET /api/payments/:paymentId
 */
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Here you would fetch payment from database
    res.json({
      success: true,
      payment: {
        id: paymentId,
        amount: 5000,
        currency: 'INR',
        status: 'success',
        method: 'razorpay',
        created_at: '2024-01-15T10:30:00Z',
        bookingId: 'BK_001'
      }
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details'
    });
  }
});

/**
 * Refund Payment
 * POST /api/payments/:paymentId/refund
 */
router.post('/:paymentId/refund', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    // Here you would process refund through appropriate gateway
    res.json({
      success: true,
      message: 'Refund initiated successfully',
      refundId: `REF_${Date.now()}`,
      amount: amount || 'full',
      status: 'processing'
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process refund'
    });
  }
});

module.exports = router;