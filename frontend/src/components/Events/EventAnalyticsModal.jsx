import { useState, useEffect } from 'react';
import { X, BarChart3, Eye, Users, IndianRupee, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import eventApi from '@/services/api/eventApi';

export default function EventAnalyticsModal({ isOpen, onClose, eventId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && eventId) {
      fetchAnalytics();
    }
  }, [isOpen, eventId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventApi.getEventAnalytics(eventId);
      setAnalytics(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load event analytics');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const event = analytics?.event || {};
  const stats = analytics?.stats || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                {event.title || 'Event Analytics'}
              </h3>
              <p className="text-xs text-slate-500">Live audience metrics & revenue statistics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Compiling analytics...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm font-semibold text-red-600 bg-red-50 rounded-2xl">
              {error}
            </div>
          ) : (
            <>
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between text-blue-600">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Page Views</span>
                    <Eye className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-blue-950">{stats.views || 0}</p>
                  <p className="text-[10px] text-blue-500 font-semibold">Student impressions</p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                  <div className="flex items-center justify-between text-indigo-600">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Registered</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-indigo-950">{stats.totalRegistrations || 0}</p>
                  <p className="text-[10px] text-indigo-500 font-semibold">Confirmed attendees</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Revenue</span>
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-emerald-950">₹{stats.totalRevenue || 0}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">
                    {stats.paidRegistrations || 0} paid ticket(s)
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <div className="flex items-center justify-between text-purple-600">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Capacity Fill</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-black text-purple-950">
                    {stats.occupancyRate !== null ? `${stats.occupancyRate}%` : '∞'}
                  </p>
                  <p className="text-[10px] text-purple-500 font-semibold">
                    {event.capacity ? `${stats.totalRegistrations}/${event.capacity}` : 'Unlimited'}
                  </p>
                </div>
              </div>

              {/* Capacity Progress */}
              {event.capacity > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Venue Capacity Occupancy</span>
                    <span>
                      {stats.totalRegistrations} / {event.capacity} seats ({stats.occupancyRate}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, stats.occupancyRate || 0)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registration Breakdown</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Paid Registrations:</span>
                      <span className="font-bold text-slate-900">{stats.paidRegistrations || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">Free Registrations:</span>
                      <span className="font-bold text-slate-900">{stats.freeRegistrations || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">Cancelled / Withdrawn:</span>
                      <span className="font-bold text-slate-500">{stats.cancelledRegistrations || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Payment Metrics (Razorpay)</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Successful Transactions:
                      </span>
                      <span className="font-bold text-emerald-700">{stats.successfulPayments || 0}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Failed Attempts:
                      </span>
                      <span className="font-bold text-red-600">{stats.failedPayments || 0}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-600">Registration Fee:</span>
                      <span className="font-bold text-slate-900">
                        {event.isPaid ? `₹${event.registrationFee}` : 'Free'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer border-0"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
