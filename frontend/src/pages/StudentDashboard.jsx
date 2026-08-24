import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import StudentTimetablePreview from '@/components/StudentTimetablePreview';
import StudentElearning from '@/components/Elearning/StudentElearning';
import StudentEvents from '@/components/Events/StudentEvents';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut, Calendar, BookOpen, Sparkles } from 'lucide-react';

export default function StudentDashboard() {
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
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-700 font-medium">Loading Student Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">EduX Student Portal</h1>
              <p className="text-xs text-slate-500 font-medium">
                Welcome, <span className="text-slate-800 font-bold">{user.name || 'Student'}</span> · Signed in as Student
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 rounded-xl font-bold text-xs gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Tabs and Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`py-2.5 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
              activeTab === 'timetable'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            My Timetable
          </button>
          <button
            onClick={() => setActiveTab('elearning')}
            className={`py-2.5 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
              activeTab === 'elearning'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            E-Learning
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2.5 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer border-0 bg-transparent ${
              activeTab === 'events'
                ? 'border-emerald-600 text-emerald-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Campus Events & Workshops
          </button>
        </div>

        {activeTab === 'timetable' && <StudentTimetablePreview />}
        {activeTab === 'elearning' && <StudentElearning />}
        {activeTab === 'events' && <StudentEvents />}
      </main>
    </div>
  );
}
