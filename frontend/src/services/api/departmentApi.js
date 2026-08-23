import api from './index';

export const departmentApi = {
  getAll: (params) => api.get('/departments', { params }),
  get: (id) => api.get(`/departments/${id}`),
};

export default departmentApi;
