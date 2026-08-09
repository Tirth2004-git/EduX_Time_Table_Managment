import api from './index';

export const userApi = {
  getProfile: () => api.get('/auth/me'),
};

export default userApi;
