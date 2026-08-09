import api from './index';

const teacherPortalApi = {
  getTimetable: () => api.get('/teacher-portal/timetable'),
  getLeaves: () => api.get('/teacher-portal/leaves'),
  applyLeave: (data) => api.post('/teacher-portal/leaves', data),
  cancelLeave: (id) => api.delete(`/teacher-portal/leaves/${id}`),
  getPreferences: () => api.get('/teacher-portal/preferences'),
  updatePreferences: (data) => api.put('/teacher-portal/preferences', data),
  getSubstitutions: () => api.get('/teacher-portal/substitutions'),
  createSubstitution: (data) => api.post('/teacher-portal/substitutions', data),
  getNotifications: () => api.get('/teacher-portal/notifications'),
  markNotificationRead: (id) => api.put(`/teacher-portal/notifications/${id}/read`),
  // The API resolves the teacher from the authenticated session. Never pass a
  // teacher id from the browser for a teacher's own profile.
  getProfile: () => api.get('/teacher-portal/profile'),
};

export default teacherPortalApi;
