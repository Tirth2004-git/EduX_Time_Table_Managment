const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema(
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
    registrationStatus: {
      type: String,
      enum: ['confirmed', 'cancelled', 'attended'],
      default: 'confirmed',
    },
    paymentStatus: {
      type: String,
      enum: ['free', 'pending', 'paid', 'failed', 'refunded'],
      default: 'free',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    ticketId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    attendedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure a student can only register once per event
eventRegistrationSchema.index({ event: 1, student: 1 }, { unique: true });
eventRegistrationSchema.index({ student: 1, registrationStatus: 1 });
eventRegistrationSchema.index({ event: 1, registrationStatus: 1 });

module.exports =
  mongoose.models.EventRegistration ||
  mongoose.model('EventRegistration', eventRegistrationSchema);
