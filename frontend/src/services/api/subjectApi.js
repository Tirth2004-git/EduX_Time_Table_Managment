import api from './index';

export const subjectApi = {
  list: (params) => api.get('/subjects', { params }),
  get: (id) => api.get(`/subjects/${id}`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

export default subjectApi;
