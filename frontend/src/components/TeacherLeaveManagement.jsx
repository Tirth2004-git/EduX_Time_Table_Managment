import { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, UserCheck, RefreshCw, Clock, Check, X, Eye } from 'lucide-react';
import leaveApi from '@/services/api/leaveApi';
import teacherApi from '@/services/api/teacherApi';
import { showToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

export default function TeacherLeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [impactData, setImpactData] = useState(null);
  const [reviewComments, setReviewComments] = useState('');

  const [formData, setFormData] = useState({
    teacherId: '',
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: 'multiple_day',
  });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await leaveApi.list();
      setLeaves(response.data.leaves || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load leaves', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await teacherApi.list();
      setTeachers(response.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load teachers', 'error');
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchTeachers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { teacherId, startDate, endDate, reason } = formData;
    if (!teacherId || !startDate || !endDate) {
      showToast('Please select teacher and dates', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await leaveApi.create(formData);
      showToast('Leave submitted. Admin notified.', 'success');
      setFormData({ teacherId: '', startDate: '', endDate: '', reason: '', leaveType: 'multiple_day' });
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit leave', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this leave record?')) return;
    setActionLoading(true);
    try {
      await leaveApi.delete(id);
      showToast('Leave deleted', 'success');
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const loadImpact = async (id) => {
    try {
      const res = await leaveApi.getImpact(id);
      setImpactData(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load impact', 'error');
    }
  };

  const handleReview = async (id, status) => {
    setActionLoading(true);
    try {
      const res = await leaveApi.review(id, { status, comments: reviewComments });
      showToast(res.data.message || `Leave ${status.toLowerCase()}`, 'success');
      setImpactData(null);
      setReviewComments('');
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.error || 'Review failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const statusBadge = (status) => {
    const colors = {
      Pending: 'bg-amber-50 text-amber-700 border-amber-100',
      Approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      Rejected: 'bg-red-50 text-red-700 border-red-100',
      Cancelled: 'bg-slate-50 text-slate-600 border-slate-100',
    };
    return (
      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${colors[status] || colors.Pending}`}>
        {status}
      </span>
    );
  };

  const cardCls = 'bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden';
  const cardHeaderCls = 'px-6 py-5 border-b border-slate-100 flex items-center gap-3';
  const inputCls =
    'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 font-sans">
      {impactData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Leave Impact Preview</h3>
            <p className="text-sm text-slate-600">
              {impactData.leave?.teacherId?.faculty_name} ·{' '}
              {formatDate(impactData.leave?.startDate)} – {formatDate(impactData.leave?.endDate)}
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-indigo-50">
                <div className="text-2xl font-black text-indigo-700">{impactData.impact?.sessionCount || 0}</div>
                <div className="text-xs text-slate-500">Sessions</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50">
                <div className="text-2xl font-black text-amber-700">{impactData.impact?.subjects?.length || 0}</div>
                <div className="text-xs text-slate-500">Subjects</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <div className="text-2xl font-black text-emerald-700">{impactData.impact?.divisions?.length || 0}</div>
                <div className="text-xs text-slate-500">Divisions</div>
              </div>
            </div>
            {impactData.sessions?.length > 0 && (
              <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
                {impactData.sessions.map((s) => (
                  <li key={s._id} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    {new Date(s.date).toLocaleDateString()} · {s.timeSlot} · {s.subjectId?.subject_name} · Div{' '}
                    {s.division}
                  </li>
                ))}
              </ul>
            )}
            <textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="Admin comments (optional)"
              className={`${inputCls} h-20 resize-none`}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setImpactData(null)} className="rounded-xl cursor-pointer">
                Close
              </Button>
              <Button
                onClick={() => handleReview(impactData.leave._id, 'Rejected')}
                disabled={actionLoading}
                className="rounded-xl bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button
                onClick={() => handleReview(impactData.leave._id, 'Approved')}
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                <Check className="w-4 h-4 mr-1" /> Approve & Generate Substitutes
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${cardCls} lg:col-span-1 h-fit`}>
          <div className={cardHeaderCls}>
            <Calendar className="w-4 h-4 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold">Record Faculty Leave</h2>
              <p className="text-xs text-slate-400">Triggers unified leave workflow</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <select
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              className={inputCls}
              required
            >
              <option value="">Choose teacher…</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.faculty_name} ({t.department})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={inputCls} required />
              <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className={inputCls} required />
            </div>
            <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={`${inputCls} h-20 resize-none`} placeholder="Reason" />
            <button type="submit" disabled={actionLoading} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold border-0 cursor-pointer">
              {actionLoading ? 'Submitting…' : 'Submit Leave'}
            </button>
          </form>
        </div>

        <div className={`${cardCls} lg:col-span-2`}>
          <div className={cardHeaderCls}>
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <div>
              <h2 className="text-sm font-bold">Leave Queue</h2>
              <p className="text-xs text-slate-400">Review → Approve → Auto substitute generation</p>
            </div>
          </div>
          {loading ? (
            <div className="py-16 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
          ) : leaves.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No leave requests.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase">
                  <th className="px-5 py-3 text-left">Faculty</th>
                  <th className="px-5 py-3 text-left">Dates</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Impact</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave._id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-bold">{leave.teacherId?.faculty_name}</td>
                    <td className="px-5 py-3 text-xs">
                      {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                    </td>
                    <td className="px-5 py-3">{statusBadge(leave.status)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {leave.impactSummary?.sessionCount ?? '—'} sessions
                    </td>
                    <td className="px-5 py-3 text-right space-x-1">
                      {leave.status === 'Pending' && (
                        <button onClick={() => loadImpact(leave._id)} className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 border-0 cursor-pointer bg-transparent" title="Review">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(leave._id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 border-0 cursor-pointer bg-transparent">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
