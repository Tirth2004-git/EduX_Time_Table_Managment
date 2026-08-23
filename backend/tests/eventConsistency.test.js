const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const Organization = require('../models/Organization');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');
const User = require('../models/User');

const eventAnalyticsService = require('../services/eventAnalyticsService');
const { getAdminEvents, getAdminEventStats, getEventAnalytics, getAdminEventHealth } = require('../controllers/eventController');
const { getAdminDashboard } = require('../controllers/adminDashboardController');

test('Event Data Consistency and Live Analytics Test Suite', async (t) => {
  let isConnected = false;
  try {
    await connectDB();
    isConnected = true;
  } catch (err) {
    t.skip('MongoDB connection not available');
    return;
  }

  // Temporary test fixtures IDs
  let testOrgId;
  let testUserId;
  let testUserId2;
  let testEventId1;
  let testEventId2;

  t.before(async () => {
    // Create test organization
    const org = await Organization.create({
      name: 'QA Consistency Test Org ' + Date.now(),
      description: 'Test organization for data consistency QA',
    });
    testOrgId = org._id;

    // Create test students
    const user1 = await User.create({
      name: 'QA Test Student 1',
      email: `qa_student_1_${Date.now()}@edux.test`,
      password: 'TestPassword123!',
      role: 'student',
      isVerified: true,
    });
    testUserId = user1._id;

    const user2 = await User.create({
      name: 'QA Test Student 2',
      email: `qa_student_2_${Date.now()}@edux.test`,
      password: 'TestPassword123!',
      role: 'student',
      isVerified: true,
    });
    testUserId2 = user2._id;
  });

  t.after(async () => {
    // Clean up test data created during this suite
    if (testEventId1) {
      await Event.findByIdAndDelete(testEventId1);
      await EventRegistration.deleteMany({ event: testEventId1 });
      await Payment.deleteMany({ event: testEventId1 });
    }
    if (testEventId2) {
      await Event.findByIdAndDelete(testEventId2);
      await EventRegistration.deleteMany({ event: testEventId2 });
      await Payment.deleteMany({ event: testEventId2 });
    }
    if (testOrgId) await Organization.findByIdAndDelete(testOrgId);
    if (testUserId) await User.findByIdAndDelete(testUserId);
    if (testUserId2) await User.findByIdAndDelete(testUserId2);
    await mongoose.disconnect();
  });

  // STEP 25 — Empty State / Baseline verification
  await t.test('1. Single Event Initial State (0 Bookings)', async () => {
    const event = await Event.create({
      organization: testOrgId,
      title: 'QA Python Masterclass',
      description: 'Comprehensive Python workshop',
      category: 'Workshop',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      venue: 'Lab 401',
      registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      isPaid: true,
      registrationFee: 299,
      capacity: 150,
      status: 'Published',
    });
    testEventId1 = event._id;

    const metricsMap = await eventAnalyticsService.getEventMetrics([testEventId1]);
    const metrics = metricsMap[testEventId1.toString()] || { registrationsCount: 0, revenue: 0 };

    assert.equal(metrics.registrationsCount, 0, 'Initial registration count must be 0');
    assert.equal(metrics.revenue, 0, 'Initial revenue must be 0');

    const singleAnalytics = await eventAnalyticsService.getSingleEventAnalytics(testEventId1);
    assert.equal(singleAnalytics.stats.totalRegistrations, 0);
    assert.equal(singleAnalytics.stats.totalRevenue, 0);
  });

  // STEP 26 — 1st and 2nd Test Booking + Deletion
  await t.test('2. First Paid Booking and Verified Payment', async () => {
    const payment1 = await Payment.create({
      event: testEventId1,
      student: testUserId,
      razorpayOrderId: 'order_test_1_' + Date.now(),
      razorpayPaymentId: 'pay_test_1_' + Date.now(),
      amount: 299,
      status: 'paid',
      paidAt: new Date(),
    });

    const reg1 = await EventRegistration.create({
      event: testEventId1,
      student: testUserId,
      registrationStatus: 'confirmed',
      paymentStatus: 'paid',
      payment: payment1._id,
      amountPaid: 299,
      ticketId: 'EDUX-QA-001',
      registeredAt: new Date(),
    });

    payment1.registration = reg1._id;
    await payment1.save();

    const metricsMap = await eventAnalyticsService.getEventMetrics([testEventId1]);
    const metrics = metricsMap[testEventId1.toString()];

    assert.equal(metrics.registrationsCount, 1, 'Registrations must be exactly 1');
    assert.equal(metrics.revenue, 299, 'Revenue must be exactly 299');
  });

  await t.test('3. Second Paid Booking (2 Registrations, ₹598 Revenue)', async () => {
    const payment2 = await Payment.create({
      event: testEventId1,
      student: testUserId2,
      razorpayOrderId: 'order_test_2_' + Date.now(),
      razorpayPaymentId: 'pay_test_2_' + Date.now(),
      amount: 299,
      status: 'paid',
      paidAt: new Date(),
    });

    const reg2 = await EventRegistration.create({
      event: testEventId1,
      student: testUserId2,
      registrationStatus: 'confirmed',
      paymentStatus: 'paid',
      payment: payment2._id,
      amountPaid: 299,
      ticketId: 'EDUX-QA-002',
      registeredAt: new Date(),
    });

    payment2.registration = reg2._id;
    await payment2.save();

    const metricsMap = await eventAnalyticsService.getEventMetrics([testEventId1]);
    const metrics = metricsMap[testEventId1.toString()];

    assert.equal(metrics.registrationsCount, 2, 'Registrations must be exactly 2');
    assert.equal(metrics.revenue, 598, 'Revenue must be exactly 598');
  });

  await t.test('4. Delete 1 Booking Directly from DB (Recalculate to 1 / ₹299)', async () => {
    // Manually delete registration 2 from MongoDB
    await EventRegistration.deleteOne({ event: testEventId1, student: testUserId2 });

    const metricsMap = await eventAnalyticsService.getEventMetrics([testEventId1]);
    const metrics = metricsMap[testEventId1.toString()];

    assert.equal(metrics.registrationsCount, 1, 'Registrations must decrease to 1 after deleting 1 booking');
    assert.equal(metrics.revenue, 299, 'Revenue must decrease to 299 after deleting 1 booking');
  });

  await t.test('5. Delete Remaining Booking from DB (Recalculate to 0 / ₹0)', async () => {
    // Manually delete registration 1 from MongoDB
    await EventRegistration.deleteOne({ event: testEventId1, student: testUserId });

    const metricsMap = await eventAnalyticsService.getEventMetrics([testEventId1]);
    const metrics = metricsMap[testEventId1.toString()] || { registrationsCount: 0, revenue: 0 };

    assert.equal(metrics.registrationsCount, 0, 'Registrations must be 0 after deleting all bookings');
    assert.equal(metrics.revenue, 0, 'Revenue must be 0 even if orphan Payment documents exist');
  });

  // STEP 27 — Multiple Events Test
  await t.test('6. Multiple Events with Distinct Pricing and Counts', async () => {
    // Event A (₹299, 2 bookings)
    const payA1 = await Payment.create({
      event: testEventId1,
      student: testUserId,
      razorpayOrderId: 'order_test_a1_' + Date.now(),
      razorpayPaymentId: 'pay_test_a1_' + Date.now(),
      amount: 299,
      status: 'paid',
    });
    const regA1 = await EventRegistration.create({
      event: testEventId1,
      student: testUserId,
      registrationStatus: 'confirmed',
      paymentStatus: 'paid',
      payment: payA1._id,
      amountPaid: 299,
      ticketId: 'EDUX-MA-001',
    });
    payA1.registration = regA1._id;
    await payA1.save();

    const payA2 = await Payment.create({
      event: testEventId1,
      student: testUserId2,
      razorpayOrderId: 'order_test_a2_' + Date.now(),
      razorpayPaymentId: 'pay_test_a2_' + Date.now(),
      amount: 299,
      status: 'paid',
    });
    const regA2 = await EventRegistration.create({
      event: testEventId1,
      student: testUserId2,
      registrationStatus: 'confirmed',
      paymentStatus: 'paid',
      payment: payA2._id,
      amountPaid: 299,
      ticketId: 'EDUX-MA-002',
    });
    payA2.registration = regA2._id;
    await payA2.save();

    // Event B (₹499, 1 booking)
    const eventB = await Event.create({
      organization: testOrgId,
      title: 'QA React Architecture Seminar',
      description: 'Advanced React patterns and performance',
      category: 'Seminar',
      eventDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      startTime: '02:00 PM',
      endTime: '05:00 PM',
      venue: 'Auditorium 1',
      registrationDeadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      isPaid: true,
      registrationFee: 499,
      capacity: 100,
      status: 'Published',
    });
    testEventId2 = eventB._id;

    const payB1 = await Payment.create({
      event: testEventId2,
      student: testUserId,
      razorpayOrderId: 'order_test_b1_' + Date.now(),
      razorpayPaymentId: 'pay_test_b1_' + Date.now(),
      amount: 499,
      status: 'paid',
    });
    const regB1 = await EventRegistration.create({
      event: testEventId2,
      student: testUserId,
      registrationStatus: 'confirmed',
      paymentStatus: 'paid',
      payment: payB1._id,
      amountPaid: 499,
      ticketId: 'EDUX-MB-001',
    });
    payB1.registration = regB1._id;
    await payB1.save();

    const metricsMap = await eventAnalyticsService.getEventMetrics([testEventId1, testEventId2]);
    assert.equal(metricsMap[testEventId1.toString()].registrationsCount, 2);
    assert.equal(metricsMap[testEventId1.toString()].revenue, 598); // 299 * 2

    assert.equal(metricsMap[testEventId2.toString()].registrationsCount, 1);
    assert.equal(metricsMap[testEventId2.toString()].revenue, 499);

    const globalStats = await eventAnalyticsService.getGlobalEventStats();
    // Sum across events
    assert.ok(globalStats.totalRegistrations >= 3);
    assert.ok(globalStats.totalRevenue >= 1097); // 598 + 499
  });

  // STEP 12 & 13 — Failed and Unpaid payments exclusion
  await t.test('7. Failed / Created payments must NOT contribute to revenue', async () => {
    // Created payment without registration (abandoned checkout)
    await Payment.create({
      event: testEventId1,
      student: testUserId,
      razorpayOrderId: 'order_test_created_' + Date.now(),
      amount: 299,
      status: 'created',
    });

    // Failed payment
    await Payment.create({
      event: testEventId1,
      student: testUserId,
      razorpayOrderId: 'order_test_failed_' + Date.now(),
      amount: 299,
      status: 'failed',
    });

    const metricsMap = await eventAnalyticsService.getEventMetrics([testEventId1]);
    assert.equal(metricsMap[testEventId1.toString()].revenue, 598, 'Failed / created payments must not add to revenue');
  });

  // STEP 24 — Diagnostic Health Checks & Reconciliation
  await t.test('8. Data Health Diagnostic and Reconciliation Tool', async () => {
    const health = await eventAnalyticsService.getDataHealthDiagnostic();
    assert.ok(typeof health.validBookings === 'number');
    assert.ok(typeof health.totalRevenue === 'number');
    assert.ok(typeof health.orphanPayments === 'number');

    const cleanResult = await eventAnalyticsService.reconcileOrphanRecords();
    assert.ok(typeof cleanResult.cleanedOrphanPayments === 'number');
    assert.ok(typeof cleanResult.cleanedOrphanRegistrations === 'number');
  });

  // API Controller endpoint integration test
  await t.test('9. Controller Endpoints (getAdminEvents, getAdminEventStats, getAdminDashboard)', async () => {
    let adminEventsResult;
    await getAdminEvents({ query: {} }, { json: (d) => { adminEventsResult = d; } }, (err) => { throw err; });
    assert.equal(adminEventsResult.success, true);
    assert.ok(Array.isArray(adminEventsResult.data));

    let adminStatsResult;
    await getAdminEventStats({}, { json: (d) => { adminStatsResult = d; } }, (err) => { throw err; });
    assert.equal(adminStatsResult.success, true);
    assert.ok(typeof adminStatsResult.data.totalRevenue === 'number');

    let dashboardResult;
    await getAdminDashboard({}, { json: (d) => { dashboardResult = d; } }, (err) => { throw err; });
    assert.equal(dashboardResult.success, true);
    assert.equal(dashboardResult.data.totalRevenue, adminStatsResult.data.totalRevenue, 'Admin Dashboard revenue must match Events module revenue');
    assert.equal(dashboardResult.data.eventRegistrations, adminStatsResult.data.totalRegistrations, 'Admin Dashboard registrations must match Events module registrations');
  });
});
