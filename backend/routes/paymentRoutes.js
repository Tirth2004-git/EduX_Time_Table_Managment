const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook } = require('../controllers/paymentWebhookController');

// Razorpay Webhook listener (Signature verified)
router.post('/razorpay/webhook', handleRazorpayWebhook);

module.exports = router;
