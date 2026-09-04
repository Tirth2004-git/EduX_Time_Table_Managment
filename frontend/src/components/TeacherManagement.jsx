import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit, Trash2, X, UserCheck, Users, Clock, BookOpen, Search, AlertCircle, Upload, RefreshCw } from 'lucide-react';
import teacherApi from '@/services/api/teacherApi';
import subjectApi from '@/services/api/subjectApi';

// In-memory module cache to avoid blank flash on tab switching
let _cachedTeachers = null;

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState(() => _cachedTeachers || []);
  const [loading, setLoading] = useState(() => !_cachedTeachers);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    teacherID: '',
    faculty_name: '',
    department: '',
    teaching_hours: '',
    teacher_number: '',
    classroom: '',
    allowedDivisions: [],
    assignedSubjects: [],
    username: '',
    email: '',
    password: '',
  });
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectData, setNewSubjectData] = useState({
    subject_name: '',
    subject_code: '',
    semester: '',
    requiredPeriods: '4',
    type: 'theory'
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);

  const fetchTeachers = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setFetchError('');

    try {
      const response = await teacherApi.list();
      const list = response.data?.data || response.data || [];
      setTeachers(list);
      _cachedTeachers = list;
    } catch (err) {
      console.error('[Teachers API Error]', err);
      let errMsg = 'Unable to load teacher data. Please check your connection and try again.';
      if (err.response?.status === 401) {
        errMsg = 'Session expired or unauthorized. Please sign in again.';
      } else if (err.response?.status === 403) {
        errMsg = 'Access forbidden. Administrator permissions are required to view faculty roster.';
      } else if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errMsg = 'Request timed out. The backend server took too long to respond. Please retry.';
      } else if (err.message && !err.response) {
        errMsg = 'Unable to connect to the server. Please ensure the backend is running.';
      }
      setFetchError(errMsg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers(_cachedTeachers ? true : false);

    const handleSync = () => fetchTeachers(true);
    window.addEventListener('teacherUpdated', handleSync);
    window.addEventListener('timetableUpdated', handleSync);

    return () => {
      window.removeEventListener('teacherUpdated', handleSync);
      window.removeEventListener('timetableUpdated', handleSync);
    };
  }, [fetchTeachers]);

  const handleImportSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!importFile) return;
    setImportLoading(true);
    setImportError('');
    setImportResult(null);
    try {
      const data = new FormData();
      data.append('file', importFile);
      const response = await teacherApi.importCsv(data);
      setImportResult(response.data.data || { inserted: 0, updated: 0 });
      await fetchTeachers(true);
      window.dispatchEvent(new CustomEvent('teacherUpdated'));
      window.dispatchEvent(new CustomEvent('dashboardUpdate'));
    } catch (err) {
      setImportError(err.response?.data?.error || err.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  useEffect(() => {
    if (formData.department) {
      subjectApi.list({ department: formData.department }).then(res => {
        setAvailableSubjects(res.data.data || []);
      }).catch(console.error);
    } else {
      setAvailableSubjects([]);
    }
  }, [formData.department]);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newSubjectData,
        department: formData.department,
        requiredPeriods: parseInt(newSubjectData.requiredPeriods)
      };
      const res = await subjectApi.create(payload);
      const newSub = res.data.subject;
      setAvailableSubjects([...availableSubjects, newSub]);
      setFormData({ ...formData, assignedSubjects: [...formData.assignedSubjects, newSub._id] });
      setShowSubjectModal(false);
      setNewSubjectData({ subject_name: '', subject_code: '', semester: '', requiredPeriods: '4', type: 'theory' });
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create subject');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    try {
      const payload = { ...formData, teaching_hours: parseInt(formData.teaching_hours) };
      let savedTeacher;
      if (editingTeacher) {
        savedTeacher = (await teacherApi.update(editingTeacher._id, payload)).data.teacher;
      } else {
        savedTeacher = (await teacherApi.create(payload)).data.teacher;
      }
      
      if (savedTeacher && savedTeacher._id) {
        await teacherApi.assignSubjects(savedTeacher._id, formData.assignedSubjects);
      }
      
      await fetchTeachers(true);
      window.dispatchEvent(new CustomEvent('teacherUpdated'));
      window.dispatchEvent(new CustomEvent('dashboardUpdate'));
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacherID: teacher.teacherID,
      faculty_name: teacher.faculty_name,
      department: teacher.department,
      teaching_hours: teacher.teaching_hours.toString(),
      teacher_number: teacher.teacher_number,
      classroom: teacher.classroom,
      allowedDivisions: teacher.allowedDivisions || [],
      assignedSubjects: teacher.assignedSubjects ? teacher.assignedSubjects.map(s => s._id) : [],
      username: teacher.userAccount?.username || '',
      email: teacher.userAccount?.email || '',
      password: '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await teacherApi.delete(id);
      await fetchTeachers(true);
      window.dispatchEvent(new CustomEvent('teacherUpdated'));
      window.dispatchEvent(new CustomEvent('dashboardUpdate'));
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert(error.response?.data?.error || 'Failed to delete teacher');
    }
  };

  const resetForm = () => {
    setFormData({ teacherID: '', faculty_name: '', department: '', teaching_hours: '', teacher_number: '', classroom: '', allowedDivisions: [], assignedSubjects: [], username: '', email: '', password: '' });
    setEditingTeacher(null);
    setShowForm(false);
    setError('');
  };

  const filtered = teachers.filter(t =>
    t.faculty_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.department?.toLowerCase().includes(search.toLowerCase()) ||
    (t.assignedSubjects && t.assignedSubjects.some(s => s.subject_name?.toLowerCase().includes(search.toLowerCase()))) ||
    t.teacherID?.toLowerCase().includes(search.toLowerCase())
  );

  const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const totalHours = teachers.reduce((sum, teacher) => sum + safeNumber(teacher.max_hours_per_week ?? teacher.teaching_hours), 0);
  const assignedHours = teachers.reduce((sum, teacher) => sum + safeNumber(teacher.assignedHours), 0);
  const fullLoad = teachers.filter(t => t.remainingHours === 0).length;

  const inputCls =
    'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ' +
    'hover:border-slate-300 transition-colors duration-150 placeholder:text-slate-400';

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
            placeholder="Search faculty roster…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isRefreshing && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Syncing…
            </span>
          )}
          <button
            onClick={() => { setShowImportModal(true); setImportFile(null); setImportError(''); setImportResult(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-sm border-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Faculty
          </button>
        </div>
      </div>

      {/* ── Stats Cards Row ── */}
      {loading && teachers.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-14 bg-slate-200 rounded-md" />
                <div className="h-3 w-28 bg-slate-100 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : fetchError && teachers.length === 0 ? null : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Faculty', value: teachers.length, icon: <Users className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50/10 border-indigo-100/30' },
            { label: 'Total Hours Required', value: totalHours, icon: <Clock className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50/10 border-indigo-100/30' },
            { label: 'Assigned Hours', value: assignedHours, icon: <BookOpen className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50/10 border-indigo-100/30' },
            { label: 'Full Load Faculty', value: fullLoad, icon: <UserCheck className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50/10 border-indigo-100/30' },
          ].map(({ label, value, icon, bg }) => (
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
      )}

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className={cardCls}>
          <div className={cardHeaderCls}>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/20">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {editingTeacher ? 'Edit Faculty Member' : 'Add New Faculty Member'}
              </h2>
              <p className="text-xs text-slate-400">Specify details to configure workload</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Teacher ID</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. TCH-001"
                    value={formData.teacherID}
                    onChange={(e) => setFormData({ ...formData, teacherID: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Faculty Name</label>
                  <input
                    className={inputCls}
                    placeholder="Full name"
                    value={formData.faculty_name}
                    onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Computer Science"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Teaching Hours</label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    placeholder="e.g. 18"
                    value={formData.teaching_hours}
                    onChange={(e) => setFormData({ ...formData, teaching_hours: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Teacher Number</label>
                  <input
                    className={inputCls}
                    placeholder="Contact number"
                    value={formData.teacher_number}
                    onChange={(e) => setFormData({ ...formData, teacher_number: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2 xl:col-span-1">
                  <label className={labelCls}>Classroom</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Room 101"
                    value={formData.classroom}
                    onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                    required
                  />
                </div>
                
                <div className="sm:col-span-2 xl:col-span-3">
                  <label className={labelCls}>Assigned Subjects</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <select
                        className={inputCls}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !formData.assignedSubjects.includes(val)) {
                            setFormData({ ...formData, assignedSubjects: [...formData.assignedSubjects, val] });
                          }
                          e.target.value = '';
                        }}
                        disabled={!formData.department}
                        value=""
                      >
                        <option value="">{formData.department ? '+ Select Subject' : 'Enter department first to select subjects'}</option>
                        {availableSubjects.filter(s => !formData.assignedSubjects.includes(s._id)).map(s => (
                          <option key={s._id} value={s._id}>{s.subject_name} ({s.subject_code}) - Sem {s.semester}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowSubjectModal(true)}
                        disabled={!formData.department}
                        className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100/50 disabled:opacity-50 text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                      >
                        + Create Subject
                      </button>
                    </div>
                    {/* Chips */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.assignedSubjects.map(subId => {
                        const sub = availableSubjects.find(s => s._id === subId) || (editingTeacher?.assignedSubjects || []).find(s => s._id === subId);
                        if (!sub) return null;
                        return (
                          <span key={subId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs font-bold shadow-sm">
                            {sub.subject_name}
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, assignedSubjects: formData.assignedSubjects.filter(id => id !== subId) })}
                              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-indigo-200/50 transition-colors bg-transparent border-0 cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 xl:col-span-3">
                  <label className={labelCls}>Allowed Divisions</label>
                  <div className="flex gap-6 items-center h-[42px]">
                    {['A', 'B', 'C', 'D', 'E', 'F'].map((div) => (
                      <label key={div} className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allowedDivisions.includes(div)}
                          onChange={(e) => {
                            const newDivisions = e.target.checked
                              ? [...formData.allowedDivisions, div]
                              : formData.allowedDivisions.filter((d) => d !== div);
                            setFormData({ ...formData, allowedDivisions: newDivisions });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-200 focus:ring-indigo-500 cursor-pointer"
                        />
                        Division {div}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 xl:col-span-3 border-t border-slate-100 pt-5 mt-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Portal Login Access</span>
                    <span className="text-[10px] text-slate-400 font-semibold">(Configures teacher dashboard account login credentials)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Username</label>
                      <input
                        className={inputCls}
                        placeholder="e.g. drsharma"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required={!!formData.email || !!formData.password || !editingTeacher}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Email Address</label>
                      <input
                        type="email"
                        className={inputCls}
                        placeholder="e.g. sharma@university.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required={!!formData.username || !!formData.password || !editingTeacher}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Password {editingTeacher && <span className="text-[10px] text-slate-450 normal-case">(leave blank to keep)</span>}</label>
                      <input
                        type="password"
                        className={inputCls}
                        placeholder={editingTeacher ? "••••••••" : "Min 6 characters"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingTeacher}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm border-0 cursor-pointer"
                >
                  {formLoading ? 'Saving…' : editingTeacher ? 'Update Faculty' : 'Add Faculty'}
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

      {/* ── Teachers Table / Skeletons / Error / Empty State ── */}
      {loading && teachers.length === 0 ? (
        <div className={cardCls}>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <span className="text-xs font-bold text-slate-600">Loading faculty data…</span>
            </div>
            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-7 w-20 bg-indigo-50/80 rounded-lg" />
                  <div className="space-y-1.5 flex-1 max-w-xs">
                    <div className="h-4 w-36 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-28 bg-slate-100 rounded hidden md:block" />
                <div className="h-4 w-16 bg-slate-100 rounded hidden sm:block" />
                <div className="h-4 w-20 bg-slate-100 rounded hidden lg:block" />
                <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100" />
                  <div className="w-8 h-8 rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : fetchError && teachers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Unable to load teacher data</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
            {fetchError || 'Something went wrong while fetching faculty information. Please check your connection and try again.'}
          </p>
          <button
            onClick={() => fetchTeachers(false)}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-bold transition-all shadow-sm cursor-pointer border-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : (
        <div className={cardCls}>
          <div className="overflow-x-auto rounded-xl">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white">
                <Users className="w-12 h-12 mb-3 opacity-30 text-indigo-600" />
                <p className="text-sm font-bold text-slate-800">{search ? 'No faculty matches your query' : 'No faculty configured'}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {search ? 'Try adjusting your search criteria' : 'Configure teachers database to generate timetables'}
                </p>
                {!search ? (
                  <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100/50 text-xs font-bold transition-all cursor-pointer"
                  >
                    Add Your First Teacher
                  </button>
                ) : (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer border-0"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-900 text-white border-0">
                    {['ID', 'Name / Portal Access', 'Subject', 'Divisions', 'Total Hours', 'Assigned', 'Remaining Status', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap first:pl-6 last:pr-6">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((teacher, idx) => {
                    const weeklyLimit = safeNumber(teacher.max_hours_per_week ?? teacher.teaching_hours);
                    const pct = weeklyLimit > 0
                      ? Math.round((safeNumber(teacher.assignedHours) / weeklyLimit) * 100)
                      : 0;
                    const isFull = teacher.remainingHours === 0;
                    return (
                      <tr
                        key={teacher._id}
                        className={`border-t border-slate-100 transition-colors hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}
                      >
                        {/* ID */}
                        <td className="px-5 py-4 pl-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100/40 text-indigo-700 text-xs font-bold">
                            {teacher.teacherID}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-slate-800">{teacher.faculty_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{teacher.teacher_number}</p>
                            {teacher.userAccount ? (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-700">
                                🔑 {teacher.userAccount.username} · {teacher.userAccount.email}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-medium text-slate-400">
                                🚫 No Portal Login
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Subjects */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {teacher.assignedSubjects && teacher.assignedSubjects.length > 0 ? (
                              teacher.assignedSubjects.map(sub => (
                                <span key={sub._id} className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50/50 border border-indigo-100/50 text-indigo-600 text-[10px] font-bold">
                                  {sub.subject_name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold italic">No subjects</span>
                            )}
                          </div>
                        </td>

                        {/* Divisions */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold">
                            {teacher.allowedDivisions && teacher.allowedDivisions.length > 0 ? teacher.allowedDivisions.join(', ') : 'All'}
                          </span>
                        </td>

                        {/* Total Hours */}
                        <td className="px-5 py-4 text-slate-700 font-bold">{weeklyLimit}h</td>

                        {/* Assigned with progress */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700 font-bold w-6 text-xs">{teacher.assignedHours || 0}h</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-16 border border-slate-200/20">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">{pct}%</span>
                          </div>
                        </td>

                        {/* Remaining */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            isFull
                              ? 'bg-red-50 text-red-600 border border-red-100'
                              : teacher.remainingHours <= 3
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {isFull ? '● Full Load' : `${teacher.remainingHours}h left`}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 pr-6">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(teacher)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer bg-white"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(teacher._id)}
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

          {/* Footer info */}
          {filtered.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
              <p className="text-xs font-semibold text-slate-400">
                Showing <span className="text-slate-600 font-bold">{filtered.length}</span> of {teachers.length} faculty members
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-indigo-500 hover:text-indigo-700 font-bold underline cursor-pointer bg-transparent border-0">
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Import CSV Modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Import Faculty CSV</h2>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); setImportError(''); setImportResult(null); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {importError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600 font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                  <p>{importError}</p>
                </div>
              )}

              {importResult ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-emerald-800 text-xs uppercase tracking-wider">Import Completed!</h3>
                    <p className="text-xs text-emerald-600 mt-1">Faculty records have been processed successfully.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-extrabold text-slate-800">{importResult.inserted || 0}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Records Inserted</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                      <p className="text-2xl font-extrabold text-slate-800">{importResult.updated || 0}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Records Updated</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowImportModal(false); setImportResult(null); }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 text-white font-bold text-xs border-0 cursor-pointer shadow-sm"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-indigo-100 hover:border-indigo-300 rounded-xl p-6 transition-colors text-center relative group bg-indigo-50/5">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={importLoading}
                    />
                    <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-slate-700">
                      {importFile ? importFile.name : 'Click or drag CSV file here'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                      Format: teacherID, faculty_name, department, teaching_hours, allowedDivisions, teacher_number, classroom
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleImportSubmit}
                      disabled={!importFile || importLoading}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 text-white text-xs font-bold transition-all border-0 cursor-pointer"
                    >
                      {importLoading ? 'Processing CSV...' : 'Upload & Import'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowImportModal(false); setImportFile(null); setImportError(''); }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── Create Subject Modal ── */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Create New Subject</h2>
              </div>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors bg-transparent border-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className={labelCls}>Subject Name</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Artificial Intelligence"
                    value={newSubjectData._id}
                    onChange={(e) => setNewSubjectData({ ...newSubjectData, subject_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Subject Code</label>
                    <input
                      className={inputCls}
                      placeholder="e.g. IT701"
                      value={newSubjectData.subject_code}
                      onChange={(e) => setNewSubjectData({ ...newSubjectData, subject_code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Semester</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      className={inputCls}
                      placeholder="e.g. 7"
                      value={newSubjectData.semester}
                      onChange={(e) => setNewSubjectData({ ...newSubjectData, semester: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Periods/Week</label>
                    <input
                      type="number"
                      min="1"
                      className={inputCls}
                      value={newSubjectData.requiredPeriods}
                      onChange={(e) => setNewSubjectData({ ...newSubjectData, requiredPeriods: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Department</label>
                    <input
                      className={inputCls}
                      value={formData.department}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 text-white text-xs font-bold transition-all border-0 cursor-pointer"
                  >
                    Create Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubjectModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
