import api from './index';

const teacherPortalApi = {
  getDashboard: () => api.get('/teacher-portal/dashboard'),
  getTimetable: () => api.get('/teacher-portal/timetable'),
  getLeaves: () => api.get('/teacher-portal/leaves'),
  applyLeave: (data) => api.post('/teacher-portal/leaves', data),
  cancelLeave: (id) => api.delete(`/teacher-portal/leaves/${id}`),
  getWorkload: () => api.get('/teacher-portal/workload'),
  getPreferences: () => api.get('/teacher-portal/preferences'),
  updatePreferences: (data) => api.put('/teacher-portal/preferences', data),
  getSubstitutions: () => api.get('/teacher-portal/substitutions'),
  createSubstitution: (data) => api.post('/teacher-portal/substitutions', data),
  getNotifications: () => api.get('/teacher-portal/notifications'),
  markNotificationRead: (id) => api.put(`/teacher-portal/notifications/${id}/read`),
  getProfile: (id) => api.get(`/teachers/profile/${id}`),
};

export default teacherPortalApi;
