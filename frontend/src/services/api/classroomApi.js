import api from './index';

export const classroomApi = {
  list: (params) => api.get('/classrooms', { params }),
  get: (id) => api.get(`/classrooms/${id}`),
  available: (params) => api.get('/classrooms/available', { params }),
  create: (data) => api.post('/classrooms', data),
  update: (id, data) => api.put(`/classrooms/${id}`, data),
  delete: (id) => api.delete(`/classrooms/${id}`),
};

export default classroomApi;
