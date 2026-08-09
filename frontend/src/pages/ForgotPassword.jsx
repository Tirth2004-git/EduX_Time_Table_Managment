import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, ArrowRight, Loader2, Calendar, CheckCircle } from 'lucide-react';
import authApi from '../services/api/authApi';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await authApi.forgotPassword(data.email);
      setSuccess(result.message || 'If that email is registered, we have sent a reset password link.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
      `}</style>

      <div className="min-h-screen flex font-sans overflow-hidden bg-slate-50">
        {/* ── Left Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col items-center justify-center p-12 overflow-hidden">
          <div className="blob absolute -top-20 -left-20 w-72 h-72 bg-white/10" />
          <div className="blob absolute -bottom-16 -right-16 w-64 h-64 bg-blue-400/20" style={{ animationDelay: '4s' }} />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
          />

          <div className="relative z-10 text-center text-white max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold mb-3 leading-tight">
              Password Recovery
            </h1>
            <p className="text-blue-100 text-base leading-relaxed">
              Retrieve access to your scheduling dashboard securely.
            </p>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 lg:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full opacity-30 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-100 rounded-full opacity-30 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative w-full max-w-md space-y-8">
            <div className="lg:hidden flex flex-col items-center slide-up stagger-1">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 mb-3">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Smart Timetable</h2>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/60 border border-blue-100 p-8 space-y-6 slide-up stagger-2">
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold text-slate-800">Forgot password?</h2>
                <p className="text-sm text-slate-500">Enter your email address to request a reset link</p>
              </div>

              {error && (
                <div className="fade-in flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-red-400 text-base mt-0.5">⚠</span>
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {success ? (
                <div className="space-y-6 fade-in text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-600 mb-4 animate-scale-in">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Link Sent!</h3>
                  <p className="text-sm text-slate-600 px-2 leading-relaxed">
                    {success}
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 cursor-pointer"
                    >
                      Back to Sign In
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                        placeholder="your-email@example.com"
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

                  <div className="slide-up stagger-4 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-[0.98] cursor-pointer"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending link…</>
                      ) : (
                        <>
                          Send Reset Link
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {!success && (
                <p className="text-center text-sm text-slate-500">
                  Remember your password?{' '}
                  <Link
                    to="/login"
                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline underline-offset-2 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </div>

            <p className="text-center text-xs text-slate-400">
              Secured recovery · Smart Timetable System
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
