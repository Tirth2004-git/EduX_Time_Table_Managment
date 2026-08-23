const express = require('express');
const router = express.Router();
const {
  getAdminEvents,
  getAdminEventStats,
  getAdminEventHealth,
  reconcileAdminEvents,
  getStudentEvents,
  getEventById,
  createEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  cancelEvent,
  deleteEvent,
  getEventRegistrations,
  exportEventRegistrationsCSV,
  getEventAnalytics,
} = require('../controllers/eventController');
const {
  registerFreeEvent,
  createEventPaymentOrder,
  verifyEventPayment,
  resendTicketEmail,
  getMyEvents,
} = require('../controllers/eventRegistrationController');
const { protect } = require('../middleware/authMiddleware');
const { uploadImage } = require('../config/cloudinary');

const eventImageUpload = uploadImage.fields([
  { name: 'banner', maxCount: 1 },
  { name: 'speakerPhoto', maxCount: 1 },
]);

// ── Student Specific Endpoints ──
router.get('/student/upcoming', protect(), getStudentEvents);
router.get('/student/my-events', protect(), getMyEvents);
router.post('/:id/register', protect(), registerFreeEvent);
router.post('/:id/create-order', protect(), createEventPaymentOrder);
router.post('/:id/verify-payment', protect(), verifyEventPayment);
router.post('/:id/registrations/:registrationId/resend-email', protect(), resendTicketEmail);

// ── Admin Specific Endpoints ──
router.get('/admin', protect(true), getAdminEvents);
router.get('/admin/stats', protect(true), getAdminEventStats);
router.get('/admin/health', protect(true), getAdminEventHealth);
router.post('/admin/reconcile', protect(true), reconcileAdminEvents);
router.post('/', protect(true), eventImageUpload, createEvent);
router.put('/:id', protect(true), eventImageUpload, updateEvent);
router.delete('/:id', protect(true), deleteEvent);

router.post('/:id/publish', protect(true), publishEvent);
router.post('/:id/unpublish', protect(true), unpublishEvent);
router.post('/:id/cancel', protect(true), cancelEvent);

router.get('/:id/registrations', protect(true), getEventRegistrations);
router.get('/:id/export', protect(true), exportEventRegistrationsCSV);
router.get('/:id/analytics', protect(true), getEventAnalytics);

// ── Shared Single Event Details ──
router.get('/:id', protect(), getEventById);

module.exports = router;
