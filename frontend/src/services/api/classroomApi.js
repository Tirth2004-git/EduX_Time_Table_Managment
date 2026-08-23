import api from './index';

export const classroomApi = {
  list: (params) => api.get('/classrooms', { params }),
  getStats: () => api.get('/classrooms/stats'),
  get: (id) => api.get(`/classrooms/${id}`),
  getSchedule: (id) => api.get(`/classrooms/${id}/schedule`),
  available: (params) => api.get('/classrooms/available', { params }),
  create: (data) => api.post('/classrooms', data),
  update: (id, data) => api.put(`/classrooms/${id}`, data),
  delete: (id, params) => api.delete(`/classrooms/${id}`, { params }),
  reconcile: () => api.post('/classrooms/reconcile'),
};

export default classroomApi;
