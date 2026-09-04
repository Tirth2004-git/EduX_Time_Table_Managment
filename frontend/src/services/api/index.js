import axios from 'axios';

const envApiUrl = import.meta.env.VITE_API_URL;
// In local development, if VITE_API_URL is pointing to a remote server (e.g. Render), default to '/api' to use the local dev proxy
const isDev = import.meta.env.DEV;
export const API_BASE_URL = (isDev && envApiUrl && envApiUrl.includes('onrender.com'))
  ? '/api'
  : (envApiUrl
      ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/+$/, '')}/api`)
      : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds request timeout
  withCredentials: true, // Auto send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for catching global errors (like 401 Unauthorized) and attempting auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Do not attempt token refresh for public authentication endpoints
    const isPublicAuthRoute = originalRequest.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/register') ||
      originalRequest.url.includes('/auth/send-otp') ||
      originalRequest.url.includes('/auth/verify-otp') ||
      originalRequest.url.includes('/auth/forgot-password') ||
      originalRequest.url.includes('/auth/reset-password')
    );

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isPublicAuthRoute) {
      originalRequest._retry = true;
      try {
        // Call refresh endpoint directly using axios to avoid infinite interception
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        if (data && data.success && data.token) {
          localStorage.setItem('auth-token', data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.warn('Refresh token failed, logging out...');
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
