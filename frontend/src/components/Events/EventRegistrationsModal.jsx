import { useState, useEffect } from 'react';
import {
  X,
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Loader2,
  Mail,
  Send,
  Ticket,
} from 'lucide-react';
import eventApi from '@/services/api/eventApi';

export default function EventRegistrationsModal({ isOpen, onClose, eventId, eventTitle }) {
  const [registrations, setRegistrations] = useState([]);
  const [eventDetails, setEventDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [emailStatusMessage, setEmailStatusMessage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && eventId) {
      fetchRegistrations();
    }
  }, [isOpen, eventId]);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await eventApi.getEventRegistrations(eventId);
      setRegistrations(res.data.data || []);
      setEventDetails(res.data.event || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (registrationId, studentEmail) => {
    setSendingEmailId(registrationId);
    setEmailStatusMessage(null);
    try {
      await eventApi.resendTicketEmail(eventId, registrationId);
      setEmailStatusMessage({
        type: 'success',
        text: `Ticket email resent to ${studentEmail}!`,
      });
      // Refresh registrations to reflect email status
      fetchRegistrations();
    } catch (err) {
      setEmailStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to resend ticket email.',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await eventApi.exportRegistrationsCSV(eventId);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registrations_${(eventTitle || 'event').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV: ' + (err.response?.data?.error || err.message));
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const filteredRegistrations = registrations.filter((r) => {
    const student = r.student || {};
    const nameMatch = (student.name || '').toLowerCase().includes(search.toLowerCase());
    const emailMatch = (student.email || '').toLowerCase().includes(search.toLowerCase());
    const studentIdMatch = (student.student_id || '').toLowerCase().includes(search.toLowerCase());
    const ticketMatch = (r.ticketId || '').toLowerCase().includes(search.toLowerCase());
    const matchesSearch = nameMatch || emailMatch || studentIdMatch || ticketMatch;

    if (!matchesSearch) return false;

    if (filterPayment !== 'all') {
      if (r.paymentStatus !== filterPayment) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8 max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                Registered Students · {eventTitle || 'Event'}
              </h3>
              <p className="text-xs text-slate-500">
                Total Registrations: <span className="font-bold text-indigo-600">{registrations.length}</span>
                {eventDetails?.capacity ? ` / ${eventDetails.capacity} Capacity` : ' (Unlimited seats)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting || registrations.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors border-0 cursor-pointer"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast/Message */}
        {emailStatusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between ${
              emailStatusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                : 'bg-red-50 text-red-800 border-b border-red-100'
            }`}
          >
            <span>{emailStatusMessage.text}</span>
            <button
              onClick={() => setEmailStatusMessage(null)}
              className="text-xs font-bold underline bg-transparent border-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar Filter */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, email, ticket ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Payment Status:</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="free">Free</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading registrations...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm font-semibold text-red-600 bg-red-50 rounded-2xl">
              {error}
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No student registrations found</p>
              <p className="text-xs text-slate-400">
                {search ? 'Try adjusting your search filter.' : 'Students will appear here once they register.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-100">
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Ticket ID</th>
                    <th className="p-3.5">Department & Semester</th>
                    <th className="p-3.5">Division</th>
                    <th className="p-3.5">Registered On</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Email Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRegistrations.map((reg) => {
                    const student = reg.student || {};
                    const dept = student.department_id?.short_name || student.department_id?.department_name || '—';
                    const sem = student.semester_id?.semester_number ? `Sem ${student.semester_id.semester_number}` : '—';
                    const div = student.division_id?.division_name || '—';
                    const payment = reg.payment || {};
                    const isSending = sendingEmailId === reg._id;

                    return (
                      <tr key={reg._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800">{student.name || 'Unknown Student'}</div>
                          <div className="text-[11px] text-slate-400">{student.email}</div>
                          {student.student_id && (
                            <div className="text-[10px] text-slate-400 font-mono">ID: {student.student_id}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {reg.ticketId ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 text-[11px]">
                              <Ticket className="w-3 h-3 text-indigo-500" />
                              {reg.ticketId}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700">{dept}</span>
                          <span className="text-slate-400 block">{sem}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                            Div {div}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {new Date(reg.registeredAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3.5">
                          {reg.paymentStatus === 'paid' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3" /> Paid ₹{payment.amount || reg.amountPaid || eventDetails?.registrationFee}
                              </span>
                              {payment.razorpayPaymentId && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {payment.razorpayPaymentId}
                                </p>
                              )}
                            </div>
                          ) : reg.paymentStatus === 'free' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                              Free Entry
                            </span>
                          ) : reg.paymentStatus === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-bold text-[10px]">
                              <AlertCircle className="w-3 h-3" /> {reg.paymentStatus}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              reg.emailStatus === 'sent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : reg.emailStatus === 'failed'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {reg.emailStatus || 'pending'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleResendEmail(reg._id, student.email)}
                            disabled={isSending}
                            title="Resend confirmation ticket email"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-100 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isSending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Mail className="w-3 h-3" />
                            )}
                            Resend Ticket
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredRegistrations.length} student(s)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer border-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
