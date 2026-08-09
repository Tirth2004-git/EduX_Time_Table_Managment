import api from './index';

export const sessionApi = {
  list: (params) => api.get('/sessions', { params }),
  mySessions: (params) => api.get('/sessions/my', { params }),
  getById: (id) => api.get(`/sessions/${id}`),
  cancel: (id) => api.patch(`/sessions/${id}/cancel`),
};

export default sessionApi;
