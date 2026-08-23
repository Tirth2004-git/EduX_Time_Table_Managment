import api from './index';

const eventApi = {
  // Organizations
  getOrganizations: (params) => api.get('/organizations', { params }),
  getOrganizationById: (id) => api.get(`/organizations/${id}`),
  createOrganization: (formData) =>
    api.post('/organizations', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateOrganization: (id, formData) =>
    api.put(`/organizations/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteOrganization: (id) => api.delete(`/organizations/${id}`),

  // Admin Events
  getAdminEvents: (params) => api.get('/events/admin', { params }),
  getAdminStats: () => api.get('/events/admin/stats'),
  getEventHealth: () => api.get('/events/admin/health'),
  reconcileEvents: () => api.post('/events/admin/reconcile'),
  createEvent: (formData) =>
    api.post('/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateEvent: (id, formData) =>
    api.put(`/events/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteEvent: (id) => api.delete(`/events/${id}`),

  publishEvent: (id) => api.post(`/events/${id}/publish`),
  unpublishEvent: (id) => api.post(`/events/${id}/unpublish`),
  cancelEvent: (id) => api.post(`/events/${id}/cancel`),

  getEventRegistrations: (id) => api.get(`/events/${id}/registrations`),
  exportRegistrationsCSV: (id) =>
    api.get(`/events/${id}/export`, { responseType: 'blob' }),
  getEventAnalytics: (id) => api.get(`/events/${id}/analytics`),
  resendTicketEmail: (eventId, registrationId) =>
    api.post(`/events/${eventId}/registrations/${registrationId}/resend-email`),

  // Student Events
  getStudentEvents: () => api.get('/events/student/upcoming'),
  getMyEvents: () => api.get('/events/student/my-events'),
  getEventById: (id) => api.get(`/events/${id}`),
  registerFreeEvent: (id) => api.post(`/events/${id}/register`),
  createPaymentOrder: (id) => api.post(`/events/${id}/create-order`),
  verifyPayment: (id, paymentData) => api.post(`/events/${id}/verify-payment`, paymentData),
};

export default eventApi;
