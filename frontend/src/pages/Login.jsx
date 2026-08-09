import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Loader2, Calendar, GraduationCap, BookOpen, Users, UserRound } from 'lucide-react';
import authApi from '@/services/api/authApi';

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
  const { login, loginDemoTeacher, loading: checkingSession } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [demoTeachers, setDemoTeachers] = useState([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showDemoTeachers, setShowDemoTeachers] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const handleQuickLogin = (role) => {
    setSelectedRole(role);
    if (role === 'teacher') {
      openTeacherDemoLogin();
      return;
    }
    let email = '';
    let password = '';
    
    if (role === 'admin') {
      email = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@edux.com';
      password = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'Admin@123';
    } else if (role === 'student') {
      email = import.meta.env.VITE_DEMO_STUDENT_EMAIL || 'student@edux.com';
      password = import.meta.env.VITE_DEMO_STUDENT_PASSWORD || 'Student@123';
    }
    
    setShowDemoTeachers(false);
    
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    onSubmit({ email, password });
  };

  const openTeacherDemoLogin = async () => {
    setError('');
    setDemoLoading(true);
    try {
      const response = await authApi.getDemoTeachers();
      setDemoTeachers(response.data.teachers || []);
      setShowDemoTeachers(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Teacher demo login is unavailable.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleDemoTeacherLogin = async (teacherId) => {
    setLoading(true);
    setError('');
    try {
      const result = await loginDemoTeacher(teacherId);
      if (result?.user) navigate('/teacher-timetable');
    } catch (err) {
      setError(err.message || 'Unable to continue as teacher.');
      setLoading(false);
    }
  };



  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      const result = await login(data.email, data.password);
      if (result && result.user) {
        if (result.user.role === 'admin') {
          navigate('/dashboard');
        } else if (result.user.role === 'teacher') {
          navigate('/teacher-timetable');
        } else {
          navigate('/timetable');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

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
        .stagger-3  { animation-delay: 0.3s; opacity: 0; }
        .stagger-4  { animation-delay: 0.4s; opacity: 0; }
        .stagger-5  { animation-delay: 0.5s; opacity: 0; }
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
          <div className="absolute inset-0 opacity-10"
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

          <div className="relative w-full max-w-md space-y-8">

            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center slide-up stagger-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 mb-3">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Smart Timetable</h2>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/60 border border-blue-100 p-8 space-y-6 slide-up stagger-2">

              {/* Header */}
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-800">Welcome back 👋</h2>
                <p className="text-sm text-slate-500">Sign in to your account to continue</p>
              </div>

              {/* Quick Login Buttons */}
              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Quick Login As</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-all duration-200 hover:shadow-md hover:shadow-blue-50 active:scale-[0.96] group cursor-pointer"
                  >
                    <Users className="w-5 h-5 mb-1.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs font-bold">Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('teacher')}
                    disabled={demoLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-all duration-200 hover:shadow-md hover:shadow-indigo-50 active:scale-[0.96] group cursor-pointer"
                  >
                    {demoLoading ? <Loader2 className="w-5 h-5 mb-1.5 animate-spin" /> : <BookOpen className="w-5 h-5 mb-1.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />}
                    <span className="text-xs font-bold">Teacher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('student')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 transition-all duration-200 hover:shadow-md hover:shadow-emerald-50 active:scale-[0.96] group cursor-pointer"
                  >
                    <GraduationCap className="w-5 h-5 mb-1.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-xs font-bold">Student</span>
                  </button>
                </div>
              </div>

              {selectedRole === 'teacher' && showDemoTeachers && (
                <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div>
                    <p className="text-xs font-extrabold text-indigo-900">Select Teacher</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">Development demo access only.</p>
                  </div>
                  {demoTeachers.length === 0 ? (
                    <p className="text-xs text-slate-500">No teacher demo accounts are available.</p>
                  ) : demoTeachers.map((teacher) => (
                    <button
                      key={teacher.id}
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoTeacherLogin(teacher.id)}
                      className="w-full flex items-center gap-3 rounded-xl border border-white bg-white p-3 text-left hover:border-indigo-300 hover:shadow-sm transition-all disabled:opacity-50"
                    >
                      <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><UserRound className="w-4 h-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 truncate">{teacher.name}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{teacher.designation} · {teacher.department}</span>
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600">Login As Teacher</span>
                    </button>
                  ))}
                </div>
              )}


              {/* Error */}
              {error && (
                <div className="fade-in flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-red-400 text-base mt-0.5">⚠</span>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {/* Email */}
                <div className="slide-up stagger-3 space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className={`relative flex items-center rounded-xl border-2 transition-all duration-200 ${
                    focusedField === 'email'
                      ? 'border-blue-500 shadow-md shadow-blue-100'
                      : errors.email
                      ? 'border-red-300 bg-red-50'
                      : 'border-blue-100 hover:border-blue-300'
                  } bg-white`}>
                    <Mail className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedField === 'email' ? 'text-blue-500' : 'text-slate-300'}`} />
                    <input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none rounded-xl"
                      {...register('email', { required: 'Email is required' })}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500 font-medium pl-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="slide-up stagger-4 space-y-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Password
                  </label>
                  <div className={`relative flex items-center rounded-xl border-2 transition-all duration-200 ${
                    focusedField === 'password'
                      ? 'border-blue-500 shadow-md shadow-blue-100'
                      : errors.password
                      ? 'border-red-300 bg-red-50'
                      : 'border-blue-100 hover:border-blue-300'
                  } bg-white`}>
                    <Lock className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedField === 'password' ? 'text-blue-500' : 'text-slate-300'}`} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none rounded-xl"
                      {...register('password', { required: 'Password is required' })}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 text-slate-300 hover:text-blue-500 transition-colors text-xs font-semibold select-none bg-transparent border-0 cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 font-medium pl-1">{errors.password.message}</p>
                  )}
                  <div className="flex items-center justify-end pt-1">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* Submit */}
                <div className="slide-up stagger-5 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] cursor-pointer"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Register link */}
              <p className="text-center text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="text-blue-600 font-semibold hover:text-blue-700 hover:underline underline-offset-2 transition-colors"
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
