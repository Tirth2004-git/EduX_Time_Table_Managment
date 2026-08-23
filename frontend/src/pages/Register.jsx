import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import authApi from '../services/api/authApi';
import api from '../services/api';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Calendar,
  GraduationCap,
  BookOpen,
  Users,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

const FLOATING_ICONS = [
  { icon: Calendar,       size: 'w-6 h-6',  pos: 'top-[10%] left-[7%]',   delay: '0s',    duration: '6s'  },
  { icon: GraduationCap,  size: 'w-8 h-8',  pos: 'top-[18%] right-[9%]',  delay: '1s',    duration: '7s'  },
  { icon: BookOpen,       size: 'w-5 h-5',  pos: 'bottom-[28%] left-[5%]', delay: '2s',   duration: '8s'  },
  { icon: Users,          size: 'w-7 h-7',  pos: 'bottom-[14%] right-[7%]',delay: '0.5s', duration: '5.5s'},
  { icon: ShieldCheck,    size: 'w-4 h-4',  pos: 'top-[48%] left-[3%]',   delay: '1.5s',  duration: '9s'  },
  { icon: BookOpen,       size: 'w-6 h-6',  pos: 'top-[62%] right-[4%]',  delay: '3s',    duration: '7.5s'},
];

const STEPS_INFO = [
  { num: 1, label: 'Create Account', desc: 'Fill in your details' },
  { num: 2, label: 'Verify Email',  desc: 'Enter the OTP sent to you' },
  { num: 3, label: 'Start Scheduling', desc: 'Access your dashboard' },
];

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [step, setStep] = useState('register');
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [academicData, setAcademicData] = useState({ departments: [], semesters: [], divisions: [] });
  const [academicSelection, setAcademicSelection] = useState({ department: '', semester: '', divisionId: '' });

  const { register, handleSubmit, formState: { errors } } = useForm();
  const { register: registerOtp, handleSubmit: handleSubmitOtp, setValue, formState: { errors: otpErrors } } = useForm();

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    Promise.all([api.get('/departments'), api.get('/semesters'), api.get('/divisions')])
      .then(([departments, semesters, divisions]) => {
        setAcademicData({
          departments: departments.data.data || departments.data.departments || departments.data || [],
          semesters: semesters.data.data || semesters.data.semesters || semesters.data || [],
          divisions: divisions.data.data || divisions.data.divisions || divisions.data || [],
        });
      })
      .catch(() => setError('Unable to load academic options. Please try again.'));
  }, []);
  const semesters = useMemo(
    () => academicData.semesters.filter((semester) => String(semester.department?._id || semester.department) === academicSelection.department),
    [academicData.semesters, academicSelection.department],
  );
  const divisions = useMemo(
    () => academicData.divisions.filter((division) =>
      String(division.department?._id || division.department) === academicSelection.department &&
      String(division.semester?._id || division.semester) === academicSelection.semester,
    ),
    [academicData.divisions, academicSelection],
  );

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otpValues];
    next[index] = value.slice(-1);
    setOtpValues(next);
    setValue('otp', next.join(''));
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtpValues(digits);
      setValue('otp', pasteData);
      document.getElementById('otp-5')?.focus();
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const normalizedEmail = data.email.trim().toLowerCase();
      const response = await authApi.register({
        ...data,
        email: normalizedEmail,
        departmentId: academicSelection.department,
        semesterId: academicSelection.semester,
        divisionId: academicSelection.divisionId,
      });
      if (response.data && response.data.error) {
        setError(response.data.error || 'Registration failed');
        setLoading(false);
        return;
      }
      setPendingEmail(normalizedEmail);
      setStep('verify');
      setResendCooldown(60);
      setMessage('Verification code sent to your email! Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (data) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await authApi.verifyOtp(pendingEmail, data.otp);
      if (response.data && response.data.error) {
        setError(response.data.error || 'OTP verification failed');
        return;
      }
      setVerified(true);
      setMessage('Email Verified ✓ Account Created Successfully');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setResendingOtp(true);
    setError('');
    setMessage('');
    try {
      const res = await authApi.sendOtp(pendingEmail);
      setMessage(res.data?.message || 'New 6-digit verification code sent to your email.');
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to resend OTP');
    } finally {
      setResendingOtp(false);
    }
  };

  const fieldCls = (name, hasError) =>
    `relative flex items-center rounded-xl border-2 transition-all duration-200 bg-white ${
      focusedField === name
        ? 'border-blue-500 shadow-md shadow-blue-100'
        : hasError
        ? 'border-red-300 bg-red-50/40'
        : 'border-blue-100 hover:border-blue-300'
    }`;

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
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.7); }
          70%  { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .float-icon { animation: floatUp var(--dur, 6s) var(--delay, 0s) ease-in-out infinite; }
        .blob       { animation: blob 8s ease-in-out infinite; }
        .slide-up   { animation: slideUp 0.55s ease-out forwards; }
        .fade-in    { animation: fadeIn 0.35s ease-out forwards; }
        .pop-in     { animation: popIn 0.5s cubic-bezier(.34,1.56,.64,1) forwards; }
        .slide-right{ animation: slideRight 0.45s ease-out forwards; }
        .s1{ animation-delay: 0.08s; opacity: 0 } .s2{ animation-delay: 0.16s; opacity: 0 }
        .s3{ animation-delay: 0.24s; opacity: 0 } .s4{ animation-delay: 0.32s; opacity: 0 }
        .s5{ animation-delay: 0.40s; opacity: 0 } .s6{ animation-delay: 0.48s; opacity: 0 }
        .s7{ animation-delay: 0.56s; opacity: 0 }
      `}</style>

      <div className="min-h-screen flex font-sans overflow-hidden bg-slate-50">
        {/* ── Left Panel ── */}
        <div className="hidden lg:flex lg:w-[42%] relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col items-center justify-center p-12 overflow-hidden">
          <div className="blob absolute -top-20 -left-20 w-72 h-72 bg-white/10" />
          <div className="blob absolute -bottom-16 -right-16 w-64 h-64 bg-blue-400/20" style={{ animationDelay: '4s' }} />
          <div className="blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-400/10" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />

          {FLOATING_ICONS.map(({ icon: Icon, size, pos, delay, duration }, i) => (
            <div
              key={i}
              className={`float-icon absolute ${pos} text-white pointer-events-none`}
              style={{ '--dur': duration, '--delay': delay }}
            >
              <Icon className={size} />
            </div>
          ))}

          <div className="relative z-10 text-center text-white max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold mb-3 leading-tight">
              Join Smart<br />
              <span className="text-blue-200">Timetable</span>
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed mb-10">
              Create your account in minutes and start managing schedules, faculty workloads and classroom assignments.
            </p>

            {/* Progress steps */}
            <div className="flex flex-col gap-3 text-left">
              {STEPS_INFO.map(({ num, label, desc }) => {
                const done = (num === 1 && step === 'verify') || (num === 2 && verified) || (num === 3 && verified);
                const active = (num === 1 && step === 'register') || (num === 2 && step === 'verify' && !verified);
                return (
                  <div key={num} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                    active ? 'bg-white/20 border-white/40 shadow-lg' : done ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 opacity-60'
                  }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                      done ? 'bg-green-400 text-white' : active ? 'bg-white text-blue-600' : 'bg-white/20 text-white/60'
                    }`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : num}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-blue-200">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 lg:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full opacity-30 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-100 rounded-full opacity-30 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative w-full max-w-md space-y-6">
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center slide-up s1">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 mb-3">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Smart Timetable</h2>
            </div>

            {/* ── Register Step ── */}
            {step === 'register' && (
              <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/60 border border-blue-100 p-8 space-y-5 slide-up s2">
                <div className="space-y-1">
                  <h2 className="text-2xl font-extrabold text-slate-800">Create Account ✨</h2>
                  <p className="text-sm text-slate-500">Fill in the details below to get started</p>
                </div>

                {error && (
                  <div className="fade-in flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="text-red-400 mt-0.5">⚠</span>
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Full Name */}
                  <div className="slide-up s3 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Full Name
                    </label>
                    <div className={fieldCls('name', false)}>
                      <User className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedField === 'name' ? 'text-blue-500' : 'text-slate-300'}`} />
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none rounded-xl"
                        {...register('name', { required: 'Full name is required' })}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </div>
                    {errors.name && <p className="text-xs text-red-500 font-medium pl-1">{errors.name.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="slide-up s4 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Email Address
                    </label>
                    <div className={fieldCls('email', !!errors.email)}>
                      <Mail className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedField === 'email' ? 'text-blue-500' : 'text-slate-300'}`} />
                      <input
                        type="email"
                        placeholder="you@example.com"
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

                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Academic Information</p>
                    <select required value={academicSelection.department} onChange={(event) => setAcademicSelection({ department: event.target.value, semester: '', divisionId: '' })} className="w-full rounded-xl border-2 border-blue-100 px-3 py-3 text-sm text-slate-700"><option value="">Select Department / Branch</option>{academicData.departments.map((department) => <option key={department._id} value={department._id}>{department.department_name || department.short_name}</option>)}</select>
                    <select required disabled={!academicSelection.department} value={academicSelection.semester} onChange={(event) => setAcademicSelection({ ...academicSelection, semester: event.target.value, divisionId: '' })} className="w-full rounded-xl border-2 border-blue-100 px-3 py-3 text-sm text-slate-700 disabled:bg-slate-50"><option value="">Select Semester</option>{semesters.map((semester) => <option key={semester._id} value={semester._id}>Semester {semester.semester_number}{semester.academic_year ? ` (${semester.academic_year})` : ''}</option>)}</select>
                    <select required disabled={!academicSelection.semester} value={academicSelection.divisionId} onChange={(event) => setAcademicSelection({ ...academicSelection, divisionId: event.target.value })} className="w-full rounded-xl border-2 border-blue-100 px-3 py-3 text-sm text-slate-700 disabled:bg-slate-50"><option value="">Select Division</option>{divisions.map((division) => <option key={division._id} value={division._id}>{division.division_name}</option>)}</select>
                  </div>

                  {/* Password */}
                  <div className="slide-up s5 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Password
                    </label>
                    <div className={fieldCls('password', !!errors.password)}>
                      <Lock className={`absolute left-3.5 w-4 h-4 transition-colors ${focusedField === 'password' ? 'text-blue-500' : 'text-slate-300'}`} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        className="w-full pl-10 pr-12 py-3 bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none rounded-xl"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: { value: 6, message: 'At least 6 characters' }
                        })}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 text-xs font-semibold text-slate-300 hover:text-blue-500 transition-colors select-none bg-transparent border-0 cursor-pointer"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-500 font-medium pl-1">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="slide-up s6 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] cursor-pointer"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                      ) : (
                        <>
                          Create Account{' '}
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p className="text-center text-sm text-slate-500">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline underline-offset-2 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            )}

            {/* ── OTP Verify Step ── */}
            {step === 'verify' && (
              <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/60 border border-blue-100 p-8 space-y-6 slide-up s1">
                {/* Success state */}
                {verified ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center fade-in">
                    <div className="pop-in w-20 h-20 rounded-full bg-green-100 border-4 border-green-300 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-800">Verified! 🎉</h2>
                      <p className="text-sm text-slate-500 mt-1">Redirecting you to login…</p>
                    </div>
                    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-blue-500 rounded-full w-full" style={{ transition: 'width 1.8s linear' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center mx-auto shadow-sm">
                        <ShieldCheck className="w-8 h-8 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-extrabold text-slate-800">Check your inbox</h2>
                      <p className="text-sm text-slate-500">
                        We sent a 6-digit code to{' '}
                        <span className="font-semibold text-blue-600">{pendingEmail}</span>
                      </p>
                    </div>

                    {/* Alerts */}
                    {error && (
                      <div className="fade-in flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <span className="text-red-400 mt-0.5">⚠</span>
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                      </div>
                    )}
                    {message && !error && (
                      <div className="fade-in flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <p className="text-sm text-green-700 font-medium">{message}</p>
                      </div>
                    )}

                    {/* OTP boxes */}
                    <form onSubmit={handleSubmitOtp(onVerifyOtp)} className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 text-center">
                          Enter 6-Digit Verification Code
                        </label>
                        <div className="flex gap-3 justify-center">
                          {otpValues.map((val, i) => (
                            <input
                              key={i}
                              id={`otp-${i}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={1}
                              value={val}
                              onChange={e => handleOtpChange(i, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(i, e)}
                              onPaste={handleOtpPaste}
                              onFocus={() => setFocusedField(`otp-${i}`)}
                              onBlur={() => setFocusedField(null)}
                              className={`
                                w-12 h-12
                                text-center
                                text-lg
                                font-bold
                                rounded-xl
                                border-2
                                transition-all
                                duration-200
                                bg-white
                                focus:outline-none
                                ${focusedField === `otp-${i}` ? 'border-blue-500 shadow-md shadow-blue-100 scale-105' : val ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-blue-200 text-slate-700 hover:border-blue-400'}
                              `}
                            />
                          ))}
                        </div>
                        {/* hidden bound field */}
                        <input
                          type="hidden"
                          {...registerOtp('otp', {
                            required: 'OTP is required',
                            minLength: { value: 6, message: 'Enter all 6 digits' }
                          })}
                        />
                        {otpErrors.otp && (
                          <p className="text-xs text-red-500 font-medium text-center mt-2">{otpErrors.otp.message}</p>
                        )}
                      </div>

                      {/* Verify button */}
                      <button
                        type="submit"
                        disabled={loading || otpValues.join('').length < 6}
                        className="group w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-200 active:scale-[0.98] cursor-pointer"
                      >
                        {loading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                        ) : (
                          <>
                            Verify & Complete Registration{' '}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </button>

                      {/* Resend */}
                      <button
                        type="button"
                        onClick={resendOtp}
                        disabled={resendingOtp || resendCooldown > 0}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 text-blue-600 text-sm font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                      >
                        <RefreshCw className={`w-4 h-4 ${resendingOtp ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0
                          ? `Resend code in 00:${resendCooldown < 10 ? '0' : ''}${resendCooldown}`
                          : (resendingOtp ? 'Sending…' : 'Resend Code')}
                      </button>
                    </form>

                    <p className="text-center text-xs text-slate-400">
                      Wrong email?{' '}
                      <button
                        onClick={() => {
                          setStep('register');
                          setError('');
                          setMessage('');
                          setOtpValues(['', '', '', '', '', '']);
                        }}
                        className="text-blue-500 font-semibold hover:text-blue-700 underline underline-offset-2 bg-transparent border-0 cursor-pointer"
                      >
                        Go back
                      </button>
                    </p>
                  </>
                )}
              </div>
            )}

            <p className="text-center text-xs text-slate-400">
              Secured access · Smart Timetable System
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
