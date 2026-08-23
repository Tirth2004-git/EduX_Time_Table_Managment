const mongoose = require('mongoose');

const PAYMENT_STATUSES = [
  'created',
  'pending',
  'authorized',
  'paid',
  'failed',
  'cancelled',
  'refunded',
];

const paymentSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event is required'],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EventRegistration',
      default: null,
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay Order ID is required'],
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'created',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: '',
    },
    webhookEvents: [
      {
        event: String,
        receivedAt: { type: Date, default: Date.now },
        payload: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

paymentSchema.index({ event: 1, student: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
