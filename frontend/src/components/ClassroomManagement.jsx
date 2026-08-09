import { useEffect, useState } from 'react';
import {
  Plus, Edit, Trash2, X, Building2, Search,
  AlertCircle, ChevronRight, LayoutGrid, GraduationCap, DoorOpen, CalendarDays,
} from 'lucide-react';
import { useMasterData } from '@/hooks/useMasterData';
import classroomApi from '@/services/api/classroomApi';
import { CLASS_LEVELS, ACADEMIC_YEARS } from '../constants/classroomConstants';

/* ── Program short labels for badge display ── */
const PROGRAM_SHORT = {
  'Information Technology': 'IT',
  'Cyber Security': 'CS',
  'Computer Science & Technology': 'CST',
  'Computer Science Engineering': 'CSE',
  'Computer Engineering': 'CE',
  'Artificial Intelligence & Data Science': 'AIDS',
};

/* ── Program badge colors (cycling) ── */
const PROGRAM_COLORS = [
  'bg-indigo-50 text-indigo-700 border border-indigo-100/40',
  'bg-violet-50 text-violet-700 border border-violet-100/40',
  'bg-sky-50 text-sky-700 border border-sky-100/40',
  'bg-emerald-50 text-emerald-700 border border-emerald-100/40',
  'bg-amber-50 text-amber-700 border border-amber-100/40',
];

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    program: '', className: '', semester: '', division: '', roomNumber: '', year: '2026-27',
  });

  const { departments: PROGRAMS, semesters: SEMESTERS, divisions: DIVISIONS } = useMasterData(formData.program, formData.semester);

  // Automatically determine Class Level from Semester
  useEffect(() => {
    if (formData.semester) {
      const semObj = SEMESTERS.find(s => s._id === formData.semester);
      if (semObj) {
        const num = semObj.semester_number;
        const level = num <= 2 ? 'FY' : num <= 4 ? 'SY' : 'TY';
        setFormData(prev => ({ ...prev, className: level }));
      }
    }
  }, [formData.semester, SEMESTERS]);

  const fetchClassrooms = async () => {
    try {
      const response = await classroomApi.list();
      setClassrooms(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        semester: formData.semester,
        roomNumber: formData.roomNumber || undefined,
        year: formData.year || undefined,
      };

      if (editingClassroom) {
        await classroomApi.update(editingClassroom._id, payload);
      } else {
        await classroomApi.create(payload);
      }

      await fetchClassrooms();
      resetForm();
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Operation failed');
      setLoading(false);
    }
  };

  const handleEdit = (classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      program: classroom.department_id || '',
      className: classroom.className || '',
      semester: classroom.semester_id || '',
      division: classroom.division_id || '',
      roomNumber: classroom.roomNumber || '',
      year: classroom.year || '2026-27',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this classroom?')) return;
    try {
      await classroomApi.delete(id);
      await fetchClassrooms();
    } catch (error) {
      console.error('Error deleting classroom:', error);
      alert(error.response?.data?.error || 'Failed to delete classroom');
    }
  };

  const resetForm = () => {
    setFormData({ program: '', className: '', semester: '', division: '', roomNumber: '', year: '2026-27' });
    setEditingClassroom(null);
    setShowForm(false);
    setError('');
  };

  const filtered = classrooms.filter(c =>
    c.program?.toLowerCase().includes(search.toLowerCase()) ||
    c.className?.toLowerCase().includes(search.toLowerCase()) ||
    c.division?.toLowerCase().includes(search.toLowerCase()) ||
    (c.roomNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.year || '').toLowerCase().includes(search.toLowerCase())
  );

  /* ── Stats ── */
  const uniquePrograms = new Set(classrooms.map(c => c.program)).size;
  const withRoom = classrooms.filter(c => c.roomNumber).length;
  const divisions = new Set(classrooms.map(c => `${c.program}-${c.className}-${c.semester}-${c.division}`)).size;

  /* ── Style tokens ── */
  const selectCls =
    'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ' +
    'hover:border-slate-300 transition-colors duration-150 appearance-none cursor-pointer ' +
    'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';

  const inputCls =
    'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ' +
    'hover:border-slate-300 transition-colors duration-150 placeholder:text-slate-400';

  const cardCls = 'bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden';
  const cardHeaderCls = 'px-6 py-5 border-b border-slate-100 flex items-center gap-3';
  const labelCls = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5';

  const getProgramColor = (programName) => {
    let hash = 0;
    if (programName) {
      for (let i = 0; i < programName.length; i++) hash += programName.charCodeAt(i);
    }
    return PROGRAM_COLORS[hash % PROGRAM_COLORS.length];
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 font-sans">

      {/* ── Action Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Search classrooms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 text-white text-xs font-bold transition-all shadow-sm border-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Classroom
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Classrooms', value: classrooms.length, icon: <Building2 className="w-5 h-5 text-indigo-600" /> },
          { label: 'Programs', value: uniquePrograms, icon: <GraduationCap className="w-5 h-5 text-indigo-600" /> },
          { label: 'Divisions', value: divisions, icon: <LayoutGrid className="w-5 h-5 text-indigo-600" /> },
          { label: 'With Room No.', value: withRoom, icon: <DoorOpen className="w-5 h-5 text-indigo-600" /> },
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
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
              </h2>
              <p className="text-xs text-slate-400">Fill in the classroom and program details</p>
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
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Required fields */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Required Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* Program */}
                  <div className="xl:col-span-2">
                    <label className={labelCls}>Program / Department</label>
                    <div className="relative">
                      <select
                        value={formData.program}
                        onChange={(e) => setFormData({ ...formData, program: e.target.value, semester: '', division: '', className: '' })}
                        className={selectCls}
                        required
                      >
                        <option value="">Select program…</option>
                        {(PROGRAMS || []).map(p => <option key={p._id} value={p._id}>{p.department_name}</option>)}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-blue-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Class */}
                  <div>
                    <label className={labelCls}>Class Level</label>
                    <div className="relative">
                      <select
                        value={formData.className}
                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                        className={selectCls}
                        required
                      >
                        <option value="">Select class…</option>
                        {(CLASS_LEVELS || []).map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-blue-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className={labelCls}>Semester</label>
                    <div className="relative">
                      <select
                        value={formData.semester}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value, division: '' })}
                        className={selectCls}
                        required
                        disabled={!formData.program}
                      >
                        <option value="">Select semester…</option>
                        {(SEMESTERS || []).map(s => <option key={s._id} value={s._id}>Semester {s.semester_number}</option>)}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-blue-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Division */}
                  <div>
                    <label className={labelCls}>Division</label>
                    <div className="relative">
                      <select
                        value={formData.division}
                        onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                        className={selectCls}
                        required
                        disabled={!formData.semester}
                      >
                        <option value="">Select division…</option>
                        {(DIVISIONS || []).map(d => <option key={d._id} value={d._id}>Division {d.division_name}</option>)}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-blue-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional fields */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Optional Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Room Number <span className="normal-case text-slate-300 font-normal">(optional)</span></label>
                    <input
                      className={inputCls}
                      placeholder="e.g. 301, Lab-A"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Academic Year <span className="normal-case text-slate-300 font-normal">(optional)</span></label>
                    <div className="relative">
                      <select
                        className={selectCls}
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      >
                        <option value="">Select year…</option>
                        {(ACADEMIC_YEARS || []).map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-blue-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white text-sm font-bold transition-all shadow-md shadow-blue-200 cursor-pointer border-0"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Saving…</>
                  ) : editingClassroom ? 'Update Classroom' : 'Create Classroom'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer bg-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Classrooms Table ── */}
      <div className={cardCls}>
        <div className={cardHeaderCls}>
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">All Classrooms</h2>
            <p className="text-xs text-slate-400">
              {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''} configured
            </p>
          </div>

          {/* Search */}
          <div className="ml-auto relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm bg-blue-50 border border-blue-100 rounded-xl placeholder:text-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
              placeholder="Search classrooms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Building2 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {search ? 'No classrooms match your search' : 'No classrooms configured yet'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 cursor-pointer bg-transparent border-0"
                >
                  Add your first classroom
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-600">
                  {['Program', 'Class', 'Semester', 'Division', 'Room No.', 'Acad. Year', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-blue-100 whitespace-nowrap first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((classroom, idx) => (
                  <tr
                    key={classroom._id}
                    className={`border-t border-blue-50 transition-colors hover:bg-blue-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}`}
                  >
                    {/* Program */}
                    <td className="px-4 py-3 pl-6">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${getProgramColor(classroom.program)}`}>
                          {PROGRAM_SHORT[classroom.program] || classroom.program}
                        </span>
                        <span className="text-slate-600 text-sm truncate max-w-[180px]" title={classroom.program}>
                          {classroom.program}
                        </span>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                        {classroom.className}
                      </span>
                    </td>

                    {/* Semester */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-sm">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                        Sem {classroom.semester}
                      </span>
                    </td>

                    {/* Division */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                        {classroom.division}
                      </span>
                    </td>

                    {/* Room Number */}
                    <td className="px-4 py-3">
                      {classroom.roomNumber ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                          <DoorOpen className="w-3 h-3" /> {classroom.roomNumber}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Not assigned</span>
                      )}
                    </td>

                    {/* Year */}
                    <td className="px-4 py-3">
                      {classroom.year ? (
                        <span className="text-slate-600 text-sm font-medium">{classroom.year}</span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 pr-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(classroom)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer bg-white"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(classroom._id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer bg-white"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-blue-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600">{filtered.length}</span> of {classrooms.length} classrooms
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 cursor-pointer bg-transparent border-0"
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
