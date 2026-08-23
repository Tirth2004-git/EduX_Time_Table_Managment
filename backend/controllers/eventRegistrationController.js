const crypto = require('crypto');
const Event = require('../models/Event');
const Organization = require('../models/Organization');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPublicKeyId,
} = require('../services/razorpayService');
const { sendEventTicketEmail } = require('../services/emailService');

// Helper: Check student eligibility
function isStudentEligible(student, event) {
  if (!student || !event) return false;
  if (event.targetAudienceType === 'all') return true;

  const studentDept = student.department_id ? student.department_id.toString() : null;
  const studentSem = student.semester_id ? student.semester_id.toString() : null;
  const studentDiv = student.division_id ? student.division_id.toString() : null;

  if (event.targetDepartment && studentDept !== event.targetDepartment.toString()) {
    return false;
  }

  if (event.targetSemester && studentSem !== event.targetSemester.toString()) {
    return false;
  }

  if (event.targetDivisions && event.targetDivisions.length > 0) {
    const divIds = event.targetDivisions.map((d) => (d._id || d).toString());
    if (!studentDiv || !divIds.includes(studentDiv)) {
      return false;
    }
  }

  return true;
}

// Helper: Generate Unique Ticket Identifier (e.g. EDUX-PY-7A9B2C or EDUX-A8F231)
function generateTicketId(eventTitle = '') {
  const prefix = eventTitle.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, 'EX') || 'EX';
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `EDUX-${prefix}-${randomHex}`;
}

// @desc    Register for a Free Event
// @route   POST /api/events/:id/register
// @access  Private (Student only)
exports.registerFreeEvent = async (req, res, next) => {
  try {
    const student = await User.findById(req.user.userId);
    if (!student || student.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only registered students can register for events.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    if (event.status !== 'Published') {
      return res.status(400).json({ success: false, error: 'This event is not currently open for registration.' });
    }

    if (event.isPaid && event.registrationFee > 0) {
      return res.status(400).json({
        success: false,
        error: 'This is a paid event. Please complete the payment checkout to register.',
      });
    }

    // Verify academic eligibility
    if (!isStudentEligible(student, event)) {
      return res.status(403).json({
        success: false,
        error: 'You are not eligible for this event based on your department/semester/division.',
      });
    }

    // Verify deadline
    if (new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({ success: false, error: 'Registration deadline for this event has passed.' });
    }

    // Verify capacity
    if (event.capacity > 0) {
      const currentCount = await EventRegistration.countDocuments({
        event: event._id,
        registrationStatus: { $ne: 'cancelled' },
      });
      if (currentCount >= event.capacity) {
        return res.status(400).json({ success: false, error: 'This event has reached its maximum registration capacity.' });
      }
    }

    // Check duplicate registration
    let registration = await EventRegistration.findOne({
      event: event._id,
      student: student._id,
    });

    if (registration) {
      if (registration.registrationStatus === 'cancelled') {
        registration.registrationStatus = 'confirmed';
        registration.paymentStatus = 'free';
        registration.registeredAt = new Date();
        if (!registration.ticketId) {
          registration.ticketId = generateTicketId(event.title);
        }
        await registration.save();

        // Send confirmation ticket email
        sendEventTicketEmail(student.email, student.name, event, registration.ticketId, null, 0)
          .catch((err) => console.error('Ticket email failed:', err.message));

        return res.json({
          success: true,
          message: 'Registration confirmed!',
          data: registration,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'You are already registered for this event.',
        ticketId: registration.ticketId,
      });
    }

    const ticketId = generateTicketId(event.title);

    registration = new EventRegistration({
      event: event._id,
      student: student._id,
      registrationStatus: 'confirmed',
      paymentStatus: 'free',
      ticketId,
      amountPaid: 0,
      emailStatus: 'pending',
      registeredAt: new Date(),
    });

    await registration.save();

    // Send Ticket Email asynchronously
    try {
      const emailRes = await sendEventTicketEmail(student.email, student.name, event, ticketId, null, 0);
      registration.emailStatus = emailRes?.success ? 'sent' : 'failed';
      await registration.save();
    } catch (mailErr) {
      console.error('Ticket email error for free registration:', mailErr.message);
      registration.emailStatus = 'failed';
      await registration.save();
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your ticket has been confirmed.',
      data: registration,
      registration: registration,
      ticketId: registration.ticketId,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'You are already registered for this event.',
      });
    }
    next(error);
  }
};

