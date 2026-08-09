import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard for pages requiring authentication and optionally specific roles.
 */
export function ProtectedRoute({ children, allowRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowRoles && !allowRoles.map((role) => role.toLowerCase()).includes(String(user.role || '').toLowerCase())) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Route guard for routes that should only be accessible when not logged in (e.g. Login, Register).
 */
export function PublicRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher-timetable" replace />;
    return <Navigate to="/timetable" replace />;
  }

  return children;
}
