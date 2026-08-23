import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import GlobalTimetablePreview from '@/components/GlobalTimetablePreview';
import StudentTimetablePreview from '@/components/StudentTimetablePreview';
import StudentElearning from '@/components/Elearning/StudentElearning';
import StudentEvents from '@/components/Events/StudentEvents';
import { Button } from '@/components/ui/button';

export default function Timetable() {
  const [activeTab, setActiveTab] = useState('timetable');
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
            <h1 className="text-lg font-semibold text-slate-900">EduX Student Portal</h1>
            <p className="text-xs text-slate-600">
              Welcome, {user.name || 'Student'} · Signed in as Student
            </p>
          </div>
          <div className="flex gap-2">
            {user.role === 'admin' && (
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Go To Dashboard
              </Button>
            )}
            {user.role === 'teacher' && (
              <Button variant="outline" onClick={() => navigate('/teacher-timetable')}>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex border-b border-slate-200 mb-6 gap-2">
            <button
              onClick={() => setActiveTab('timetable')}
              className={`py-2.5 px-4 font-bold text-sm border-b-2 transition-colors cursor-pointer border-0 bg-transparent ${activeTab === 'timetable' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              My Timetable
            </button>
            <button
              onClick={() => setActiveTab('elearning')}
              className={`py-2.5 px-4 font-bold text-sm border-b-2 transition-colors cursor-pointer border-0 bg-transparent ${activeTab === 'elearning' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              E-Learning
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`py-2.5 px-4 font-bold text-sm border-b-2 transition-colors cursor-pointer border-0 bg-transparent ${activeTab === 'events' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Campus Events & Workshops
            </button>
          </div>
          {activeTab === 'timetable' && <StudentTimetablePreview />}
          {activeTab === 'elearning' && <StudentElearning />}
          {activeTab === 'events' && <StudentEvents />}
        </div>
      ) : (
        <GlobalTimetablePreview />
      )}
    </div>
  );
}
