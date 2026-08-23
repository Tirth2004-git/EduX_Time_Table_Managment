import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Users,
  IndianRupee,
  Upload,
  Link as LinkIcon,
  Mail,
  Phone,
  UserCheck,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import eventApi from '@/services/api/eventApi';
import api from '@/services/api';

const CATEGORIES = [
  'Workshop',
  'Seminar',
  'Guest Lecture',
  'Placement Drive',
  'Hackathon',
  'Competition',
  'Training',
  'Certification',
  'Other',
];

const MODES = ['Offline', 'Online', 'Hybrid'];

export default function EventFormModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
  organizations = [],
  onOpenOrgModal,
}) {
  const [formData, setFormData] = useState({
    organization: '',
    title: '',
    description: '',
    category: 'Workshop',
    eventDate: '',
    startTime: '10:00',
    endTime: '13:00',
    venue: '',
    mode: 'Offline',
    meetingUrl: '',
    registrationDeadline: '',
    isPaid: false,
    registrationFee: 0,
    capacity: 0,
    registrationUrl: '',
    speakerName: '',
    speakerDesignation: '',
    contactEmail: '',
    contactPhone: '',
    targetAudienceType: 'all',
    targetDepartment: '',
    targetSemester: '',
    targetDivisions: [],
    status: 'Draft',
  });

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [speakerPhotoFile, setSpeakerPhotoFile] = useState(null);
  const [speakerPhotoPreview, setSpeakerPhotoPreview] = useState('');
  const [academicData, setAcademicData] = useState({
    departments: [],
    semesters: [],
    divisions: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch academic data for targeting dropdowns
  useEffect(() => {
    if (isOpen) {
      Promise.all([api.get('/departments'), api.get('/semesters'), api.get('/divisions')])
        .then(([deptRes, semRes, divRes]) => {
          setAcademicData({
            departments: deptRes.data.data || deptRes.data.departments || deptRes.data || [],
            semesters: semRes.data.data || semRes.data.semesters || semRes.data || [],
            divisions: divRes.data.data || divRes.data.divisions || divRes.data || [],
          });
        })
        .catch((err) => console.warn('Could not load academic data:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      const formatDateForInput = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        return dt.toISOString().split('T')[0];
      };

      setFormData({
        organization: initialData.organization?._id || initialData.organization || '',
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || 'Workshop',
        eventDate: formatDateForInput(initialData.eventDate),
        startTime: initialData.startTime || '10:00',
        endTime: initialData.endTime || '13:00',
        venue: initialData.venue || '',
        mode: initialData.mode || 'Offline',
        meetingUrl: initialData.meetingUrl || '',
        registrationDeadline: formatDateForInput(initialData.registrationDeadline),
        isPaid: Boolean(initialData.isPaid),
        registrationFee: initialData.registrationFee || 0,
        capacity: initialData.capacity || 0,
        registrationUrl: initialData.registrationUrl || '',
        speakerName: initialData.speakerName || '',
        speakerDesignation: initialData.speakerDesignation || '',
        contactEmail: initialData.contactEmail || '',
        contactPhone: initialData.contactPhone || '',
        targetAudienceType: initialData.targetAudienceType || 'all',
        targetDepartment: initialData.targetDepartment?._id || initialData.targetDepartment || '',
        targetSemester: initialData.targetSemester?._id || initialData.targetSemester || '',
        targetDivisions: initialData.targetDivisions?.map((d) => d._id || d) || [],
        status: initialData.status || 'Draft',
      });
      setBannerPreview(initialData.bannerUrl || '');
      setSpeakerPhotoPreview(initialData.speakerPhotoUrl || '');
    } else {
      setFormData({
        organization: organizations[0]?._id || '',
        title: '',
        description: '',
        category: 'Workshop',
        eventDate: '',
        startTime: '10:00',
        endTime: '13:00',
        venue: '',
        mode: 'Offline',
        meetingUrl: '',
        registrationDeadline: '',
        isPaid: false,
        registrationFee: 0,
        capacity: 0,
        registrationUrl: '',
        speakerName: '',
        speakerDesignation: '',
        contactEmail: '',
        contactPhone: '',
        targetAudienceType: 'all',
        targetDepartment: '',
        targetSemester: '',
        targetDivisions: [],
        status: 'Draft',
      });
      setBannerPreview('');
      setSpeakerPhotoPreview('');
    }
    setBannerFile(null);
    setSpeakerPhotoFile(null);
    setError('');
  }, [initialData, isOpen, organizations]);

  const filteredSemesters = useMemo(() => {
    if (!formData.targetDepartment) return academicData.semesters;
    return academicData.semesters.filter(
      (s) => String(s.department?._id || s.department) === formData.targetDepartment
    );
  }, [academicData.semesters, formData.targetDepartment]);

  const filteredDivisions = useMemo(() => {
    return academicData.divisions.filter((d) => {
      const matchDept = !formData.targetDepartment || String(d.department?._id || d.department) === formData.targetDepartment;
      const matchSem = !formData.targetSemester || String(d.semester?._id || d.semester) === formData.targetSemester;
      return matchDept && matchSem;
    });
  }, [academicData.divisions, formData.targetDepartment, formData.targetSemester]);

  if (!isOpen) return null;

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSpeakerPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSpeakerPhotoFile(file);
      setSpeakerPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDivisionToggle = (divisionId) => {
    setFormData((prev) => {
      const exists = prev.targetDivisions.includes(divisionId);
      const nextDivisions = exists
        ? prev.targetDivisions.filter((id) => id !== divisionId)
        : [...prev.targetDivisions, divisionId];
      return { ...prev, targetDivisions: nextDivisions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.organization) {
      setError('Please select or add an organizing body');
      return;
    }
    if (!formData.title.trim()) {
      setError('Event title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Event description is required');
      return;
    }
    if (!formData.eventDate) {
      setError('Event date is required');
      return;
    }
    if (!formData.registrationDeadline) {
      setError('Registration deadline is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'targetDivisions') {
          formData.targetDivisions.forEach((divId) => data.append('targetDivisions[]', divId));
        } else {
          data.append(key, formData[key]);
        }
      });

      if (bannerFile) data.append('banner', bannerFile);
      if (speakerPhotoFile) data.append('speakerPhoto', speakerPhotoFile);

      if (initialData?._id) {
        await eventApi.updateEvent(initialData._id, data);
      } else {
        await eventApi.createEvent(data);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800">
                {initialData ? 'Edit Campus Event' : 'Create New Campus Event'}
              </h3>
              <p className="text-xs text-slate-500">Configure event details, audience targeting, schedule & pricing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
              ⚠️ {error}
            </div>
          )}

          {/* ── SECTION 1: Basic Information ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">1</span>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Event Information</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & Full Stack Development Masterclass"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Event Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Event Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Overview, takeaways, prerequisites, certifications offered..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* ── SECTION 2: Organization ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">2</span>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Organizing Partner</h4>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <select
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select Organizing Body / Partner...</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name} {org.contactPerson ? `(${org.contactPerson})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={onOpenOrgModal}
                className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add New Organization
              </button>
            </div>
          </div>

          {/* ── SECTION 3: Schedule & Venue ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">3</span>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Schedule & Venue</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Event Mode
                </label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Venue / Location <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Auditorium Hall B, 3rd Floor or Zoom Meeting"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {formData.mode !== 'Offline' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Online Meeting / Webinar URL
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                    value={formData.meetingUrl}
                    onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 4: Registration & Pricing ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">4</span>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Registration & Pricing</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Registration Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Registration Capacity
                </label>
                <div className="relative flex items-center">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Unlimited"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Leave 0 for unlimited seats</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Pricing Type
                </label>
                <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPaid: false, registrationFee: 0 })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                      !formData.isPaid ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 bg-transparent'
                    }`}
                  >
                    Free Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPaid: true, registrationFee: formData.registrationFee || 299 })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                      formData.isPaid ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 bg-transparent'
                    }`}
                  >
                    Paid Event
                  </button>
                </div>
              </div>
            </div>

            {formData.isPaid && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold text-indigo-900">Paid Registration Fee (INR)</p>
                  <p className="text-[11px] text-indigo-600 mt-0.5">
                    Payments collected securely via Razorpay Test Mode
                  </p>
                </div>
                <div className="relative flex items-center w-full sm:w-48">
                  <IndianRupee className="w-4 h-4 text-indigo-600 absolute left-3.5" />
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Fee (₹)"
                    value={formData.registrationFee}
                    onChange={(e) => setFormData({ ...formData, registrationFee: Number(e.target.value) })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-indigo-200 bg-white font-bold text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 5: Target Students ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">5</span>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Target Audience</h4>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="radio"
                  name="targetAudienceType"
                  value="all"
                  checked={formData.targetAudienceType === 'all'}
                  onChange={() => setFormData({ ...formData, targetAudienceType: 'all', targetDepartment: '', targetSemester: '', targetDivisions: [] })}
                  className="w-4 h-4 text-indigo-600"
                />
                All College Students
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                <input
                  type="radio"
                  name="targetAudienceType"
                  value="targeted"
                  checked={formData.targetAudienceType === 'targeted'}
                  onChange={() => setFormData({ ...formData, targetAudienceType: 'targeted' })}
                  className="w-4 h-4 text-indigo-600"
                />
                Specific Department & Semester
              </label>
            </div>

            {formData.targetAudienceType === 'targeted' && (
              <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Department / Branch
                    </label>
                    <select
                      value={formData.targetDepartment}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetDepartment: e.target.value,
                          targetSemester: '',
                          targetDivisions: [],
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">All Departments (or Select One)</option>
                      {academicData.departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.department_name || d.short_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Semester
                    </label>
                    <select
                      value={formData.targetSemester}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetSemester: e.target.value,
                          targetDivisions: [],
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="">All Semesters (or Select One)</option>
                      {filteredSemesters.map((s) => (
                        <option key={s._id} value={s._id}>
                          Semester {s.semester_number} {s.academic_year ? `(${s.academic_year})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredDivisions.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                      Filter by Divisions (leave empty for all divisions):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {filteredDivisions.map((div) => {
                        const active = formData.targetDivisions.includes(div._id);
                        return (
                          <button
                            key={div._id}
                            type="button"
                            onClick={() => handleDivisionToggle(div._id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              active
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Division {div.division_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 6: Promotional & Speaker Content ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">6</span>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Promotional Media & Speaker</h4>
            </div>

            {/* Banner Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Event Banner Image
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    Choose Banner Image
                    <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">Recommended: 1200x600px JPG/PNG</p>
                </div>
              </div>
            </div>

            {/* Speaker Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Keynote Speaker / Faculty Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Smith, Senior Architect"
                  value={formData.speakerName}
                  onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Speaker Designation & Organization
                </label>
                <input
                  type="text"
                  placeholder="e.g. VP of AI Research at Tech Corp"
                  value={formData.speakerDesignation}
                  onChange={(e) => setFormData({ ...formData, speakerDesignation: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Event Inquiry Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    placeholder="events@college.edu"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Inquiry Phone / Helpline
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Status:</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="Draft">Draft (Hidden)</option>
                <option value="Published">Published (Live)</option>
                <option value="Unpublished">Unpublished</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer border-0"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {initialData ? 'Update Event' : 'Save & Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
