import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'admin') {
          navigate('/dashboard', { replace: true });
        } else if (user.role === 'teacher') {
          navigate('/teacher-timetable', { replace: true });
        } else {
          navigate('/student-dashboard', { replace: true });
        }
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-700 font-medium">Resolving session...</p>
      </div>
    </div>
  );
}
