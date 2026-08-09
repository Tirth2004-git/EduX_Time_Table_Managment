import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import GlobalTimetablePreview from '@/components/GlobalTimetablePreview';
import StudentTimetablePreview from '@/components/StudentTimetablePreview';
import { Button } from '@/components/ui/button';

export default function Timetable() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-700">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Timetable Viewer</h1>
            <p className="text-xs text-slate-600">
              Signed in as {user.name || user.username} ({user.role})
            </p>
          </div>
          <div className="flex gap-2">
            {user.role === 'admin' && (
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go To Dashboard
              </Button>
            )}
            {user.role === 'teacher' && (
              <Button variant="outline" onClick={() => navigate('/teacher/dashboard')}>
                Go To Dashboard
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {user.role === 'student' ? (
        <StudentTimetablePreview studentId={user.student?.student_id} />
      ) : (
        <GlobalTimetablePreview />
      )}
    </div>
  );
}
