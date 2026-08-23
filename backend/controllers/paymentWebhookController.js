const Payment = require('../models/Payment');
const EventRegistration = require('../models/EventRegistration');
const { verifyWebhookSignature } = require('../services/razorpayService');

// @desc    Razorpay Webhook Handler
// @route   POST /api/payments/razorpay/webhook
// @access  Public (Signature Verified)
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // If a webhook secret is configured, verify signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('⚠️ Razorpay webhook signature verification failed.');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const { event: webhookEvent, payload } = req.body;
    const paymentEntity = payload?.payment?.entity;
    const orderEntity = payload?.order?.entity;

    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      // Event without order ID (e.g. standard ping)
      return res.status(200).json({ status: 'ignored' });
    }

    let payment = await Payment.findOne({ razorpayOrderId: orderId });

    if (webhookEvent === 'payment.captured' || webhookEvent === 'order.paid') {
      if (payment) {
        // Idempotent check
        if (payment.status !== 'paid') {
          payment.status = 'paid';
          payment.razorpayPaymentId = paymentId || payment.razorpayPaymentId;
          payment.paidAt = new Date();
          payment.webhookEvents.push({
            event: webhookEvent,
            receivedAt: new Date(),
            payload: req.body,
          });
          await payment.save();

          // Ensure registration is marked confirmed and paid
          let registration = await EventRegistration.findOne({
            event: payment.event,
            student: payment.student,
          });

          if (registration) {
            registration.registrationStatus = 'confirmed';
            registration.paymentStatus = 'paid';
            registration.payment = payment._id;
            await registration.save();
          } else {
            registration = await EventRegistration.create({
              event: payment.event,
              student: payment.student,
              registrationStatus: 'confirmed',
              paymentStatus: 'paid',
              payment: payment._id,
              registeredAt: new Date(),
            });
            payment.registration = registration._id;
            await payment.save();
          }
        }
      }
    } else if (webhookEvent === 'payment.failed') {
      if (payment && payment.status !== 'paid') {
        payment.status = 'failed';
        payment.failureReason = paymentEntity?.error_description || 'Payment failed via webhook notification';
        payment.webhookEvents.push({
          event: webhookEvent,
          receivedAt: new Date(),
          payload: req.body,
        });
        await payment.save();
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error handling Razorpay webhook:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
};
