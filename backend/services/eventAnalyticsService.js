const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');

/**
 * Event Analytics Service
 * Single Source of Truth for all event-related registrations, revenue, and health metrics.
 */

/**
 * Aggregates live verified registration and revenue counts for a given list of event ObjectIds.
 * Rules:
 * - Registration is valid ONLY if registrationStatus IN ['confirmed', 'attended'] AND paymentStatus IN ['free', 'paid'].
 * - Revenue is valid ONLY if paymentStatus === 'paid', the linked Payment exists, and Payment.status === 'paid'.
 * - Free events yield ₹0 revenue.
 * - Orphan payments or deleted registrations yield ₹0 revenue.
 *
 * @param {Array<mongoose.Types.ObjectId|string>} eventIds
 * @returns {Promise<Object>} Map of eventId (string) -> { registrationsCount, paidRegistrationsCount, revenue }
 */
async function getEventMetrics(eventIds = []) {
  if (!eventIds || eventIds.length === 0) {
    return {};
  }

  const objectIds = eventIds.map((id) =>
    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
  );

  const pipeline = [
    {
      $match: {
        event: { $in: objectIds },
        registrationStatus: { $in: ['confirmed', 'attended'] },
        paymentStatus: { $in: ['free', 'paid'] },
      },
    },
    {
      $lookup: {
        from: 'payments',
        localField: 'payment',
        foreignField: '_id',
        as: 'paymentDocs',
      },
    },
    {
      $project: {
        event: 1,
        student: 1,
        registrationStatus: 1,
        paymentStatus: 1,
        amountPaid: { $ifNull: ['$amountPaid', 0] },
        paymentDoc: { $arrayElemAt: ['$paymentDocs', 0] },
      },
    },
    {
      $project: {
        event: 1,
        registrationStatus: 1,
        paymentStatus: 1,
        // Verified revenue: only count when payment record is verified paid
        verifiedRevenue: {
          $cond: [
            {
              $and: [
                { $eq: ['$paymentStatus', 'paid'] },
                { $eq: ['$paymentDoc.status', 'paid'] },
              ],
            },
            {
              $ifNull: ['$paymentDoc.amount', '$amountPaid'],
            },
            0,
          ],
        },
        isPaidRegistration: {
          $cond: [
            {
              $and: [
                { $eq: ['$paymentStatus', 'paid'] },
                { $eq: ['$paymentDoc.status', 'paid'] },
              ],
            },
            1,
            0,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$event',
        registrationsCount: { $sum: 1 },
        paidRegistrationsCount: { $sum: '$isPaidRegistration' },
        revenue: { $sum: '$verifiedRevenue' },
      },
    },
  ];

  const results = await EventRegistration.aggregate(pipeline);

  const metricsMap = {};
  results.forEach((item) => {
    metricsMap[item._id.toString()] = {
      registrationsCount: item.registrationsCount || 0,
      paidRegistrationsCount: item.paidRegistrationsCount || 0,
      revenue: item.revenue || 0,
    };
  });

  return metricsMap;
}

/**
 * Calculates global event summary statistics across all currently existing events in MongoDB.
 * Ensures complete synchronization between top summary cards and individual event rows.
 *
 * @returns {Promise<Object>}
 */
async function getGlobalEventStats() {
  const now = new Date();

  // 1. Fetch only existing events
  const existingEvents = await Event.find({}, '_id status eventDate').lean();
  const totalEvents = existingEvents.length;
  const publishedEvents = existingEvents.filter((e) => e.status === 'Published').length;
  const draftEvents = existingEvents.filter((e) => e.status === 'Draft').length;
  const upcomingEvents = existingEvents.filter(
    (e) => e.status === 'Published' && new Date(e.eventDate) >= now
  ).length;

  if (totalEvents === 0) {
    return {
      totalEvents: 0,
      publishedEvents: 0,
      draftEvents: 0,
      upcomingEvents: 0,
      totalRegistrations: 0,
      paidRegistrations: 0,
      totalRevenue: 0,
    };
  }

  // 2. Aggregate metrics for only active existing events
  const eventIds = existingEvents.map((e) => e._id);
  const metricsMap = await getEventMetrics(eventIds);

  let totalRegistrations = 0;
  let paidRegistrations = 0;
  let totalRevenue = 0;

  // Ensure each existing event is considered (defaulting to 0 if no registrations)
  existingEvents.forEach((ev) => {
    const m = metricsMap[ev._id.toString()] || {
      registrationsCount: 0,
      paidRegistrationsCount: 0,
      revenue: 0,
    };
    totalRegistrations += m.registrationsCount;
    paidRegistrations += m.paidRegistrationsCount;
    totalRevenue += m.revenue;
  });

  return {
    totalEvents,
    publishedEvents,
    draftEvents,
    upcomingEvents,
    totalRegistrations,
    paidRegistrations,
    totalRevenue,
  };
}

/**
 * Calculates detailed analytics for a single event.
 *
 * @param {string|mongoose.Types.ObjectId} eventId
 * @returns {Promise<Object>}
 */
async function getSingleEventAnalytics(eventId) {
  const event = await Event.findById(eventId)
    .populate('organization', 'name')
    .lean();

  if (!event) {
    return null;
  }

  const metricsMap = await getEventMetrics([event._id]);
  const metrics = metricsMap[event._id.toString()] || {
    registrationsCount: 0,
    paidRegistrationsCount: 0,
    revenue: 0,
  };

  const [freeCount, cancelledCount, failedPaymentsCount] = await Promise.all([
    EventRegistration.countDocuments({
      event: event._id,
      paymentStatus: 'free',
      registrationStatus: { $in: ['confirmed', 'attended'] },
    }),
    EventRegistration.countDocuments({
      event: event._id,
      registrationStatus: 'cancelled',
    }),
    Payment.countDocuments({
      event: event._id,
      status: 'failed',
    }),
  ]);

  const totalRegistrations = metrics.registrationsCount;
  const paidRegistrations = metrics.paidRegistrationsCount;
  const totalRevenue = metrics.revenue;
  const occupancyRate =
    event.capacity > 0
      ? Math.min(100, Math.round((totalRegistrations / event.capacity) * 100))
      : null;

  return {
    event: {
      id: event._id,
      title: event.title,
      category: event.category,
      eventDate: event.eventDate,
      isPaid: event.isPaid,
      registrationFee: event.registrationFee,
      capacity: event.capacity,
      viewsCount: event.viewsCount || 0,
    },
    stats: {
      views: event.viewsCount || 0,
      totalRegistrations,
      paidRegistrations,
      freeRegistrations: freeCount,
      cancelledRegistrations: cancelledCount,
      successfulPayments: paidRegistrations,
      failedPayments: failedPaymentsCount,
      totalRevenue,
      occupancyRate,
    },
  };
}

/**
 * Admin Data Health & Integrity Diagnostic
 * Detects orphan payments, orphan registrations, duplicate transactions, and revenue discrepancies.
 *
 * @returns {Promise<Object>}
 */
async function getDataHealthDiagnostic() {
  const [allEvents, allRegistrations, allPayments] = await Promise.all([
    Event.find({}, '_id title registrationFee isPaid').lean(),
    EventRegistration.find({}, '_id event student registrationStatus paymentStatus payment amountPaid').lean(),
    Payment.find({}, '_id event student registration razorpayPaymentId razorpayOrderId status amount').lean(),
  ]);

  const eventIdSet = new Set(allEvents.map((e) => e._id.toString()));
  const regIdSet = new Set(allRegistrations.map((r) => r._id.toString()));

  let orphanPaymentsCount = 0;
  let orphanBookingsCount = 0;
  let duplicatePaymentsCount = 0;

  const paymentIdCounts = {};
  allPayments.forEach((p) => {
    if (p.razorpayPaymentId) {
      paymentIdCounts[p.razorpayPaymentId] = (paymentIdCounts[p.razorpayPaymentId] || 0) + 1;
    }

    const eventMissing = !eventIdSet.has(p.event?.toString());
    const regMissing = p.registration && !regIdSet.has(p.registration.toString());
    if (eventMissing || regMissing) {
      orphanPaymentsCount++;
    }
  });

  Object.values(paymentIdCounts).forEach((cnt) => {
    if (cnt > 1) {
      duplicatePaymentsCount += cnt - 1;
    }
  });

  allRegistrations.forEach((r) => {
    if (!eventIdSet.has(r.event?.toString())) {
      orphanBookingsCount++;
    }
  });

  const globalStats = await getGlobalEventStats();

  return {
    eventsCount: allEvents.length,
    validBookings: globalStats.totalRegistrations,
    validPaidBookings: globalStats.paidRegistrations,
    totalRevenue: globalStats.totalRevenue,
    orphanPayments: orphanPaymentsCount,
    orphanBookings: orphanBookingsCount,
    duplicatePayments: duplicatePaymentsCount,
    rawPaymentsTotal: allPayments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
    isHealthy: orphanPaymentsCount === 0 && orphanBookingsCount === 0 && duplicatePaymentsCount === 0,
  };
}

/**
 * Reconciles and cleans up orphan payments / records.
 * Only deletes payments or registrations referencing nonexistent events or non-existent registrations.
 *
 * @returns {Promise<Object>}
 */
async function reconcileOrphanRecords() {
  const allEvents = await Event.find({}, '_id').lean();
  const validEventIds = allEvents.map((e) => e._id);

  // 1. Delete orphan registrations referencing deleted events
  const orphanRegResult = await EventRegistration.deleteMany({
    event: { $nin: validEventIds },
  });

  // 2. Delete orphan payments referencing deleted events or registrations that no longer exist
  const validRegs = await EventRegistration.find({}, '_id').lean();
  const validRegIds = validRegs.map((r) => r._id);

  const orphanPayResult = await Payment.deleteMany({
    $or: [
      { event: { $nin: validEventIds } },
      { registration: { $exists: true, $ne: null, $nin: validRegIds } },
    ],
  });

  return {
    cleanedOrphanRegistrations: orphanRegResult.deletedCount || 0,
    cleanedOrphanPayments: orphanPayResult.deletedCount || 0,
  };
}

module.exports = {
  getEventMetrics,
  getGlobalEventStats,
  getSingleEventAnalytics,
  getDataHealthDiagnostic,
  reconcileOrphanRecords,
};
