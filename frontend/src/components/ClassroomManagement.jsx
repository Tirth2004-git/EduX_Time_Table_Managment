import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Building2,
  Search,
  AlertCircle,
  ChevronRight,
  LayoutGrid,
  GraduationCap,
  DoorOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Laptop,
  Users,
  ShieldAlert,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  Power,
  Sparkles,
  Layers,
  Tag,
  Check,
} from 'lucide-react';
import classroomApi from '@/services/api/classroomApi';
import departmentApi from '@/services/api/departmentApi';

const COMMON_BUILDINGS = [
  'Main Building',
  'A Block',
  'B Block',
  'C Block',
  'Tech Block A',
  'Science & Tech Block',
];

const ROOM_TYPES = [
  'Classroom',
  'Theory',
  'Laboratory',
  'Computer Lab',
  'Seminar Hall',
  'Tutorial Room',
  'Auditorium',
  'Other',
];

const COMMON_FACILITIES = [
  'Projector',
  'WiFi',
  'AC',
  'Whiteboard',
  'Smart Board',
  'Computers',
  'LAN',
  'Audio System',
  'Podium',
];

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Filters
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('roomNumber');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);
  const [viewingScheduleClassroom, setViewingScheduleClassroom] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState(null);

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    roomNumber: '',
    roomName: '',
    building: 'Main Building',
    customBuilding: '',
    floor: '1',
    type: 'Classroom',
    capacity: 60,
    status: 'Available',
    departmentId: '',
    academicYearId: '2026-27',
    facilities: ['Projector', 'Whiteboard', 'WiFi'],
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [classroomsRes, statsRes, deptsRes] = await Promise.all([
        classroomApi.list(),
        classroomApi.getStats(),
        departmentApi.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      setClassrooms(classroomsRes.data?.data || []);
      setStats(statsRes.data?.data || null);
      setDepartments(deptsRes.data?.data || []);
    } catch (err) {
      console.error('Error loading classrooms:', err);
      if (isManual) {
        alert('Unable to refresh classroom data. Please check connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingClassroom(null);
    setFormData({
      roomNumber: '',
      roomName: '',
      building: 'Main Building',
      customBuilding: '',
      floor: '1',
      type: 'Classroom',
      capacity: 60,
      status: 'Available',
      departmentId: '',
      academicYearId: '2026-27',
      facilities: ['Projector', 'Whiteboard', 'WiFi'],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (classroom) => {
    setEditingClassroom(classroom);
    const isCustom = !COMMON_BUILDINGS.includes(classroom.building);
    setFormData({
      roomNumber: classroom.roomNumber || '',
      roomName: classroom.roomName || '',
      building: isCustom ? 'custom' : classroom.building || 'Main Building',
      customBuilding: isCustom ? classroom.building : '',
      floor: String(classroom.floor || '1'),
      type: classroom.type || 'Classroom',
      capacity: classroom.capacity || 60,
      status: classroom.status || 'Available',
      departmentId: classroom.departmentId || '',
      academicYearId: classroom.academicYearId || '2026-27',
      facilities: classroom.facilities || [],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleToggleFacility = (facility) => {
    setFormData((prev) => {
      const exists = prev.facilities.includes(facility);
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter((f) => f !== facility)
          : [...prev.facilities, facility],
      };
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const resolvedBuilding =
      formData.building === 'custom' ? formData.customBuilding.trim() : formData.building;

    if (!formData.roomNumber.trim()) {
      setFormError('Room number is required.');
      setFormSubmitting(false);
      return;
    }

    if (!resolvedBuilding) {
      setFormError('Building name is required.');
      setFormSubmitting(false);
      return;
    }

    const payload = {
      roomNumber: formData.roomNumber.trim(),
      roomName: formData.roomName.trim() || `Room ${formData.roomNumber.trim()}`,
      building: resolvedBuilding,
      floor: formData.floor.trim(),
      type: formData.type,
      capacity: Number(formData.capacity),
      status: formData.status,
      available: formData.status === 'Available',
      departmentId: formData.departmentId || null,
      academicYearId: formData.academicYearId,
      facilities: formData.facilities,
    };

    try {
      if (editingClassroom) {
        await classroomApi.update(editingClassroom._id, payload);
      } else {
        await classroomApi.create(payload);
      }
      setShowModal(false);
      await loadInitialData();
    } catch (err) {
      console.error('Error saving classroom:', err);
      setFormError(err.response?.data?.error || err.message || 'Failed to save classroom.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id, force = false) => {
    try {
      await classroomApi.delete(id, force ? { force: 'true' } : undefined);
      setDeleteWarning(null);
      await loadInitialData();
    } catch (err) {
      const res = err.response?.data;
      if (res?.canDeactivate) {
        setDeleteWarning({
          id,
          roomNumber: classrooms.find((c) => c._id === id)?.roomNumber || 'this classroom',
          message: res.error,
          timetableUsage: res.timetableUsage,
        });
      } else {
        alert(res?.error || 'Failed to delete classroom.');
      }
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await classroomApi.delete(id, { deactivate: 'true' });
      setDeleteWarning(null);
      await loadInitialData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate classroom.');
    }
  };

  const handleToggleStatus = async (classroom) => {
    const nextStatus = classroom.status === 'Available' ? 'Maintenance' : 'Available';
    try {
      await classroomApi.update(classroom._id, {
        status: nextStatus,
        available: nextStatus === 'Available',
      });
      await loadInitialData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update classroom status.');
    }
  };

  const handleViewSchedule = async (classroom) => {
    setViewingScheduleClassroom(classroom);
    setLoadingSchedule(true);
    setScheduleData(null);
    try {
      const res = await classroomApi.getSchedule(classroom._id);
      setScheduleData(res.data?.data);
    } catch (err) {
      console.error('Failed to load classroom schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  // Filtered & Sorted Classrooms
  const filteredClassrooms = useMemo(() => {
    return classrooms
      .filter((c) => {
        const matchesSearch =
          (c.roomNumber || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.roomName || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.building || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.type || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.program || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.facilities || []).some((f) => f.toLowerCase().includes(search.toLowerCase()));

        if (!matchesSearch) return false;
        if (filterBuilding !== 'all' && c.building !== filterBuilding) return false;
        if (filterType !== 'all' && c.type !== filterType) return false;
        if (filterStatus !== 'all' && c.status !== filterStatus) return false;

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortBy] ?? '';
        let valB = b[sortBy] ?? '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [classrooms, search, filterBuilding, filterType, filterStatus, sortBy, sortOrder]);

  const uniqueBuildings = useMemo(() => {
    const bSet = new Set(classrooms.map((c) => c.building).filter(Boolean));
    return Array.from(bSet);
  }, [classrooms]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Laboratory':
      case 'Computer Lab':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'Seminar Hall':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Auditorium':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Tutorial Room':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Use':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Inactive':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 font-sans">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Infrastructure & Resources
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Classroom & Resource Management
          </h2>
          <p className="text-sm text-indigo-200/90 leading-relaxed">
            Manage lecture halls, computer labs, seminar auditoriums, and tutorial rooms with live timetable integration, seat capacity enforcement, and conflict detection.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => loadInitialData(true)}
            disabled={refreshing || loading}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Refresh classrooms and database statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Add Classroom
          </button>
        </div>
      </div>

      {/* ── Summary Statistics Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.totalClassrooms ?? classrooms.length}</p>
            <p className="text-xs font-semibold text-slate-400">Total Classrooms</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.availableClassrooms ?? classrooms.filter((c) => c.status === 'Available').length}</p>
            <p className="text-xs font-semibold text-slate-400">Available Rooms</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.theoryCount ?? classrooms.filter((c) => c.type === 'Classroom' || c.type === 'Theory').length}</p>
            <p className="text-xs font-semibold text-slate-400">Theory Lecture Halls</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.labsCount ?? classrooms.filter((c) => c.type === 'Laboratory' || c.type === 'Computer Lab').length}</p>
            <p className="text-xs font-semibold text-slate-400">Labs & Studios</p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {stats?.totalCapacity ?? classrooms.reduce((acc, c) => acc + (c.capacity || 0), 0)}
            </p>
            <p className="text-xs font-semibold text-slate-400">Total Student Capacity</p>
          </div>
        </div>
      </div>

      {/* ── Main Data View ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
        {/* Toolbar & Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-2xl placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Search by room, building, department, facility…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs border-0 bg-transparent cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Building Filter */}
            <div className="relative">
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Buildings</option>
                {uniqueBuildings.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Room Types</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
              >
                <option value="all">All Statuses</option>
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronRight className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none pr-8"
              >
                <option value="roomNumber-asc">Room (Asc)</option>
                <option value="roomNumber-desc">Room (Desc)</option>
                <option value="capacity-desc">Capacity (High to Low)</option>
                <option value="capacity-asc">Capacity (Low to High)</option>
                <option value="building-asc">Building</option>
              </select>
              <ChevronRight className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading classrooms database...</p>
            </div>
          ) : filteredClassrooms.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {search || filterBuilding !== 'all' || filterType !== 'all' || filterStatus !== 'all'
                  ? 'No classrooms match your search or filter criteria'
                  : 'No classrooms configured yet'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search ? 'Try clearing filters or checking room number spelling' : 'Add campus classrooms and laboratories to begin timetable generation'}
              </p>
              {!search && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 border-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Classroom
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Department / Program</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Facilities</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClassrooms.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Room Identifier */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-slate-800 text-xs shrink-0">
                          {c.roomNumber}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{c.roomName || `Room ${c.roomNumber}`}</span>
                          <span className="text-[10px] text-slate-400 font-semibold block">ID: {c.roomNumber}</span>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-800 text-xs">{c.building}</span>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {c.floor ? `${c.floor}${c.floor === '1' ? 'st' : c.floor === '2' ? 'nd' : c.floor === '3' ? 'rd' : 'th'} Floor` : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Room Type */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getTypeBadge(c.type)}`}>
                        {c.type}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1 font-extrabold text-slate-800 text-xs">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{c.capacity} seats</span>
                      </div>
                    </td>

                    {/* Program / Department */}
                    <td className="py-3.5 px-4">
                      {c.program ? (
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-700 truncate max-w-[160px]" title={c.program}>
                            {c.program}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider transition-all cursor-pointer ${getStatusBadge(c.status)}`}
                        title="Click to toggle Available / Maintenance"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Available' ? 'bg-emerald-500' : c.status === 'Maintenance' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        {c.status}
                      </button>
                    </td>

                    {/* Facilities */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.facilities && c.facilities.length > 0 ? (
                          c.facilities.slice(0, 3).map((f) => (
                            <span key={f} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {f}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-300 font-semibold">—</span>
                        )}
                        {c.facilities && c.facilities.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                            +{c.facilities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleViewSchedule(c)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-0 bg-transparent cursor-pointer"
                          title="View weekly occupancy schedule"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-0 bg-transparent cursor-pointer"
                          title="Edit classroom"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer"
                          title="Delete classroom"
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

        {/* Table Footer Summary */}
        <div className="flex items-center justify-between pt-2 text-xs font-semibold text-slate-400">
          <p>
            Showing <span className="text-slate-700">{filteredClassrooms.length}</span> of <span className="text-slate-700">{classrooms.length}</span> classrooms
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-indigo-600 hover:underline border-0 bg-transparent cursor-pointer text-xs font-bold"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* ── Add / Edit Classroom Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingClassroom ? 'Edit Classroom Details' : 'Add Campus Classroom'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure physical capacity, building, and facilities</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs font-bold text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Room Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, IT-301, Lab-2"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Room Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IT Theory Hall 301"
                    value={formData.roomName}
                    onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Building */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Building <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {COMMON_BUILDINGS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="custom">+ Other (Custom)</option>
                  </select>
                </div>

                {/* Custom Building if selected */}
                {formData.building === 'custom' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Custom Building Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Innovation Tower"
                      value={formData.customBuilding}
                      onChange={(e) => setFormData({ ...formData, customBuilding: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>
                )}

                {/* Floor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Floor Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1, 2, 3, Ground"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Room Type */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Room Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Student Capacity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 60"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Available">Available (Active for Scheduling)</option>
                    <option value="Maintenance">Under Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Optional Department */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Assigned Department <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">General Campus Resource</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.department_name} ({d.short_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Facilities selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Available Facilities & Equipment
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_FACILITIES.map((facility) => {
                    const selected = formData.facilities.includes(facility);
                    return (
                      <button
                        type="button"
                        key={facility}
                        onClick={() => handleToggleFacility(facility)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        {facility}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 disabled:opacity-50 border-0 cursor-pointer flex items-center gap-1.5"
                >
                  {formSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : editingClassroom ? (
                    'Update Classroom'
                  ) : (
                    'Create Classroom'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Classroom Occupancy & Schedule Modal ── */}
      {viewingScheduleClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8 max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                  {viewingScheduleClassroom.roomNumber}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {viewingScheduleClassroom.roomName || `Room ${viewingScheduleClassroom.roomNumber}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewingScheduleClassroom.building} · Floor {viewingScheduleClassroom.floor} · {viewingScheduleClassroom.capacity} seats ({viewingScheduleClassroom.type})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingScheduleClassroom(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Schedule Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {loadingSchedule ? (
                <div className="py-16 text-center space-y-2">
                  <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Fetching room schedule allocations...</p>
                </div>
              ) : !scheduleData?.schedule || scheduleData.schedule.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No active timetable slots allocated to this room</p>
                  <p className="text-xs text-slate-400">
                    This classroom is free and ready for AI timetable generation or manual assignment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Weekly Assigned Periods ({scheduleData.totalAllocatedSlots})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {scheduleData.schedule.map((slot) => (
                      <div
                        key={slot._id}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-extrabold">
                            {slot.day} · {slot.timeSlot}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {slot.department?.short_name || 'Dept'} Sem {slot.semester?.semester_number || slot.semester} ({slot.division?.division_name || 'A'})
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-extrabold text-slate-900">{slot.subject?.subject_name || 'Subject'}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{slot.teacher?.faculty_name || slot.teacher?.name || 'Assigned Faculty'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivation / Delete Warning Modal ── */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Classroom In Active Use</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Room <strong>{deleteWarning.roomNumber}</strong> is currently assigned to <strong>{deleteWarning.timetableUsage}</strong> scheduled period(s) in published timetables.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              We recommend <strong>deactivating</strong> the classroom so it stops receiving new scheduling allocations while preserving existing student and faculty schedules.
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => handleDeactivate(deleteWarning.id)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all border-0 cursor-pointer shadow-sm"
              >
                Deactivate Room (Preserve Timetables)
              </button>
              <button
                onClick={() => handleDelete(deleteWarning.id, true)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors border border-red-100 bg-transparent cursor-pointer"
              >
                Force Delete Anyway
              </button>
              <button
                onClick={() => setDeleteWarning(null)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