// @desc    Create Razorpay Order for Paid Event Registration
// @route   POST /api/events/:id/create-order
// @access  Private (Student only)
exports.createEventPaymentOrder = async (req, res, next) => {
  try {
    const student = await User.findById(req.user.userId);
    if (!student || student.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only registered students can register for events.' });
    }

    const event = await Event.findById(req.params.id).populate('organization', 'name');
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    if (event.status !== 'Published') {
      return res.status(400).json({ success: false, error: 'This event is not open for registration.' });
    }

    if (!event.isPaid || event.registrationFee <= 0) {
      return res.status(400).json({ success: false, error: 'This event is free. Please use standard registration.' });
    }

    // Verify academic eligibility
    if (!isStudentEligible(student, event)) {
      return res.status(403).json({
        success: false,
        error: 'You are not eligible for this event based on your department/semester/division.',
      });
    }

    // Verify deadline
    if (new Date(event.registrationDeadline) < new Date()) {
      return res.status(400).json({ success: false, error: 'Registration deadline for this event has passed.' });
    }

    // Verify capacity
    if (event.capacity > 0) {
      const currentCount = await EventRegistration.countDocuments({
        event: event._id,
        registrationStatus: { $ne: 'cancelled' },
      });
      if (currentCount >= event.capacity) {
        return res.status(400).json({ success: false, error: 'This event has reached its maximum registration capacity.' });
      }
    }

    // Check duplicate active paid registration
    const existingRegistration = await EventRegistration.findOne({
      event: event._id,
      student: student._id,
      registrationStatus: 'confirmed',
      paymentStatus: 'paid',
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'You have already registered and paid for this event.',
        ticketId: existingRegistration.ticketId,
      });
    }

    // Amount fetched directly from Event database record (never trusted from frontend)
    const amountInRupees = event.registrationFee;
    const receiptId = `rcpt_${event._id.toString().slice(-4)}_${student._id.toString().slice(-4)}_${Date.now()}`.slice(0, 40);

    const razorpayOrder = await createRazorpayOrder({
      amountInRupees,
      currency: event.currency || 'INR',
      receipt: receiptId,
      notes: {
        eventId: event._id.toString(),
        eventTitle: event.title,
        studentId: student._id.toString(),
        studentEmail: student.email,
      },
    });

    // Create a pending payment record in DB
    const payment = new Payment({
      event: event._id,
      student: student._id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInRupees,
      currency: event.currency || 'INR',
      status: 'created',
    });
    await payment.save();

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paise
      amountInRupees,
      currency: razorpayOrder.currency,
      keyId: getPublicKeyId(),
      event: {
        id: event._id,
        title: event.title,
        organization: event.organization?.name || 'EduX',
        fee: amountInRupees,
      },
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    next(error);
  }
};

