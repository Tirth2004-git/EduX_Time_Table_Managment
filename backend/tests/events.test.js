const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Services & Models
const {
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../services/razorpayService');

const Organization = require('../models/Organization');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');

test('Razorpay Service - Payment Signature Verification', () => {
  const secret = process.env.RAZORPAY_KEY_SECRET || 'mockSecret';
  const orderId = 'order_test_12345';
  const paymentId = 'pay_test_67890';

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Test with authentic signature
  const isValid = verifyPaymentSignature({
    orderId,
    paymentId,
    signature: validSignature,
  });
  assert.equal(isValid, true, 'Valid signature should verify successfully');

  // Test with tampered signature
  const isInvalid = verifyPaymentSignature({
    orderId,
    paymentId,
    signature: 'bad_signature_tampered',
  });
  assert.equal(isInvalid, false, 'Tampered signature should fail verification');

  // Test with missing fields
  assert.equal(verifyPaymentSignature({ orderId: '', paymentId, signature: validSignature }), false);
  assert.equal(verifyPaymentSignature({ orderId, paymentId: '', signature: validSignature }), false);
  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature: '' }), false);
});

test('Razorpay Service - Webhook Signature Verification', () => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'mockSecret';
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } });

  const validWebhookSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const isValid = verifyWebhookSignature(rawBody, validWebhookSig);
  assert.equal(isValid, true, 'Valid webhook signature should verify successfully');

  const isInvalid = verifyWebhookSignature(rawBody, 'tampered_sig');
  assert.equal(isInvalid, false, 'Tampered webhook signature should fail verification');
});

test('Event Targeting Logic', () => {
  // Helper from eventController
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

  const deptIT = new mongoose.Types.ObjectId();
  const deptCS = new mongoose.Types.ObjectId();
  const sem4 = new mongoose.Types.ObjectId();
  const sem6 = new mongoose.Types.ObjectId();
  const divA = new mongoose.Types.ObjectId();
  const divB = new mongoose.Types.ObjectId();

  const studentIT4A = {
    department_id: deptIT,
    semester_id: sem4,
    division_id: divA,
  };

  const studentIT4B = {
    department_id: deptIT,
    semester_id: sem4,
    division_id: divB,
  };

  const studentCS4A = {
    department_id: deptCS,
    semester_id: sem4,
    division_id: divA,
  };

  // Case 1: All Students event
  const allStudentsEvent = { targetAudienceType: 'all' };
  assert.equal(isStudentEligible(studentIT4A, allStudentsEvent), true);
  assert.equal(isStudentEligible(studentCS4A, allStudentsEvent), true);

  // Case 2: IT Department only event
  const itOnlyEvent = {
    targetAudienceType: 'targeted',
    targetDepartment: deptIT,
    targetSemester: null,
    targetDivisions: [],
  };
  assert.equal(isStudentEligible(studentIT4A, itOnlyEvent), true);
  assert.equal(isStudentEligible(studentCS4A, itOnlyEvent), false);

  // Case 3: IT Semester 4 only event
  const itSem4Event = {
    targetAudienceType: 'targeted',
    targetDepartment: deptIT,
    targetSemester: sem4,
    targetDivisions: [],
  };
  assert.equal(isStudentEligible(studentIT4A, itSem4Event), true);
  assert.equal(isStudentEligible({ ...studentIT4A, semester_id: sem6 }, itSem4Event), false);

  // Case 4: IT Semester 4 Division A only event
  const itSem4DivAEvent = {
    targetAudienceType: 'targeted',
    targetDepartment: deptIT,
    targetSemester: sem4,
    targetDivisions: [divA],
  };
  assert.equal(isStudentEligible(studentIT4A, itSem4DivAEvent), true);
  assert.equal(isStudentEligible(studentIT4B, itSem4DivAEvent), false);
});
