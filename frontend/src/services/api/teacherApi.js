import api from './index';

export const teacherApi = {
  list: (params) => api.get('/teachers', { params }),
  eligible: (params) => api.get('/teachers/eligible', { params }),
  get: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  assignSubjects: (id, subjects) => api.put(`/teachers/${id}/subjects`, { subjects }),
  importCsv: (formData) => api.post('/teachers/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export default teacherApi;
