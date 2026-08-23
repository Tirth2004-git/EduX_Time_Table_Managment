import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import teacherPortalApi from '@/services/api/teacherPortalApi';
import { exportTimetableToPDF } from '@/utils/pdfExport';
import TeacherContent from '@/components/Elearning/TeacherContent';
import { showToast, ToastContainer } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, BookOpen, User, LogOut, CheckSquare, Bell,
  UserCheck, ShieldAlert, FileText, ChevronRight, Settings, Plus,
  Sparkles, Send, Trash2, LayoutDashboard, RefreshCw, Check, X,
  Briefcase, Activity, CalendarDays, Inbox
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '09:30-10:25',
  '10:25-11:20',
  '11:20-12:20', // Teachable/Break slot (customizable)
  '12:20-13:15',
  '13:15-14:10',
  '14:10-14:30', // Break slot
  '14:30-15:25',
  '15:25-16:20',
];

const timeSlotToMinutes = (slot) => {
  if (!slot || !slot.includes('-')) return 0;
  const startStr = slot.split('-')[0].trim();
  const [hours, minutes] = startStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export default function TeacherDashboard({ initialTab = 'timetable' }) {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data States
  const [timetable, setTimetable] = useState([]);
  const [timetableError, setTimetableError] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profile, setProfile] = useState(null);

  // View States
  const [timetableDayFilter, setTimetableDayFilter] = useState('Monday');
  const [timetableViewMode, setTimetableViewMode] = useState('week'); // 'day' or 'week'

  // Form States
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const [subSessionId, setSubSessionId] = useState('');
  const [subDate, setSubDate] = useState('');
  const [subReason, setSubReason] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataError, setDataError] = useState('');



  const loadData = useCallback(async () => {
    setLoading(true);
    setDataError('');
    try {
      if (activeTab === 'timetable') {
        setTimetableError('');
        const res = await teacherPortalApi.getTimetable();
        setTimetable(res.data.timetable);
      } else if (activeTab === 'leaves') {
        const res = await teacherPortalApi.getLeaves();
        setLeaves(res.data.leaves);
      } else if (activeTab === 'profile') {
        const res = await teacherPortalApi.getProfile();
        setProfile(res.data.profile);
      } else if (activeTab === 'notifications') {
        const res = await teacherPortalApi.getNotifications();
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load portal data';
      setDataError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || String(user.role).toLowerCase() !== 'teacher') {
      navigate('/login');
      return;
    }

    loadData();
  }, [user, authLoading, navigate, loadData]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  // Leave Submit
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      showToast('Please select leave start and end dates', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await teacherPortalApi.applyLeave({
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason,
      });
      showToast(res.data.message || 'Leave applied successfully', 'success');
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      // Refresh leaves list
      const updated = await teacherPortalApi.getLeaves();
      setLeaves(updated.data.leaves);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to apply leave', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Leave
  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave?')) return;
    try {
      const res = await teacherPortalApi.cancelLeave(id);
      showToast(res.data.message || 'Leave request cancelled', 'success');
      // Refresh leaves list
      const updated = await teacherPortalApi.getLeaves();
      setLeaves(updated.data.leaves);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to cancel leave', 'error');
    }
  };


  // Mark notification read
  const handleMarkRead = async (id) => {
    try {
      await teacherPortalApi.markNotificationRead(id);
      // Refresh notifications list
      const res = await teacherPortalApi.getNotifications();
      setNotifications(res.data.notifications);
    } catch (err) {
      console.error(err);
    }
  };

  // Export schedule to PDF
  const handleDownloadPDF = async () => {
    try {
      showToast('Generating timetable PDF...', 'info');
      await exportTimetableToPDF({
        title: `Faculty Weekly Timetable - ${user?.name || 'Teacher'}`,
        filename: `timetable_${user?.name?.toLowerCase().replace(/\s+/g, '_') || 'teacher'}.pdf`,
      });
      showToast('Timetable PDF downloaded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export PDF', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500">Authenticating Faculty Portal...</p>
        </div>
      </div>
    );
  }

  // Sidebar Menu List
  const menuItems = [
    { id: 'timetable', label: 'My Timetable', icon: Calendar },
    { id: 'leaves', label: 'Leaves Management', icon: CalendarDays },
    { id: 'elearning', label: 'My Content', icon: BookOpen },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans">
      <ToastContainer />

      {/* ── Mobile Header Bar ── */}
      <header className="lg:hidden w-full h-16 bg-white border-b border-slate-200 fixed top-0 left-0 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-slate-800 tracking-tight text-base">EduX Faculty</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg border-0 cursor-pointer"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Inbox className="w-6 h-6" />}
        </button>
      </header>

      {/* ── Fixed Left Sidebar ── */}
      <aside
        className={`w-64 border-r border-slate-200/80 bg-white flex flex-col fixed h-full z-50 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative`}
      >
        {/* Sidebar Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black text-slate-800 tracking-tight text-lg block">EduX Portal</span>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Faculty Module</span>
          </div>
        </div>

        {/* User Card */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.name || 'Faculty Member'}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  navigate(`/teacher-${item.id}`);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer border-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Logout Footer */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <LogOut className="w-4 h-4" />
            Logout Account
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 pt-16 lg:pt-0 pb-12 px-4 md:px-8">
        {/* Top Header Panel */}
        <header className="hidden lg:flex h-20 items-center justify-between border-b border-slate-100 mb-8 shrink-0">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              {activeTab === 'elearning' ? 'My Content' : `My ${activeTab === 'timetable' ? 'Timetable' : activeTab === 'leaves' ? 'Leaves' : activeTab === 'preferences' ? 'Preferences' : activeTab === 'notifications' ? 'Notifications' : 'Profile'}`}
            </h1>
            <p className="text-xs text-slate-500">
              {activeTab === 'elearning' 
                ? 'Manage learning materials, assignments and quizzes for your assigned subjects.' 
                : 'Welcome to your scheduling console and academic planner.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Date & Time</span>
              <span className="text-sm font-bold text-slate-700">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        {/* Content Tabs Wrapper */}
        <div className="flex-1 flex flex-col mt-4 lg:mt-0">
          {loading && (
            <div className="flex-1 flex items-center justify-center p-12 bg-white rounded-3xl border border-slate-200/60 shadow-sm min-h-[300px]">
              <div className="text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500">Loading data...</p>
              </div>
            </div>
          )}

          {!loading && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                {/* ──────────────────────────────────────────────────────── */}
                {/* 0. MY CONTENT (E-LEARNING) TAB                            */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'elearning' && (
                  <TeacherContent />
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* 1. DASHBOARD TAB                                         */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'timetable' && (
                  <div className="space-y-6">
                    {timetableError ? (
                      <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm font-semibold text-red-700">{timetableError}</div>
                    ) : timetable.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                        <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-700">No timetable assigned yet.</p>
                        <p className="text-xs text-slate-500 mt-1">Ask an administrator to assign a lecture timetable.</p>
                      </div>
                    ) : <>
                    {/* Timetable Controls */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-800">Academic Schedule Grid</h2>
                        <p className="text-xs text-slate-500">View and print your weekly timetable configuration.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="border border-slate-200 rounded-xl p-1 flex bg-slate-50">
                          <button
                            onClick={() => setTimetableViewMode('week')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${
                              timetableViewMode === 'week' 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Week View
                          </button>
                          <button
                            onClick={() => setTimetableViewMode('day')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${
                              timetableViewMode === 'day' 
                                ? 'bg-white text-slate-800 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Day View
                          </button>
                        </div>
                        <Button
                          onClick={handleDownloadPDF}
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                        >
                          <FileText className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
                      </div>
                    </div>

                    {/* Week View Grid */}
                    {timetableViewMode === 'week' ? (
                      <div id="timetable-export-container" className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm overflow-x-auto">
                        <div className="min-w-[800px] space-y-6">
                          <div className="grid grid-cols-7 gap-3 text-center">
                            {/* Header row corner */}
                            <div className="text-slate-400 font-black text-[10px] uppercase text-left pl-3 self-center">Time Slot</div>
                            {DAYS.map(day => (
                              <div key={day} className="py-2.5 rounded-xl bg-slate-50 text-slate-800 font-extrabold text-xs">
                                {day}
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3">
                            {TIME_SLOTS.map(slot => {
                              const isBreak = slot === '11:20-12:20' || slot === '14:10-14:30';
                              return (
                                <div key={slot} className="grid grid-cols-7 gap-3">
                                  {/* Row timeslot header */}
                                  <div className="p-3 text-slate-800 font-bold text-xs self-center border-l-4 border-slate-200 pl-3">
                                    {slot}
                                  </div>

                                  {/* Grid cells */}
                                  {DAYS.map(day => {
                                    if (isBreak) {
                                      return (
                                        <div
                                          key={`${day}-${slot}`}
                                          className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400"
                                        >
                                          Break
                                        </div>
                                      );
                                    }

                                    const classes = timetable.filter(
                                      c => c.day === day && c.timeSlot === slot
                                    );

                                    const renderCell = (cls) => {
                                      if (cls.displayType === 'leave_impacted') {
                                        return (
                                          <div key={cls._id} className="space-y-1">
                                            <span className="font-extrabold text-xs text-amber-700 block">Leave Approved</span>
                                            <span className="text-[9px] text-amber-600">Awaiting substitute</span>
                                          </div>
                                        );
                                      }
                                      if (cls.displayType === 'substituted') {
                                        return (
                                          <div key={cls._id} className="space-y-1">
                                            <span className="font-extrabold text-xs text-indigo-900 block">{cls.subjectId?.subject_name}</span>
                                            <span className="text-[9px] text-emerald-600 font-bold">Substituted by: {cls.substituteName || cls.effectiveTeacherId?.faculty_name}</span>
                                          </div>
                                        );
                                      }
                                      if (cls.displayType === 'cover' || cls.isCover) {
                                        return (
                                          <div key={cls._id} className="space-y-1">
                                            <span className="font-extrabold text-xs text-cyan-800 block">Cover Lecture</span>
                                            <span className="text-[10px] text-cyan-600">{cls.subjectId?.subject_name}</span>
                                            <span className="text-[9px] text-slate-500">{cls.program} Div {cls.division}</span>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div key={cls._id} className="space-y-2">
                                          <div>
                                            <span className="font-extrabold text-xs text-indigo-900 block truncate leading-tight">
                                              {cls.subjectId?.subject_name}
                                            </span>
                                            <span className="text-[10px] text-indigo-500 font-semibold block uppercase">
                                              {cls.subjectId?.subject_code}
                                            </span>
                                          </div>
                                          <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-slate-500 block truncate">
                                              {cls.program} Sem-{cls.semester} Div {cls.division}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="px-1.5 py-0.5 rounded bg-white border border-indigo-100 text-[9px] font-black text-indigo-700">
                                                R-{cls.classroomId?.roomNumber || cls.classroomId?.room_id || 'N/A'}
                                              </span>
                                              {cls.isLab && (
                                                <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-[9px] font-black text-rose-600 uppercase">
                                                  Lab
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    };

                                    return (
                                      <div
                                        key={`${day}-${slot}`}
                                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] ${
                                          classes.length > 0 
                                            ? 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 border-indigo-100 hover:shadow-md hover:scale-[1.01]' 
                                            : 'bg-white border-slate-100 border-dashed hover:border-slate-300'
                                        }`}
                                      >
                                        {classes.length > 0 ? (
                                          classes.map(renderCell)
                                        ) : (
                                          <span className="text-[10px] text-slate-400 font-semibold italic self-center m-auto">Free</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Day View */
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Day Selector */}
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-2.5 h-fit">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Workday</h3>
                          <div className="flex flex-col gap-1.5">
                            {DAYS.map(day => (
                              <button
                                key={day}
                                onClick={() => setTimetableDayFilter(day)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 ${
                                  timetableDayFilter === day 
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {day}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* List of day's classes */}
                        <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                          <h3 className="text-base font-extrabold text-slate-800">Lectures for {timetableDayFilter}</h3>
                          {timetable.filter(c => c.day === timetableDayFilter).length === 0 ? (
                            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-xs text-slate-500 font-semibold">No classes scheduled on {timetableDayFilter}.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {timetable
                                .filter(c => c.day === timetableDayFilter)
                                .sort((a, b) => timeSlotToMinutes(a.timeSlot) - timeSlotToMinutes(b.timeSlot))
                                .map(cls => (
                                  <div
                                    key={cls._id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-150 bg-slate-50/30"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs font-bold text-center shrink-0">
                                        <Clock className="w-3.5 h-3.5 mx-auto mb-1" />
                                        {cls.timeSlot}
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-extrabold text-slate-800">{cls.subjectId?.subject_name}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                          {cls.subjectId?.subject_code} · {cls.subjectId?.type}
                                        </p>
                                        <span className="text-xs text-slate-600 font-medium block mt-1.5">
                                          {cls.program} Sem-{cls.semester} Div {cls.division}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                                        Room {cls.classroomId?.roomNumber || 'N/A'}
                                      </span>
                                      {cls.isLab && (
                                        <span className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-xs font-bold text-rose-600 uppercase">
                                          Lab
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </>}
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* 3. LEAVES TAB                                            */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'leaves' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Apply Leave Card */}
                    <Card className="rounded-3xl border-slate-200 shadow-sm bg-white h-fit">
                      <CardHeader className="p-6 border-b border-slate-50">
                        <CardTitle className="text-base font-extrabold text-slate-800">Apply for Leave</CardTitle>
                        <CardDescription className="text-xs">Submit a leave request for administrator review.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <form onSubmit={handleApplyLeave} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">Start Date</label>
                              <Input
                                type="date"
                                value={leaveStart}
                                onChange={(e) => setLeaveStart(e.target.value)}
                                className="rounded-xl border-slate-200 text-xs focus:ring-indigo-500"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">End Date</label>
                              <Input
                                type="date"
                                value={leaveEnd}
                                onChange={(e) => setLeaveEnd(e.target.value)}
                                className="rounded-xl border-slate-200 text-xs focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Reason / Description</label>
                            <textarea
                              rows={4}
                              value={leaveReason}
                              onChange={(e) => setLeaveReason(e.target.value)}
                              placeholder="Describe details for leaves approval..."
                              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                          >
                            {submitting ? 'Submitting...' : 'Apply Leave Request'}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Leaves Status / History Table */}
                    <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                      <h3 className="text-base font-extrabold text-slate-800">Leave Applications History</h3>
                      {leaves.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-semibold">No leave applications recorded.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                <th className="pb-3 pl-2">Dates</th>
                                <th className="pb-3">Reason</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Admin Comments</th>
                                <th className="pb-3 text-right pr-2">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                              {leaves.map((leave) => (
                                <tr key={leave._id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3.5 pl-2">
                                    <span className="font-bold text-slate-800 block">
                                      {new Date(leave.startDate).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      to {new Date(leave.endDate).toLocaleDateString()}
                                    </span>
                                  </td>
                                  <td className="py-3.5 max-w-[150px] truncate text-xs text-slate-600 font-medium">
                                    {leave.reason || 'None specified'}
                                  </td>
                                  <td className="py-3.5">
                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-block border ${
                                      leave.status === 'Approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                      leave.status === 'Rejected' ? 'bg-red-50 border-red-100 text-red-700' :
                                      'bg-amber-50 border-amber-100 text-amber-700'
                                    }`}>
                                      {leave.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 text-xs text-slate-500 italic max-w-[120px] truncate">
                                    {leave.comments || 'None'}
                                  </td>
                                  <td className="py-3.5 text-right pr-2">
                                    {leave.status === 'Pending' && (
                                      <button
                                        onClick={() => handleCancelLeave(leave._id)}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-xl transition-all border-0 bg-transparent cursor-pointer"
                                        title="Cancel leave request"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'substitutions' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Request Cover form */}
                    <Card className="rounded-3xl border-slate-200 shadow-sm bg-white h-fit">
                      <CardHeader className="p-6 border-b border-slate-50">
                        <CardTitle className="text-base font-extrabold text-slate-800 font-sans">Request Cover Faculty</CardTitle>
                        <CardDescription className="text-xs">Request cover for a specific lecture slot.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <form onSubmit={handleRequestSubstitution} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Select Lecture Slot</label>
                            <select
                              value={subSessionId}
                              onChange={(e) => setSubSessionId(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 p-3 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            >
                              <option value="">-- Choose Scheduled Session --</option>
                              {timetable.map(slot => (
                                <option key={slot._id} value={slot._id}>
                                  {slot.day} {slot.timeSlot} · {slot.subjectId?.subject_code} ({slot.program} {slot.className}-{slot.division})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Absent Date</label>
                            <Input
                              type="date"
                              value={subDate}
                              onChange={(e) => setSubDate(e.target.value)}
                              className="rounded-xl border-slate-200 text-xs focus:ring-indigo-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">Reason for Absence</label>
                            <textarea
                              rows={3}
                              value={subReason}
                              onChange={(e) => setSubReason(e.target.value)}
                              placeholder="Mention reason for coverage..."
                              className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 font-medium"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                          >
                            {submitting ? 'Submitting...' : 'Send Substitution Request'}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Substitution List */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Requested substitution list */}
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-extrabold text-slate-800">Your Requested Covers</h3>
                        {substitutions.requested.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <RefreshCw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-semibold">No requested covers recorded.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                  <th className="pb-3 pl-2">Lecture Details</th>
                                  <th className="pb-3">Absent Date</th>
                                  <th className="pb-3">Status</th>
                                  <th className="pb-3">Assigned Substitute</th>
                                  <th className="pb-3">Admin Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
                                {substitutions.requested.map((req) => (
                                  <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 pl-2">
                                      <span className="font-extrabold text-slate-800 block">
                                        {req.timetableId?.subjectId?.subject_name || 'Class'}
                                      </span>
                                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                                        {req.timetableId?.timeSlot} · Room {req.timetableId?.classroomId?.roomNumber || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="py-3 text-xs font-semibold text-slate-600">
                                      {new Date(req.date).toLocaleDateString()}
                                    </td>
                                    <td className="py-3">
                                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-block border ${
                                        req.status === 'Assigned' || req.status === 'Approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                        req.status === 'Rejected' ? 'bg-red-50 border-red-100 text-red-700' :
                                        'bg-amber-50 border-amber-100 text-amber-700'
                                      }`}>
                                        {req.status}
                                      </span>
                                    </td>
                                    <td className="py-3 text-xs font-bold text-slate-800">
                                      {req.substituteTeacherId?.faculty_name || (req.status === 'Pending' ? 'Searching...' : 'Declined')}
                                    </td>
                                    <td className="py-3 text-xs italic text-slate-500 max-w-[120px] truncate">
                                      {req.adminNotes || 'None'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Cover lessons assigned to this teacher */}
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="text-base font-extrabold text-slate-800">Assigned Replacement Covers</h3>
                        <p className="text-xs text-slate-500">Lectures you are covering for absent faculty.</p>
                        {substitutions.assignedCovers.length === 0 ? (
                          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-500 font-semibold">You have no assigned cover lessons.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {substitutions.assignedCovers.map((item) => (
                              <div
                                key={item._id}
                                className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-[10px] font-black text-indigo-700 uppercase">
                                      Replacement cover
                                    </span>
                                    <span className="text-xs text-slate-500 font-semibold">
                                      Date: {new Date(item.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-extrabold text-slate-850 mt-1">
                                    {item.timetableId?.subjectId?.subject_name}
                                  </h4>
                                  <p className="text-xs text-slate-500 font-medium">
                                    Cover for <span className="font-bold text-slate-700">{item.teacherId?.faculty_name}</span> · Slot: {item.timetableId?.timeSlot}
                                  </p>
                                </div>
                                <div className="px-3 py-1.5 rounded-xl bg-white border border-indigo-150 text-xs font-bold text-indigo-700 text-center shrink-0">
                                  Room {item.timetableId?.classroomId?.roomNumber || 'N/A'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* 6. AVAILABILITY RULES (PREFERENCES) TAB                   */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    {/* Header Panel */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-extrabold text-slate-800">Availability Preferences & Load Limits</h2>
                        <p className="text-xs text-slate-500">Setup your preferred slots, unavailable slots, and maximum workload hours.</p>
                      </div>
                      <Button
                        onClick={handleSavePreferences}
                        disabled={submitting}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                      >
                        <Send className="w-4 h-4 mr-2" /> Save Preference Rules
                      </Button>
                    </div>

                    {/* Preferences Setup Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Max Workload Card */}
                      <Card className="rounded-3xl border-slate-200 shadow-sm bg-white h-fit">
                        <CardHeader className="p-6 border-b border-slate-50">
                          <CardTitle className="text-base font-extrabold text-slate-800">Maximum Weekly Workload</CardTitle>
                          <CardDescription className="text-xs">Limit the maximum hours you can teach in a week.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="space-y-2.5">
                            <div className="flex justify-between font-bold text-sm text-slate-800">
                              <span>Max workload limit:</span>
                              <span className="text-indigo-600">{preferences.maxWorkload || 40} hours</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={60}
                              step={1}
                              value={preferences.maxWorkload || 40}
                              onChange={(e) => setPreferences({ ...preferences, maxWorkload: Number(e.target.value) })}
                              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-[10px] font-bold text-slate-400">
                              <span>0 hrs</span>
                              <span>30 hrs</span>
                              <span>60 hrs</span>
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 text-xs text-indigo-700 space-y-2">
                            <p className="font-extrabold flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> AI Scheduler Ingest</p>
                            <p className="leading-relaxed">The AI Timetable builder will strictly read this limit and prevent scheduling more classes than specified.</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Interactive Slot Preferences Card */}
                      <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-800">Preferred & Unavailable Slots Setup</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Click cells in the grid to cycle slot rules: 
                            <span className="font-bold text-emerald-600 ml-1.5">Preferred (Green)</span> → 
                            <span className="font-bold text-rose-600 ml-1.5">Unavailable (Red)</span> → 
                            <span className="font-bold text-slate-400 ml-1.5">Neutral (White)</span>.
                          </p>
                        </div>

                        <div className="overflow-x-auto">
                          <div className="min-w-[700px] space-y-4">
                            {/* Days header row */}
                            <div className="grid grid-cols-7 gap-2 text-center">
                              <div className="text-slate-400 font-bold text-[10px] uppercase text-left pl-2 self-center">Slot</div>
                              {DAYS.map(day => (
                                <div key={day} className="py-2 bg-slate-50 rounded-xl text-slate-700 font-bold text-xs">
                                  {day}
                                </div>
                              ))}
                            </div>

                            {/* Slot grid */}
                            <div className="space-y-2">
                              {TIME_SLOTS.map(slot => {
                                const isBreak = slot === '11:20-12:20' || slot === '14:10-14:30';
                                return (
                                  <div key={slot} className="grid grid-cols-7 gap-2">
                                    <div className="text-xs text-slate-750 font-bold self-center border-l-2 border-slate-200 pl-2">
                                      {slot}
                                    </div>
                                    {DAYS.map(day => {
                                      if (isBreak) {
                                        return (
                                          <div
                                            key={`${day}-${slot}`}
                                            className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase select-none"
                                          >
                                            Break
                                          </div>
                                        );
                                      }

                                      const isPreferred = preferences.preferredSlots?.some(
                                        s => s.day === day && s.timeSlot === slot
                                      );
                                      const isUnavailable = preferences.unavailableSlots?.some(
                                        s => s.day === day && s.timeSlot === slot
                                      );

                                      return (
                                        <button
                                          key={`${day}-${slot}`}
                                          type="button"
                                          onClick={() => handleToggleSlotPreference(day, slot)}
                                          className={`p-3.5 rounded-xl border font-bold text-[10px] flex flex-col items-center justify-center gap-1 min-h-[50px] transition-all cursor-pointer ${
                                            isPreferred
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                                              : isUnavailable
                                              ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm'
                                              : 'bg-white border-slate-150 hover:bg-slate-50 text-slate-500'
                                          }`}
                                        >
                                          {isPreferred && (
                                            <>
                                              <Check className="w-3.5 h-3.5" />
                                              <span>Preferred</span>
                                            </>
                                          )}
                                          {isUnavailable && (
                                            <>
                                              <X className="w-3.5 h-3.5" />
                                              <span>Unavailable</span>
                                            </>
                                          )}
                                          {!isPreferred && !isUnavailable && (
                                            <span className="text-[10px] text-slate-300 font-semibold italic">Neutral</span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* 7. MY PROFILE TAB                                        */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'profile' && profile && (
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* Faculty Profile Info Card */}
                    <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
                      <div className="h-28 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 relative">
                        <div className="absolute -bottom-10 left-8">
                          <div className="w-20 h-20 rounded-2xl bg-indigo-50 border-4 border-white flex items-center justify-center shadow-lg shadow-indigo-100">
                            <User className="w-10 h-10 text-indigo-600" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-14 p-8 space-y-6">
                        <div>
                          <h2 className="text-2xl font-black text-slate-800">{profile.name}</h2>
                          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500 mt-2">
                            <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-indigo-400" /> {profile.designation || 'Not available'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-indigo-400" /> {profile.department || 'Not available'}</span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Teacher ID</p>
                            <p className="text-sm font-bold text-slate-800">{profile.teacher_id || 'Not available'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                            <p className="text-sm font-bold text-slate-800">{profile.email || 'Not available'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile</p>
                            <p className="text-sm font-bold text-slate-800">{profile.mobile || 'Not available'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</p>
                            <p className="text-sm font-bold text-slate-800">{profile.experience == null ? 'Not available' : `${profile.experience} Years`}</p>
                          </div>
                        </div>

                        {/* Subjects Assigned */}
                        <div className="space-y-3 pt-6 border-t border-slate-55">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-slate-400" /> Assigned Subjects list
                          </h3>
                          {!profile.subjects?.length ? (
                            <p className="text-xs text-slate-500 font-semibold italic">No subjects assigned yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2.5">
                              {profile.subjects.map(sub => (
                                <span
                                  key={sub.id}
                                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2"
                                >
                                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                  <span>{sub.name || 'Not available'}{sub.code ? ` (${sub.code})` : ''}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
                          {[
                            ['Weekly Limit', `${Number(profile.teaching_hours) || 0} hours`],
                            ['Assigned Hours', `${Number(profile.assignedHours) || 0} hours`],
                            ['Remaining Hours', `${Number(profile.remainingHours) || 0} hours`],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                              <p className="text-lg font-black text-slate-800 mt-1">{value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3 pt-6 border-t border-slate-100">
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Assigned Divisions</h3>
                          {!profile.divisions?.length ? (
                            <p className="text-xs text-slate-500 font-semibold italic">No divisions assigned.</p>
                          ) : profile.divisions.map((division) => (
                            <span key={`${division.semester}-${division.name}`} className="inline-flex mr-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                              {division.semester ? `Semester ${division.semester} — ` : ''}Division {division.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* 8. NOTIFICATIONS TAB                                     */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'notifications' && (
                  <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-800">Notifications Center</h2>
                      <p className="text-xs text-slate-500">Track leave reviews, timetable edits, and substitutions.</p>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-semibold">You have no notifications.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {notifications.map((notif) => (
                          <div
                            key={notif._id}
                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                              notif.isRead 
                                ? 'bg-slate-50/50 border-slate-100' 
                                : 'bg-indigo-50/20 border-indigo-150 shadow-sm shadow-indigo-100/5'
                            }`}
                          >
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                              notif.type === 'leave_status' ? 'bg-amber-100 text-amber-600' :
                              notif.type === 'substitution' ? 'bg-cyan-100 text-cyan-600' :
                              'bg-indigo-100 text-indigo-600'
                            }`}>
                              <Bell className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-3">
                                <h4 className="text-sm font-extrabold text-slate-800">{notif.title}</h4>
                                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                  {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-650 mt-1.5 leading-relaxed">{notif.message}</p>
                            </div>
                            {!notif.isRead && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkRead(notif._id)}
                                className="rounded-xl text-xs border-slate-200 hover:bg-slate-100 self-center shrink-0 cursor-pointer"
                              >
                                Mark Read
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
}
