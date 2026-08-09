import api from './index';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getDemoTeachers: () => api.get('/demo/teachers'),
  demoTeacherLogin: (teacherId) => api.post('/auth/demo/teacher', { teacherId }),
  register: (data) => api.post('/auth/register', data),
  sendOtp: (email) => api.post('/auth/send-otp', { email }),
  verifyOtp: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

export default authApi;
