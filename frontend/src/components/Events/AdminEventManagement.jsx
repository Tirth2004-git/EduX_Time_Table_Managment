import { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Building2,
  Calendar,
  Users,
  IndianRupee,
  MoreVertical,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  BarChart3,
  Trash2,
  Loader2,
  RefreshCw,
  Tag,
  Globe,
  Mail,
  Phone,
  Clock,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import eventApi from '@/services/api/eventApi';
import EventFormModal from './EventFormModal';
import OrganizationModal from './OrganizationModal';
import EventRegistrationsModal from './EventRegistrationsModal';
import EventAnalyticsModal from './EventAnalyticsModal';

export default function AdminEventManagement() {
  const [activeMainTab, setActiveMainTab] = useState('events'); // 'events' | 'organizations'
  const [events, setEvents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaid, setFilterPaid] = useState('all');

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);

  const [registrationsModalEvent, setRegistrationsModalEvent] = useState(null);
  const [analyticsModalEventId, setAnalyticsModalEventId] = useState(null);

  // Action dropdown state
  const [openActionId, setOpenActionId] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const [eventsRes, orgsRes, statsRes] = await Promise.all([
        eventApi.getAdminEvents(),
        eventApi.getOrganizations(),
        eventApi.getAdminStats(),
      ]);
      setEvents(eventsRes.data.data || []);
      setOrganizations(orgsRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      console.error('Error loading events dashboard data:', err);
      if (isManual) {
        alert('Unable to refresh event data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePublish = async (eventId) => {
    try {
      await eventApi.publishEvent(eventId);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to publish event');
    }
  };

  const handleUnpublish = async (eventId) => {
    try {
      await eventApi.unpublishEvent(eventId);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unpublish event');
    }
  };

  const handleCancel = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      const res = await eventApi.cancelEvent(eventId);
      if (res.data.refundNotice) {
        alert(res.data.refundNotice);
      }
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to permanently delete this event?')) return;
    try {
      await eventApi.deleteEvent(eventId);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete event');
    }
  };

  const handleDeleteOrg = async (orgId) => {
    if (!window.confirm('Are you sure you want to delete or archive this organization?')) return;
    try {
      const res = await eventApi.deleteOrganization(orgId);
      alert(res.data.message || 'Organization removed.');
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete organization');
    }
  };

  // Filtered events
  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      (ev.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (ev.organization?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (ev.venue || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterCategory !== 'all' && ev.category !== filterCategory) return false;
    if (filterStatus !== 'all' && ev.status !== filterStatus) return false;
    if (filterPaid === 'paid' && !ev.isPaid) return false;
    if (filterPaid === 'free' && ev.isPaid) return false;

    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Published':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Unpublished':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner & Stats ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Campus Activity Center
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Campus Events & Promotions
          </h2>
          <p className="text-sm text-indigo-200/90 leading-relaxed">
            Organize faculty seminars, corporate workshops, hackathons, and placement drives with targeted student distribution and Razorpay ticketing.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing || loading}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Refresh events, registration counts, and revenue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setSelectedOrg(null);
              setIsOrgModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" /> Add Partner Org
          </button>
          <button
            onClick={() => {
              setSelectedEvent(null);
              setIsEventModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-extrabold shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Create Campus Event
          </button>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.upcomingEvents || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Upcoming Events</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.publishedEvents || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Published (Live)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.draftEvents || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Draft Events</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.totalRegistrations || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Total Registrations</p>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">₹{stats?.totalRevenue || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Revenue Collected</p>
          </div>
        </div>
      </div>

      {/* ── Main Tabs & Filters ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Tab Switcher */}
        <div className="border-b border-slate-100 px-6 pt-4 flex items-center justify-between">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveMainTab('events')}
              className={`pb-4 font-bold text-sm border-b-2 transition-colors cursor-pointer border-0 bg-transparent ${
                activeMainTab === 'events'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              onClick={() => setActiveMainTab('organizations')}
              className={`pb-4 font-bold text-sm border-b-2 transition-colors cursor-pointer border-0 bg-transparent ${
                activeMainTab === 'organizations'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              Partner Organizations ({organizations.length})
            </button>
          </div>
        </div>

        {/* ── TAB 1: EVENTS LIST ── */}
        {activeMainTab === 'events' && (
          <div>
            {/* Filter Bar */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/40 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search events by title, organizer, venue..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="all">All Categories</option>
                  <option value="Workshop">Workshops</option>
                  <option value="Seminar">Seminars</option>
                  <option value="Guest Lecture">Guest Lectures</option>
                  <option value="Placement Drive">Placement Drives</option>
                  <option value="Hackathon">Hackathons</option>
                  <option value="Competition">Competitions</option>
                  <option value="Training">Training</option>
                  <option value="Certification">Certification</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Unpublished">Unpublished</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={filterPaid}
                  onChange={(e) => setFilterPaid(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="all">Free & Paid</option>
                  <option value="free">Free Events Only</option>
                  <option value="paid">Paid Events Only</option>
                </select>
              </div>
            </div>

            {/* Events Content */}
            <div className="p-4 sm:p-6">
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-500">Loading campus events...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-extrabold text-slate-800">No events found</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {search || filterCategory !== 'all' || filterStatus !== 'all'
                      ? 'No events match your selected filters. Try clearing your search.'
                      : 'Get started by creating your first campus event or promotion.'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedEvent(null);
                      setIsEventModalOpen(true);
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all cursor-pointer border-0"
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" /> Create Event
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-100">
                        <th className="p-4 rounded-l-2xl">Event & Organization</th>
                        <th className="p-4">Schedule & Venue</th>
                        <th className="p-4">Target Audience</th>
                        <th className="p-4">Fee & Capacity</th>
                        <th className="p-4">Registrations</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 rounded-r-2xl text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredEvents.map((event) => {
                        const org = event.organization || {};
                        const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });

                        return (
                          <tr key={event._id} className="hover:bg-slate-50/70 transition-colors group">
                            {/* Title & Org */}
                            <td className="p-4">
                              <div className="flex items-start gap-3">
                                {event.bannerUrl ? (
                                  <img
                                    src={event.bannerUrl}
                                    alt="Banner"
                                    className="w-14 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                                  />
                                ) : (
                                  <div className="w-14 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold">
                                    <Calendar className="w-5 h-5" />
                                  </div>
                                )}
                                <div>
                                  <span className="font-extrabold text-slate-900 text-sm block leading-snug">
                                    {event.title}
                                  </span>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                    <span className="font-bold text-indigo-600">{org.name || 'Campus Event'}</span>
                                    <span>·</span>
                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-600">
                                      {event.category}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Schedule & Venue */}
                            <td className="p-4">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {dateStr}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {event.startTime} - {event.endTime}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate max-w-[180px]">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{event.venue}</span>
                              </div>
                            </td>

                            {/* Target Audience */}
                            <td className="p-4">
                              {event.targetAudienceType === 'all' ? (
                                <span className="inline-flex px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px]">
                                  All Students
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                                    {event.targetDepartment?.short_name || event.targetDepartment?.department_name || 'Targeted Dept'}
                                  </span>
                                  {event.targetSemester && (
                                    <span className="block text-[10px] text-slate-500 font-medium">
                                      Sem {event.targetSemester.semester_number}
                                      {event.targetDivisions?.length > 0
                                        ? ` · Div ${event.targetDivisions.map((d) => d.division_name).join(', ')}`
                                        : ''}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Fee & Capacity */}
                            <td className="p-4">
                              <div>
                                {event.isPaid ? (
                                  <span className="font-extrabold text-indigo-700 text-xs">
                                    ₹{event.registrationFee}
                                  </span>
                                ) : (
                                  <span className="font-bold text-emerald-600 text-xs">Free</span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {event.capacity ? `${event.capacity} seats max` : 'Unlimited seats'}
                              </span>
                            </td>

                            {/* Registrations count button */}
                            <td className="p-4">
                              <button
                                onClick={() =>
                                  setRegistrationsModalEvent({
                                    id: event._id,
                                    title: event.title,
                                  })
                                }
                                className="inline-flex flex-col items-start px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-700 font-bold text-xs transition-colors cursor-pointer border-0"
                                title="Click to view registered students list"
                              >
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>
                                    {event.capacity
                                      ? `${event.registrationsCount || 0} / ${event.capacity}`
                                      : `${event.registrationsCount || 0} Registered`}
                                  </span>
                                </div>
                                {event.isPaid && (
                                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                    ₹{event.revenue || 0} collected
                                  </span>
                                )}
                              </button>
                            </td>

                            {/* Status */}
                            <td className="p-4">
                              <span
                                className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusBadge(
                                  event.status
                                )}`}
                              >
                                {event.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-4 text-right">
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={() =>
                                    setOpenActionId(openActionId === event._id ? null : event._id)
                                  }
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 border-0 bg-transparent cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openActionId === event._id && (
                                  <div
                                    onMouseLeave={() => setOpenActionId(null)}
                                    className="absolute right-0 mt-1 w-44 rounded-2xl bg-white border border-slate-100 shadow-xl z-20 py-2 space-y-0.5 animate-in fade-in"
                                  >
                                    <button
                                      onClick={() => {
                                        setSelectedEvent(event);
                                        setIsEventModalOpen(true);
                                        setOpenActionId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5 text-slate-400" /> Edit Event
                                    </button>

                                    {event.status === 'Draft' || event.status === 'Unpublished' ? (
                                      <button
                                        onClick={() => {
                                          handlePublish(event._id);
                                          setOpenActionId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Publish Live
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          handleUnpublish(event._id);
                                          setOpenActionId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-amber-500" /> Unpublish
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setRegistrationsModalEvent({
                                          id: event._id,
                                          title: event.title,
                                        });
                                        setOpenActionId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                    >
                                      <Users className="w-3.5 h-3.5 text-slate-400" /> View Registrations
                                    </button>

                                    <button
                                      onClick={() => {
                                        setAnalyticsModalEventId(event._id);
                                        setOpenActionId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                    >
                                      <BarChart3 className="w-3.5 h-3.5 text-slate-400" /> Analytics
                                    </button>

                                    <button
                                      onClick={() => {
                                        handleCancel(event._id);
                                        setOpenActionId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5 text-red-400" /> Cancel Event
                                    </button>

                                    <div className="border-t border-slate-100 my-1" />

                                    <button
                                      onClick={() => {
                                        handleDeleteEvent(event._id);
                                        setOpenActionId(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-0 bg-transparent cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete Event
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: ORGANIZATIONS LIST ── */}
        {activeMainTab === 'organizations' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Organizing Bodies & Companies</h3>
                <p className="text-xs text-slate-500">
                  Manage partner corporate entities, tech companies, and student chapters hosting events on campus.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrg(null);
                  setIsOrgModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer border-0 shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Organization
              </button>
            </div>

            {organizations.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">No organizations added yet</p>
                <p className="text-xs text-slate-400">Add partner organizations to assign them to events.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => (
                  <div
                    key={org._id}
                    className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-xl border border-slate-100 bg-slate-50 p-1 flex items-center justify-center overflow-hidden shrink-0">
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            org.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {org.isActive ? 'Active' : 'Archived'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{org.name}</h4>
                        {org.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{org.description}</p>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 pt-1">
                        {org.website && (
                          <a
                            href={org.website}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-indigo-600 hover:underline text-[11px] font-medium"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            {org.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        {org.contactPerson && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{org.contactPerson}</span>
                          </div>
                        )}
                        {org.contactEmail && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{org.contactEmail}</span>
                          </div>
                        )}
                        {org.contactPhone && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{org.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">
                        {org.eventsCount || 0} Event(s)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setIsOrgModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOrg(org._id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-0 bg-transparent cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {isEventModalOpen && (
        <EventFormModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          onSaved={loadDashboardData}
          initialData={selectedEvent}
          organizations={organizations}
          onOpenOrgModal={() => {
            setSelectedOrg(null);
            setIsOrgModalOpen(true);
          }}
        />
      )}

      {isOrgModalOpen && (
        <OrganizationModal
          isOpen={isOrgModalOpen}
          onClose={() => setIsOrgModalOpen(false)}
          onSaved={loadDashboardData}
          initialData={selectedOrg}
        />
      )}

      {registrationsModalEvent && (
        <EventRegistrationsModal
          isOpen={Boolean(registrationsModalEvent)}
          onClose={() => setRegistrationsModalEvent(null)}
          eventId={registrationsModalEvent.id}
          eventTitle={registrationsModalEvent.title}
        />
      )}

      {analyticsModalEventId && (
        <EventAnalyticsModal
          isOpen={Boolean(analyticsModalEventId)}
          onClose={() => setAnalyticsModalEventId(null)}
          eventId={analyticsModalEventId}
        />
      )}
    </div>
  );
}