// @desc    Verify Razorpay Payment, Confirm Registration, and Issue Ticket
// @route   POST /api/events/:id/verify-payment
// @access  Private (Student only)
exports.verifyEventPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required Razorpay payment verification parameters.',
      });
    }

    const student = await User.findById(req.user.userId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    // 1. Verify cryptographic HMAC-SHA256 signature
    const isSignatureValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    let payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

    if (!isSignatureValid) {
      if (payment) {
        payment.status = 'failed';
        payment.failureReason = 'Cryptographic signature verification failed';
        payment.razorpayPaymentId = razorpay_payment_id;
        await payment.save();
      }
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed. Invalid transaction signature.',
      });
    }

    // Check if payment was already processed
    if (payment && payment.status === 'paid') {
      const reg = await EventRegistration.findOne({ event: event._id, student: student._id });
      return res.json({
        success: true,
        message: 'Payment verified and registration confirmed!',
        data: {
          registration: reg,
          payment,
        },
      });
    }

    if (!payment) {
      payment = new Payment({
        event: event._id,
        student: student._id,
        razorpayOrderId: razorpay_order_id,
        amount: event.registrationFee,
        currency: event.currency || 'INR',
      });
    }

    // 2. Mark payment record as PAID
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    // 3. Generate Unique Ticket ID
    const ticketId = generateTicketId(event.title);

    // 4. Create or update EventRegistration record
    let registration = await EventRegistration.findOne({
      event: event._id,
      student: student._id,
    });

    if (registration) {
      registration.registrationStatus = 'confirmed';
      registration.paymentStatus = 'paid';
      registration.payment = payment._id;
      registration.ticketId = registration.ticketId || ticketId;
      registration.amountPaid = payment.amount;
      registration.registeredAt = new Date();
    } else {
      registration = new EventRegistration({
        event: event._id,
        student: student._id,
        registrationStatus: 'confirmed',
        paymentStatus: 'paid',
        payment: payment._id,
        ticketId,
        amountPaid: payment.amount,
        registeredAt: new Date(),
      });
    }

    await registration.save();

    payment.registration = registration._id;
    await payment.save();

    // 5. Send Transactional Ticket Email (Failure does NOT cancel paid booking)
    try {
      const mailRes = await sendEventTicketEmail(
        student.email,
        student.name,
        event,
        registration.ticketId,
        payment.razorpayPaymentId,
        payment.amount
      );
      registration.emailStatus = mailRes?.success ? 'sent' : 'failed';
      await registration.save();
    } catch (mailErr) {
      console.error('Failed to send confirmation email after payment:', mailErr.message);
      registration.emailStatus = 'failed';
      await registration.save();
    }

    res.json({
      success: true,
      message: 'Payment successful and event registration confirmed!',
      data: {
        registration,
        payment: {
          id: payment._id,
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paidAt: payment.paidAt,
        },
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    next(error);
  }
};

// @desc    Resend Event Ticket Email (Admin or Registered Student)
// @route   POST /api/events/:id/registrations/:registrationId/resend-email
// @access  Private
exports.resendTicketEmail = async (req, res, next) => {
  try {
    const { id: eventId, registrationId } = req.params;
    const registration = await EventRegistration.findById(registrationId)
      .populate('student')
      .populate('event')
      .populate('payment');

    if (!registration) {
      return res.status(404).json({ success: false, error: 'Registration record not found.' });
    }

    // Permission check: Admin or the student themselves
    if (req.user.role !== 'admin' && String(registration.student?._id) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized to resend this ticket email.' });
    }

    const student = registration.student;
    const event = registration.event;
    const payment = registration.payment;

    if (!student || !event) {
      return res.status(400).json({ success: false, error: 'Incomplete registration metadata.' });
    }

    const ticketId = registration.ticketId || generateTicketId(event.title);
    if (!registration.ticketId) {
      registration.ticketId = ticketId;
      await registration.save();
    }

    const amount = registration.amountPaid || payment?.amount || (event.isPaid ? event.registrationFee : 0);
    const paymentId = payment?.razorpayPaymentId || null;

    const emailRes = await sendEventTicketEmail(student.email, student.name, event, ticketId, paymentId, amount);

    registration.emailStatus = emailRes?.success ? 'sent' : 'failed';
    await registration.save();

    if (!emailRes?.success) {
      return res.status(500).json({
        success: false,
        error: emailRes?.error || 'Email service failed to deliver message.',
      });
    }

    res.json({
      success: true,
      message: `Ticket confirmation email resent to ${student.email}.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Student's Registered Events ("My Events")
// @route   GET /api/events/student/my-events
// @access  Private (Student only)
exports.getMyEvents = async (req, res, next) => {
  try {
    const studentId = req.user.userId;

    const registrations = await EventRegistration.find({
      student: studentId,
      registrationStatus: { $ne: 'cancelled' },
    })
      .populate({
        path: 'event',
        populate: { path: 'organization', select: 'name logoUrl website' },
      })
      .populate('payment', 'amount razorpayPaymentId razorpayOrderId status paidAt')
      .sort({ registeredAt: -1 })
      .lean();

    const now = new Date();

    const formatted = registrations
      .filter((r) => r.event)
      .map((r) => {
        const event = r.event;
        const isUpcoming = new Date(event.eventDate) >= now;

        return {
          registrationId: r._id,
          ticketId: r.ticketId,
          amountPaid: r.amountPaid,
          emailStatus: r.emailStatus,
          registrationStatus: r.registrationStatus,
          paymentStatus: r.paymentStatus,
          registeredAt: r.registeredAt,
          payment: r.payment,
          timeline: isUpcoming ? 'upcoming' : 'completed',
          event: {
            id: event._id,
            title: event.title,
            description: event.description,
            category: event.category,
            bannerUrl: event.bannerUrl,
            speakerName: event.speakerName,
            speakerDesignation: event.speakerDesignation,
            speakerPhotoUrl: event.speakerPhotoUrl,
            eventDate: event.eventDate,
            startTime: event.startTime,
            endTime: event.endTime,
            venue: event.venue,
            mode: event.mode,
            meetingUrl: event.meetingUrl,
            isPaid: event.isPaid,
            registrationFee: event.registrationFee,
            currency: event.currency,
            organization: event.organization,
            status: event.status,
          },
        };
      });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};
