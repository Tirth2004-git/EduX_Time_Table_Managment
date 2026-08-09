import { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../services/api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = localStorage.getItem('auth-token');
        if (!storedToken || storedToken === 'undefined' || storedToken === 'null') {
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        const response = await authApi.getMe();
        if (response.data && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } else {
          throw new Error('Invalid session');
        }
      } catch (e) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const loginUser = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      if (response.data && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        if (response.data.token) {
          localStorage.setItem('auth-token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || err.response?.data?.error || 'Login failed', { cause: err });
    }
  };

  const loginDemoTeacher = async (teacherId) => {
    try {
      const response = await authApi.demoTeacherLogin(teacherId);
      if (response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        if (response.data.token) {
          localStorage.setItem('auth-token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
      }
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Demo login failed', { cause: err });
    }
  };

  const logoutUser = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('API logout failed', err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
    }
  };

  const setAuthUser = (user) => {
    setUser(user);
    setIsAuthenticated(!!user);
  };

  const updateProfile = async (data) => {
    try {
      const response = await authApi.updateProfile(data);
      if (response.data && response.data.user) {
        setUser(response.data.user);
      }
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Profile update failed', { cause: err });
    }
  };

  const changePassword = async (data) => {
    try {
      const response = await authApi.changePassword(data);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Password change failed', { cause: err });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login: loginUser, loginDemoTeacher, logout: logoutUser, setUser: setAuthUser, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
