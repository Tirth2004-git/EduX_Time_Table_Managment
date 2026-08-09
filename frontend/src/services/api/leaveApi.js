import api from './index';

export const leaveApi = {
  list: (params) => api.get('/leaves', { params }),
  create: (data) => api.post('/leaves', data),
  delete: (id) => api.delete(`/leaves/${id}`),
  getImpact: (id) => api.get(`/leaves/${id}/impact`),
  review: (id, data) => api.put(`/leaves/${id}/review`, data),
};

export default leaveApi;
