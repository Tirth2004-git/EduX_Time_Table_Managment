import api from './index';

export const substitutionApi = {
  list: (params) => api.get('/substitutions', { params }),
  getById: (id) => api.get(`/substitutions/${id}`),
  getCandidates: (id) => api.get(`/substitutions/${id}/candidates`),
  regenerate: (id) => api.post(`/substitutions/${id}/regenerate`),
  assign: (id, data) => api.put(`/substitutions/${id}/assign`, data),
};

export default substitutionApi;
