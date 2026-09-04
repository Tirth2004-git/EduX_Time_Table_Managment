import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authApi from '../services/api/authApi';
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
  Search,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const FLOATING_ICONS = [
  { icon: Calendar,       size: 'w-6 h-6',  pos: 'top-[12%] left-[8%]',   delay: '0s',    duration: '6s'  },
  { icon: GraduationCap,  size: 'w-8 h-8',  pos: 'top-[20%] right-[10%]', delay: '1s',    duration: '7s'  },
  { icon: BookOpen,       size: 'w-5 h-5',  pos: 'bottom-[25%] left-[6%]', delay: '2s',   duration: '8s'  },
  { icon: Users,          size: 'w-7 h-7',  pos: 'bottom-[15%] right-[8%]',delay: '0.5s', duration: '5.5s'},
  { icon: Calendar,       size: 'w-4 h-4',  pos: 'top-[45%] left-[3%]',   delay: '1.5s',  duration: '9s'  },
  { icon: BookOpen,       size: 'w-6 h-6',  pos: 'top-[60%] right-[5%]',  delay: '3s',    duration: '7.5s'},
];

export default function Login() {
  const navigate = useNavigate();
  const { login, loading: checkingSession } = useAuth();

  // Role state: 'admin' | 'teacher' | 'student'
  const [selectedRole, setSelectedRole] = useState('admin');

  // Teacher list state
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teachersError, setTeachersError] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Form input state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch teachers when Teacher role is activated
  useEffect(() => {
    if (selectedRole === 'teacher' && teachers.length === 0 && !loadingTeachers) {
      fetchTeachers();
    }
  }, [selectedRole]);

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    setTeachersError('');
    try {
      const res = await authApi.getTeachers();
      const list = res.data.data || res.data.teachers || res.data || [];
      setTeachers(list);
    } catch (err) {
      console.error('Failed to load teachers:', err);
      setTeachersError('Unable to load teachers list. Please try again.');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    setPassword('');
    setSelectedTeacher(null);
    setEmail('');
  };

  const handleSelectTeacherCard = (teacher) => {
    setSelectedTeacher(teacher);
    setEmail(teacher.email || '');
    setPassword('');
    setError('');
  };

  const handleBackToTeacherList = () => {
    setSelectedTeacher(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(email.trim(), password);
      if (result && result.user) {
        const userRole = String(result.user.role || '').toLowerCase();
        if (userRole === 'admin') {
          navigate('/dashboard', { replace: true });
        } else if (userRole === 'teacher') {
          navigate('/teacher-timetable', { replace: true });
        } else {
          navigate('/student-dashboard', { replace: true });
        }
      }
    } catch (err) {
      const msg = err?.message;
      setError(typeof msg === 'string' && msg ? msg : 'Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  // Filtered teachers list by search query
  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearch.toLowerCase();
    const nameMatch = (t.name || t.faculty_name || '').toLowerCase().includes(q);
    const emailMatch = (t.email || '').toLowerCase().includes(q);
    const deptMatch = (t.department || '').toLowerCase().includes(q) || (t.departmentShort || '').toLowerCase().includes(q);
    const desigMatch = (t.designation || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || deptMatch || desigMatch;
  });

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white/80 text-sm font-medium">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.15; }
          50%       { transform: translateY(-20px) rotate(8deg); opacity: 0.3; }
        }
        @keyframes blob {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          50%       { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .float-icon { animation: floatUp var(--dur, 6s) var(--delay, 0s) ease-in-out infinite; }
        .blob       { animation: blob 8s ease-in-out infinite; }
        .slide-up   { animation: slideUp 0.6s ease-out forwards; }
        .fade-in    { animation: fadeIn 0.4s ease-out forwards; }
        .stagger-1  { animation-delay: 0.1s; opacity: 0; }
        .stagger-2  { animation-delay: 0.2s; opacity: 0; }
      `}</style>

      <div className="min-h-screen flex font-sans overflow-hidden bg-slate-50">
        {/* ── Left Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col items-center justify-center p-12 overflow-hidden">
          {/* Blobs */}
          <div className="blob absolute -top-20 -left-20 w-72 h-72 bg-white/10" />
          <div className="blob absolute -bottom-16 -right-16 w-64 h-64 bg-blue-400/20" style={{ animationDelay: '4s' }} />
          <div className="blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-400/10" style={{ animationDelay: '2s' }} />

          {/* Floating icons */}
          {FLOATING_ICONS.map(({ icon: Icon, size, pos, delay, duration }, i) => (
            <div
              key={i}
              className={`float-icon absolute ${pos} text-white pointer-events-none`}
              style={{ '--dur': duration, '--delay': delay }}
            >
              <Icon className={size} />
            </div>
          ))}

          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />

          {/* Content */}
          <div className="relative z-10 text-center text-white max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold mb-3 leading-tight">
              Smart Timetable<br />
              <span className="text-blue-200">Management</span>
            </h1>
            <p className="text-blue-100 text-base leading-relaxed mb-10">
              Effortlessly schedule, manage and preview class timetables across programs, semesters and divisions.
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-3 text-left">
              {[
                { icon: Calendar,      text: 'Auto-generate weekly schedules' },
                { icon: Users,         text: 'Manage faculty workloads' },
                { icon: BookOpen,      text: 'Track subject allocations' },
                { icon: GraduationCap, text: 'Multi-division class support' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-white/90 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 lg:p-12 relative overflow-hidden">
          {/* Subtle bg shapes */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full opacity-30 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-100 rounded-full opacity-30 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative w-full max-w-md space-y-6">
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center slide-up stagger-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 mb-3">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Smart Timetable</h2>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/60 border border-blue-100 p-6 sm:p-8 space-y-6 slide-up stagger-2">
              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-800">Welcome back 👋</h2>
                <p className="text-sm text-slate-500">Sign in to your account to continue</p>
              </div>

              {/* Role Switcher Buttons */}
              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  Quick Login As
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('admin')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 active:scale-[0.96] group cursor-pointer ${
                      selectedRole === 'admin'
                        ? 'border-blue-500 bg-blue-50/90 text-blue-700 ring-2 ring-blue-400/30 shadow-md shadow-blue-50 font-bold'
                        : 'border-slate-100 hover:border-blue-200 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600'
                    }`}
                  >
                    <Users className={`w-5 h-5 mb-1.5 transition-colors ${selectedRole === 'admin' ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                    <span className="text-xs font-bold">Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('teacher')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 active:scale-[0.96] group cursor-pointer ${
                      selectedRole === 'teacher'
                        ? 'border-indigo-500 bg-indigo-50/90 text-indigo-700 ring-2 ring-indigo-400/30 shadow-md shadow-indigo-50 font-bold'
                        : 'border-slate-100 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600'
                    }`}
                  >
                    <BookOpen className={`w-5 h-5 mb-1.5 transition-colors ${selectedRole === 'teacher' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                    <span className="text-xs font-bold">Teacher</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSelect('student')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 active:scale-[0.96] group cursor-pointer ${
                      selectedRole === 'student'
                        ? 'border-emerald-500 bg-emerald-50/90 text-emerald-700 ring-2 ring-emerald-400/30 shadow-md shadow-emerald-50 font-bold'
                        : 'border-slate-100 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600'
                    }`}
                  >
                    <GraduationCap className={`w-5 h-5 mb-1.5 transition-colors ${selectedRole === 'student' ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                    <span className="text-xs font-bold">Student</span>
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="fade-in flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════ */}
              {/* 1. ADMIN LOGIN FORM                                      */}
              {/* ═════════════════════════════════════════════════════════ */}
              {selectedRole === 'admin' && (
                <div className="space-y-4 fade-in">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs font-medium text-blue-900">
                    <span className="font-bold">Admin Login</span> · Enter your administrative email and password.
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Email Address
                      </label>
                      <div className={`relative flex items-center rounded-xl border-2 transition-all ${
                        focusedField === 'admin-email'
                          ? 'border-blue-500 shadow-md shadow-blue-100'
                          : 'border-slate-200 hover:border-blue-200'
                      } bg-white`}>
                        <Mail className={`absolute left-3.5 w-4 h-4 ${focusedField === 'admin-email' ? 'text-blue-500' : 'text-slate-400'}`} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@example.com"
                          onFocus={() => setFocusedField('admin-email')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Password
                      </label>
                      <div className={`relative flex items-center rounded-xl border-2 transition-all ${
                        focusedField === 'admin-pass'
                          ? 'border-blue-500 shadow-md shadow-blue-100'
                          : 'border-slate-200 hover:border-blue-200'
                      } bg-white`}>
                        <Lock className={`absolute left-3.5 w-4 h-4 ${focusedField === 'admin-pass' ? 'text-blue-500' : 'text-slate-400'}`} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          onFocus={() => setFocusedField('admin-pass')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full pl-10 pr-12 py-2.5 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 text-slate-400 hover:text-blue-600 text-xs font-semibold bg-transparent border-0 cursor-pointer"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-semibold">
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                      ) : (
                        <>Sign In <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════ */}
              {/* 2. TEACHER SELECTION & LOGIN FLOW                        */}
              {/* ═════════════════════════════════════════════════════════ */}
              {selectedRole === 'teacher' && (
                <div className="space-y-4 fade-in">
                  {!selectedTeacher ? (
                    /* ── Teacher List Selection View ── */
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800">Select Teacher</h3>
                          <p className="text-xs text-slate-500">Choose your profile from the registered faculty</p>
                        </div>
                        <button
                          type="button"
                          onClick={fetchTeachers}
                          title="Refresh faculty list"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-0 bg-transparent cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingTeachers ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
                        <input
                          type="text"
                          placeholder="Search teacher by name, email, department..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                        />
                      </div>

                      {/* Teacher Cards Container */}
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                        {loadingTeachers ? (
                          <div className="py-12 text-center space-y-2">
                            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                            <p className="text-xs font-semibold text-slate-500">Loading teachers...</p>
                          </div>
                        ) : teachersError ? (
                          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center space-y-2">
                            <p className="text-xs font-bold text-red-600">{teachersError}</p>
                            <button
                              type="button"
                              onClick={fetchTeachers}
                              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors border-0 cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        ) : filteredTeachers.length === 0 ? (
                          <div className="py-10 text-center space-y-1 text-slate-400">
                            <Users className="w-8 h-8 mx-auto text-slate-300" />
                            <p className="text-xs font-bold text-slate-600">No registered teachers found</p>
                            <p className="text-[11px]">
                              {teacherSearch ? 'Try a different search query.' : 'Faculty profiles will appear here.'}
                            </p>
                          </div>
                        ) : (
                          filteredTeachers.map((teacher) => (
                            <div
                              key={teacher.id || teacher.email || teacher._id}
                              onClick={() => handleSelectTeacherCard(teacher)}
                              className="p-3.5 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-slate-50/70 hover:bg-indigo-50/50 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group hover:shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                                  {teacher.name ? teacher.name.charAt(0).toUpperCase() : 'T'}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                                    {teacher.name || teacher.faculty_name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 truncate">{teacher.email}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex px-2 py-0.2 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 truncate">
                                      {teacher.department || 'Faculty'}
                                    </span>
                                    {teacher.designation && teacher.designation !== 'Faculty Member' && (
                                      <span className="text-[10px] text-slate-400 truncate">
                                        · {teacher.designation}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-xl bg-white group-hover:bg-indigo-600 border border-slate-200 group-hover:border-indigo-600 text-slate-700 group-hover:text-white text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                Select <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── Selected Teacher Password Login View ── */
                    <div className="space-y-4 fade-in">
                      {/* Selected Teacher Summary Badge */}
                      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                            {selectedTeacher.name ? selectedTeacher.name.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wide block">
                              Selected Teacher
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">
                              {selectedTeacher.name || selectedTeacher.faculty_name}
                            </h4>
                            <p className="text-[11px] text-slate-600 truncate">{selectedTeacher.email || email}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleBackToTeacherList}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition-colors shrink-0 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Pre-filled Readonly Email */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Teacher Email
                          </label>
                          <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50">
                            <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                            <input
                              type="email"
                              readOnly
                              value={email}
                              className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-default"
                            />
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Enter Password <span className="text-red-500">*</span>
                          </label>
                          <div className={`relative flex items-center rounded-xl border-2 transition-all ${
                            focusedField === 'teacher-pass'
                              ? 'border-indigo-500 shadow-md shadow-indigo-100'
                              : 'border-slate-200 hover:border-indigo-200'
                          } bg-white`}>
                            <Lock className={`absolute left-3.5 w-4 h-4 ${focusedField === 'teacher-pass' ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              autoFocus
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              onFocus={() => setFocusedField('teacher-pass')}
                              onBlur={() => setFocusedField(null)}
                              className="w-full pl-10 pr-12 py-2.5 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3.5 text-slate-400 hover:text-indigo-600 text-xs font-semibold bg-transparent border-0 cursor-pointer"
                            >
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <div className="flex justify-end pt-1">
                            <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline font-semibold">
                              Forgot password?
                            </Link>
                          </div>
                        </div>

                        {/* Submit */}
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                        >
                          {loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                          ) : (
                            <>Sign In as Faculty <ArrowRight className="w-4 h-4" /></>
                          )}
                        </button>

                        {/* Back to list button */}
                        <button
                          type="button"
                          onClick={handleBackToTeacherList}
                          className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5 border-0 bg-transparent cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Teacher List
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* ═════════════════════════════════════════════════════════ */}
              {/* 3. STUDENT LOGIN FORM                                    */}
              {/* ═════════════════════════════════════════════════════════ */}
              {selectedRole === 'student' && (
                <div className="space-y-4 fade-in">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-900">
                    <span className="font-bold">Student Login</span> · Enter your registered student email and password.
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Email Address
                      </label>
                      <div className={`relative flex items-center rounded-xl border-2 transition-all ${
                        focusedField === 'student-email'
                          ? 'border-emerald-500 shadow-md shadow-emerald-100'
                          : 'border-slate-200 hover:border-emerald-200'
                      } bg-white`}>
                        <Mail className={`absolute left-3.5 w-4 h-4 ${focusedField === 'student-email' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          onFocus={() => setFocusedField('student-email')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Password
                      </label>
                      <div className={`relative flex items-center rounded-xl border-2 transition-all ${
                        focusedField === 'student-pass'
                          ? 'border-emerald-500 shadow-md shadow-emerald-100'
                          : 'border-slate-200 hover:border-emerald-200'
                      } bg-white`}>
                        <Lock className={`absolute left-3.5 w-4 h-4 ${focusedField === 'student-pass' ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          onFocus={() => setFocusedField('student-pass')}
                          onBlur={() => setFocusedField(null)}
                          className="w-full pl-10 pr-12 py-2.5 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 text-slate-400 hover:text-emerald-600 text-xs font-semibold bg-transparent border-0 cursor-pointer"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <div className="flex justify-end pt-1">
                        <Link to="/forgot-password" className="text-xs text-emerald-600 hover:underline font-semibold">
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                      ) : (
                        <>Sign In <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Register link (available for students & new accounts) */}
              <p className="text-center text-sm text-slate-500 pt-2 border-t border-slate-100">
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="text-blue-600 font-bold hover:text-blue-700 hover:underline underline-offset-2 transition-colors"
                >
                  Create one
                </Link>
              </p>
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-slate-400">
              Secured access · Smart Timetable System
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
