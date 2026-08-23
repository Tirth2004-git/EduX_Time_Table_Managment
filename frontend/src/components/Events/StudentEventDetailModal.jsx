import { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Mail,
  Phone,
  User,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import eventApi from '@/services/api/eventApi';
import { loadRazorpayScript } from '@/utils/loadRazorpay';

export default function StudentEventDetailModal({
  isOpen,
  onClose,
  event,
  onRegistrationSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  if (!isOpen || !event) return null;

  const org = event.organization || {};
  const isRegistered = event.isRegistered || Boolean(event.userRegistration);
  const isPaid = event.isPaid && event.registrationFee > 0;
  const isFull = event.isFull;
  const isPastDeadline = event.isPastDeadline;

  const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const deadlineStr = new Date(event.registrationDeadline).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleFreeRegistration = async () => {
    setLoading(true);
    setError('');
    try {
      await eventApi.registerFreeEvent(event._id || event.id);
      setSuccessReceipt({
        eventTitle: event.title,
        amount: 0,
        isFree: true,
        date: new Date().toLocaleDateString('en-IN'),
      });
      onRegistrationSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaidCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create order on backend
      const orderRes = await eventApi.createPaymentOrder(event._id || event.id);
      const orderData = orderRes.data;

      // 2. Load Razorpay Checkout.js
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Razorpay Checkout failed to load. Please check your internet connection.');
      }

      // 3. Open Razorpay modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'EduX Campus Events',
        description: `Registration for ${event.title}`,
        image: org.logoUrl || undefined,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.student?.name || '',
          email: orderData.student?.email || '',
        },
        theme: {
          color: '#4F46E5',
        },
        handler: async (response) => {
          setLoading(true);
          try {
            // 4. Verify signature on backend
            const verifyRes = await eventApi.verifyPayment(event._id || event.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccessReceipt({
              eventTitle: event.title,
              amount: orderData.amountInRupees,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              isFree: false,
              date: new Date().toLocaleDateString('en-IN'),
            });
            onRegistrationSuccess();
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.error || 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(`Payment failed: ${response.error?.description || 'Transaction unsuccessful'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Unable to initiate payment');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8">
        {/* Banner Header */}
        <div className="relative h-48 sm:h-56 bg-slate-900 overflow-hidden shrink-0">
          {event.bannerUrl ? (
            <img
              src={event.bannerUrl}
              alt={event.title}
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-16 h-16 opacity-30" />
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors border-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Category & Fee Badges */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-xl bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-extrabold shadow-sm">
              {event.category}
            </span>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm ${
                isPaid
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isPaid ? `₹${event.registrationFee}` : 'Free Entry'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Success Dialog */}
          {successReceipt ? (
            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Registration Confirmed! 🎉</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are successfully registered for <span className="font-bold">{successReceipt.eventTitle}</span>.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-emerald-100 text-left text-xs space-y-2 max-w-sm mx-auto shadow-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-slate-900">
                    {successReceipt.isFree ? 'Free' : `₹${successReceipt.amount}`}
                  </span>
                </div>
                {successReceipt.paymentId && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Payment ID:</span>
                    <span className="font-mono text-slate-700">{successReceipt.paymentId}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-600">Active / Confirmed ✓</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer border-0"
              >
                Close & View My Events
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title & Organizer */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {org.logoUrl && (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-7 h-7 rounded-lg object-contain border border-slate-100 p-0.5 shrink-0"
                    />
                  )}
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                    {org.name || 'Campus Event'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {event.title}
                </h3>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{dateStr}</p>
                    <p className="text-[11px] text-slate-400">
                      {event.startTime} – {event.endTime}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{event.venue}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{event.mode} Session</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  About This Event
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>

              {/* Speaker Card */}
              {event.speakerName && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/70 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0">
                    {event.speakerPhotoUrl ? (
                      <img
                        src={event.speakerPhotoUrl}
                        alt={event.speakerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide block">
                      Featured Keynote Speaker
                    </span>
                    <p className="text-sm font-extrabold text-slate-900 leading-tight">
                      {event.speakerName}
                    </p>
                    {event.speakerDesignation && (
                      <p className="text-xs text-slate-500 mt-0.5">{event.speakerDesignation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Extra Details (Capacity, Deadline, Contact) */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Registration Deadline:</span>
                  <span className="font-bold text-slate-800">{deadlineStr}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">Seat Availability:</span>
                  <span className="font-bold text-slate-800">
                    {event.capacity
                      ? `${event.remainingSeats ?? (event.capacity - (event.registeredCount || 0))} seats left (${event.capacity} total)`
                      : 'Unlimited Open Seating'}
                  </span>
                </div>

                {event.contactEmail && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Questions / Support:</span>
                    <span className="font-semibold text-indigo-600">{event.contactEmail}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer / CTA */}
        {!successReceipt && (
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[11px] text-slate-400 block">Registration Fee</span>
              <span className="text-lg font-black text-slate-900">
                {isPaid ? `₹${event.registrationFee}` : 'Free'}
              </span>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors bg-white cursor-pointer"
              >
                Cancel
              </button>

              {isRegistered ? (
                <button
                  disabled
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-2 border-0 cursor-default"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Registered ✓
                </button>
              ) : isPastDeadline ? (
                <button
                  disabled
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold border-0 cursor-not-allowed"
                >
                  Registration Closed
                </button>
              ) : isFull ? (
                <button
                  disabled
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold border-0 cursor-not-allowed"
                >
                  Registration Full
                </button>
              ) : isPaid ? (
                <button
                  onClick={handlePaidCheckout}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Register & Pay ₹{event.registrationFee}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleFreeRegistration}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer border-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Registering…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Register Free Now
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
