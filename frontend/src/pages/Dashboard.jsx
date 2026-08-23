import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import api from '@/services/api';

// Components
import DashboardOverview from '@/components/DashboardOverview';
import TimetableBuilder from '@/components/TimetableBuilder';
import TeacherManagement from '@/components/TeacherManagement';
import SubjectManagement from '@/components/SubjectManagement';
import ClassroomManagement from '@/components/ClassroomManagement';
import GlobalTimetablePreview from '@/components/GlobalTimetablePreview';
import TeacherLeaveManagement from '@/components/TeacherLeaveManagement';
import AdminEventManagement from '@/components/Events/AdminEventManagement';
import Analytics from '@/pages/Analytics';
import Import from '@/pages/Import';

// UI
import { ToastContainer } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LogOut, Users, BookOpen, Calendar, Building2, Table2, 
  BarChart3, Settings, Home, Menu, X, Sparkles, GraduationCap,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const [forbidden, setForbidden] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (user.role !== 'admin') {
        setForbidden(true);
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Listen for switch to timetable event
    const handleSwitchToTimetable = () => {
      setActiveTab('timetable');
    };

    window.addEventListener('switchToTimetable', handleSwitchToTimetable);
    return () => {
      window.removeEventListener('switchToTimetable', handleSwitchToTimetable);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const handleGenerateDemoData = async () => {
    try {
      const response = await api.post('/admin/seed');
      if (response.data?.success) {
        alert('Academic demo data generated successfully');
        window.location.reload();
      } else {
        alert(response.data?.error || 'Failed to generate demo data');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      alert(error.response?.data?.error || 'Error generating demo data');
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    return user.name || user.username || user.email || 'User';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500">Loading EduX Console...</p>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <Card className="w-full max-w-xl border-red-100 shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-red-50/50 border-b border-red-100 p-6">
            <CardTitle className="text-red-700 flex items-center gap-2 text-xl font-bold">
              🚫 Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              You do not possess the administrator privileges required to access the EduX Timetable Dashboard.
            </p>
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={() => navigate('/timetable')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer border-0"
              >
                Go To Timetable
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                Back To Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
    { id: 'timetable', label: 'Timetable Builder', icon: <Calendar className="w-5 h-5" /> },
    { id: 'teachers', label: 'Teachers', icon: <Users className="w-5 h-5" /> },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'classrooms', label: 'Classrooms', icon: <Building2 className="w-5 h-5" /> },
    { id: 'events', label: 'Events & Promotions', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'leaves', label: 'Leave Management', icon: <Table2 className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(m => m.id === activeTab);
    return item ? item.label : 'EduX Planner';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex">
      {/* ── Desktop Sidebar (Fixed Left) ── */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-100 py-6 px-4 z-40 justify-between">
        <div className="space-y-8">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5 px-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#6366F1] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-950 to-slate-700 leading-none block">
                EduX Planner
              </span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none mt-0.5 block">
                Scheduling OS
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-0 cursor-pointer ${
                    active 
                      ? 'bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white shadow-md shadow-indigo-500/10' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 bg-transparent'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <div className="flex items-center gap-3 px-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700">
              {getUserDisplayName()[0].toUpperCase()}
            </div>
            <div className="truncate max-w-[140px]">
              <p className="text-sm font-bold text-slate-800 leading-none">{getUserDisplayName()}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 leading-none">Administrator</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl text-sm font-bold transition-all border-0 bg-transparent cursor-pointer"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950 z-40 md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-white py-6 px-4 z-50 flex flex-col justify-between md:hidden shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-indigo-600" />
                    <span className="font-extrabold text-slate-900 text-lg">EduX Planner</span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 border-0 bg-transparent cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-0 cursor-pointer ${
                          active 
                            ? 'bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white shadow-md' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 bg-transparent'
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex items-center gap-3 px-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                    {getUserDisplayName()[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-none">{getUserDisplayName()}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 leading-none">Administrator</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl text-sm font-bold transition-all border-0 bg-transparent cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main View Area ── */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        {/* Slim Header */}
        <header className="bg-white border-b border-slate-100 py-4 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-600 bg-transparent cursor-pointer hover:bg-slate-50 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900">{getPageTitle()}</h1>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardOverview onTabChange={setActiveTab} />
              )}
              {activeTab === 'timetable' && (
                <TimetableBuilder />
              )}
              {activeTab === 'teachers' && (
                <TeacherManagement />
              )}
              {activeTab === 'subjects' && (
                <SubjectManagement />
              )}
              {activeTab === 'classrooms' && (
                <ClassroomManagement />
              )}
              {activeTab === 'events' && (
                <AdminEventManagement />
              )}
              {activeTab === 'leaves' && (
                <TeacherLeaveManagement />
              )}
              {activeTab === 'analytics' && (
                <Analytics isTab={true} />
              )}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Weekly Timetable Configuration</h2>
                    <p className="text-slate-500 text-sm mb-6">EduX operates on a standard university schedule config: 6 Days (Monday-Saturday) and 8 daily slots (09:30 - 16:20).</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-700 block">Class Timing Slots:</span>
                        <ul className="list-disc list-inside text-slate-500 mt-2 space-y-1">
                          <li>09:30-10:25 (Period 1)</li>
                          <li>10:25-11:20 (Period 2)</li>
                          <li>12:20-13:15 (Period 3)</li>
                          <li>13:15-14:10 (Period 4)</li>
                          <li>14:30-15:25 (Period 5)</li>
                          <li>15:25-16:20 (Period 6)</li>
                        </ul>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block">System Breaks:</span>
                        <ul className="list-disc list-inside text-slate-500 mt-2 space-y-1">
                          <li>11:20-12:20 (Morning Break)</li>
                          <li>14:10-14:30 (Afternoon Tea Break)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-2">Demo Data Management</h2>
                    <p className="text-slate-500 text-sm mb-4">Generate realistic academic data to test the system features.</p>
                    <Button 
                      onClick={handleGenerateDemoData}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer border-0"
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Generate Sample Data
                    </Button>
                  </div>
                  <Import isTab={true} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}
