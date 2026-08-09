import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, BookOpen, Search, AlertCircle, ChevronRight, GraduationCap, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import subjectApi from '@/services/api/subjectApi';
import teacherApi from '@/services/api/teacherApi';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    program: '',
    semester: '',
    teacherIds: [],
    requiredPeriods: '',
  });
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('');

  const fetchSubjects = async () => {
    try {
      const response = await subjectApi.list();
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchTeachers = async (division) => {
    try {
      const response = await teacherApi.list(division ? { division } : {});
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchTeachers(selectedDivisionFilter);
  }, [selectedDivisionFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.program || !formData.semester) {
        setError('Program/department and semester are required');
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        requiredPeriods: parseInt(formData.requiredPeriods),
        semester: Number(formData.semester),
        teacherIds: formData.teacherIds,
      };

      if (editingSubject) {
        await subjectApi.update(editingSubject._id, payload);
      } else {
        await subjectApi.create(payload);
      }

      await fetchSubjects();
      resetForm();
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Operation failed');
      setLoading(false);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormData({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code,
      program: subject.program || subject.department || '',
      semester: subject.semester || '',
      teacherIds: subject.teacherIds?.map((teacher) => teacher._id || teacher) || (subject.teacherId?._id ? [subject.teacherId._id] : []),
      requiredPeriods: subject.requiredPeriods.toString(),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await subjectApi.delete(id);
      await fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert(error.response?.data?.error || 'Failed to delete subject');
    }
  };

  const resetForm = () => {
    setFormData({ subject_name: '', subject_code: '', program: '', semester: '', teacherIds: [], requiredPeriods: '' });
    setSelectedDivisionFilter('');
    setEditingSubject(null);
    setShowForm(false);
    setError('');
  };

  const filtered = subjects.filter(s =>
    s.subject_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.subject_code?.toLowerCase().includes(search.toLowerCase()) ||
    (s.assignedTeachers || []).some(t => (t.faculty_name || '').toLowerCase().includes(search.toLowerCase()))
  );

  // Stats
  const totalPeriods = subjects.reduce((s, sub) => s + sub.requiredPeriods, 0);
  const allottedPeriods = subjects.reduce((s, sub) => s + sub.allottedPeriods, 0);
  const fullyAllocated = subjects.filter(s => s.remainingPeriods === 0).length;
  const unassigned = subjects.filter(s => !s.assignedTeachers || s.assignedTeachers.length === 0).length;

  /* ── Shared style tokens ── */
  const inputCls =
    'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ' +
    'hover:border-slate-300 transition-colors duration-150 placeholder:text-slate-400';

  const selectCls =
    'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ' +
    'hover:border-slate-300 transition-colors duration-150 appearance-none cursor-pointer';

  const cardCls = 'bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden';
  const cardHeaderCls = 'px-6 py-5 border-b border-slate-100 flex items-center gap-3';
  const labelCls = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 font-sans">

      {/* ── Action Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Search subjects roster…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-sm border-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Subject
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Subjects', value: subjects.length, icon: <BookOpen className="w-5 h-5 text-indigo-600" /> },
          { label: 'Total Periods', value: totalPeriods, icon: <Clock className="w-5 h-5 text-indigo-600" /> },
          { label: 'Allotted Periods', value: allottedPeriods, icon: <BarChart3 className="w-5 h-5 text-indigo-600" /> },
          { label: 'Fully Allocated', value: fullyAllocated, icon: <CheckCircle2 className="w-5 h-5 text-indigo-600" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
              {icon}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className={cardCls}>
          <div className={cardHeaderCls}>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {editingSubject ? 'Edit Subject Details' : 'Add New Subject'}
              </h2>
              <p className="text-xs text-slate-400">Fill in subject details and assign a teacher</p>
            </div>
            <button
              onClick={resetForm}
              className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-600 font-semibold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Subject Name */}
                <div>
                  <label className={labelCls}>Subject Name</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Data Structures & Algorithms"
                    value={formData._id}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    required
                  />
                </div>

                {/* Subject Code */}
                <div>
                  <label className={labelCls}>Subject Code</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. CS301"
                    value={formData.subject_code}
                    onChange={(e) => setFormData({ ...formData, subject_code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                {/* Division Filter */}
                <div>
                  <label className={labelCls}>Program / Department</label>
                  <input className={inputCls} placeholder="e.g. Information Technology" value={formData.program} onChange={(e) => setFormData({ ...formData, program: e.target.value })} required />
                </div>
                <div>
                  <label className={labelCls}>Semester</label>
                  <input type="number" min="1" max="6" className={inputCls} placeholder="e.g. 6" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} required />
                </div>

                {/* Division Filter */}
                <div>
                  <label className={labelCls}>Filter Teachers by Division (Optional)</label>
                  <div className="relative">
                    <select
                      value={selectedDivisionFilter}
                      onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">All Divisions</option>
                      <option value="A">Division A</option>
                      <option value="B">Division B</option>
                      <option value="C">Division C</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Teacher */}
                <div>
                  <label className={labelCls}>Qualified Faculty (multiple allowed)</label>
                  <div className="relative">
                    <select
                      multiple
                      value={formData.teacherIds}
                      onChange={(e) => setFormData({ ...formData, teacherIds: Array.from(e.target.selectedOptions, (option) => option.value) })}
                      className={selectCls}
                    >
                      {teachers.map((teacher) => (
                        <option key={teacher._id} value={teacher._id}>
                          {teacher.faculty_name} · {teacher.teacherID} · {teacher.department}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Required Periods */}
                <div>
                  <label className={labelCls}>Required Periods</label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    placeholder="e.g. 4"
                    value={formData.requiredPeriods}
                    onChange={(e) => setFormData({ ...formData, requiredPeriods: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm border-0 cursor-pointer"
                >
                  {loading ? 'Saving…' : editingSubject ? 'Update Subject' : 'Create Subject'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Subjects Table ── */}
      <div className={cardCls}>
        <div className="overflow-x-auto rounded-xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white">
              <BookOpen className="w-12 h-12 mb-3 opacity-30 text-indigo-600" />
              <p className="text-sm font-bold text-slate-800">{search ? 'No subjects match your query' : 'No subjects added yet'}</p>
              <p className="text-xs text-slate-400 mt-1">Configure subjects curriculum to build timetables</p>
              {!search && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100/50 text-xs font-bold transition-all cursor-pointer"
                >
                  Add Your First Subject
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr className="bg-slate-900 text-white border-0">
                  {['Code', 'Subject Name', 'Assigned Teacher', 'Required', 'Allotted', 'Remaining Status', 'Progress', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((subject, idx) => {
                  const pct = subject.requiredPeriods > 0
                    ? Math.round((subject.allottedPeriods / subject.requiredPeriods) * 100)
                    : 0;
                  const isComplete = subject.remainingPeriods === 0;
                  const isLow = !isComplete && subject.remainingPeriods <= 2 && subject.remainingPeriods > 0;

                  return (
                    <tr
                      key={subject._id}
                      className={`border-t border-slate-100 transition-colors hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}
                    >
                      {/* Code */}
                      <td className="px-5 py-4 pl-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100/40 text-indigo-700 text-xs font-bold">
                          {subject.subject_code}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 leading-tight">{subject.subject_name}</p>
                      </td>

                      {/* Teacher */}
                      <td className="px-5 py-4">
                        {subject.assignedTeachers && subject.assignedTeachers.length > 0 ? (
                          <div className="space-y-2">
                            {subject.assignedTeachers.map((t, idx) => (
                              <div key={idx}>
                                <p className="text-slate-800 font-bold text-sm">{t.faculty_name || t.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{t.department?.short_name || t.department?.department_name || (typeof t.department === 'string' ? '' : '')}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 text-xs font-bold">
                            <AlertCircle size={14} />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Required */}
                      <td className="px-5 py-4">
                        <span className="text-slate-700 font-bold">{subject.requiredPeriods}</span>
                        <span className="text-slate-400 text-xs ml-1 font-semibold">periods</span>
                      </td>

                      {/* Allotted */}
                      <td className="px-5 py-4 text-slate-700 font-bold">{subject.allottedPeriods}</td>

                      {/* Remaining */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          isComplete
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : isLow
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                        }`}>
                          {isComplete ? '● Complete' : `${subject.remainingPeriods} left`}
                        </span>
                      </td>

                      {/* Progress bar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isComplete ? 'bg-emerald-500' : isLow ? 'bg-amber-400' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold w-8 text-right">{pct}%</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 pr-6">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEdit(subject)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer bg-white"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(subject._id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer bg-white"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-xs font-semibold text-slate-400">
              Showing <span className="text-slate-600 font-bold">{filtered.length}</span> of {subjects.length} subjects
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-bold underline cursor-pointer bg-transparent border-0"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
