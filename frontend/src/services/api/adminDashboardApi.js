import api from './index';

export const adminDashboardApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getNotifications: () => api.get('/admin/notifications'),
  markRead: (id) => api.put(`/admin/notifications/${id}/read`),
};

export default adminDashboardApi;
