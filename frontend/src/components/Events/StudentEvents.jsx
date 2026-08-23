import { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Users,
  Search,
  CheckCircle2,
  Ticket,
  ChevronRight,
  Loader2,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react';
import eventApi from '@/services/api/eventApi';
import StudentEventDetailModal from './StudentEventDetailModal';

export default function StudentEvents() {
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'my-events'
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      if (activeTab === 'explore') {
        const res = await eventApi.getStudentEvents();
        setEvents(res.data.data || []);
      } else {
        const res = await eventApi.getMyEvents();
        setMyEvents(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading student events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSuccess = () => {
    loadEvents();
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      (ev.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (ev.organization?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (ev.venue || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterCategory !== 'all' && ev.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Top Hero Banner ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Campus Opportunities
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Campus Events & Workshops
          </h2>
          <p className="text-sm text-indigo-200/90 leading-relaxed">
            Discover corporate workshops, placement sessions, hackathons, and technical seminars curated for your department & semester.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-white/10 p-1.5 border border-white/20 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all border-0 cursor-pointer ${
              activeTab === 'explore'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'text-white/80 hover:text-white bg-transparent'
            }`}
          >
            Explore Events
          </button>
          <button
            onClick={() => setActiveTab('my-events')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all border-0 cursor-pointer ${
              activeTab === 'my-events'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'text-white/80 hover:text-white bg-transparent'
            }`}
          >
            My Events {myEvents.length > 0 && `(${myEvents.length})`}
          </button>
        </div>
      </div>

      {/* ── TAB 1: EXPLORE EVENTS ── */}
      {activeTab === 'explore' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search workshops, seminars, organizers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
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
            </div>
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading campus events for your stream...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                <Calendar className="w-7 h-7" />
              </div>
              <h4 className="text-base font-extrabold text-slate-800">No events currently listed</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search || filterCategory !== 'all'
                  ? 'No events match your selected filters.'
                  : 'Check back soon! New campus workshops and seminars will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => {
                const org = event.organization || {};
                const isRegistered = event.isRegistered;
                const isPaid = event.isPaid && event.registrationFee > 0;
                const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={event._id}
                    onClick={() => setSelectedEvent(event)}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group"
                  >
                    {/* Top Image Banner */}
                    <div className="relative h-44 bg-slate-900 overflow-hidden">
                      {event.bannerUrl ? (
                        <img
                          src={event.bannerUrl}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-indigo-900 via-indigo-800 to-slate-900 flex items-center justify-center text-indigo-300">
                          <Sparkles className="w-12 h-12 opacity-30" />
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-sm text-slate-800 text-[11px] font-extrabold shadow-sm">
                          {event.category}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm ${
                            isPaid
                              ? 'bg-indigo-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isPaid ? `₹${event.registrationFee}` : 'Free'}
                        </span>
                      </div>

                      {/* Registered Pill */}
                      {isRegistered && (
                        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-emerald-600/90 backdrop-blur-sm text-white text-[11px] font-extrabold flex items-center gap-1 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        {/* Organizer Name */}
                        <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                          {org.logoUrl && (
                            <img
                              src={org.logoUrl}
                              alt={org.name}
                              className="w-4 h-4 object-contain rounded"
                            />
                          )}
                          <span className="truncate">{org.name || 'Campus Event'}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {event.title}
                        </h3>

                        {/* Description Preview */}
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      </div>

                      {/* Meta Info */}
                      <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {event.startTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{event.venue}</span>
                          </span>
                          <span className="capitalize">{event.mode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <div className="px-5 pb-5 pt-0">
                      <button className="w-full py-2.5 rounded-xl bg-slate-50 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1 border border-slate-100 group-hover:border-indigo-600 cursor-pointer">
                        View Details & Register <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MY REGISTERED EVENTS ── */}
      {activeTab === 'my-events' && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading your registrations...</p>
            </div>
          ) : myEvents.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                <Ticket className="w-7 h-7" />
              </div>
              <h4 className="text-base font-extrabold text-slate-800">You haven't registered for any events yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Browse through the available campus events and secure your tickets or passes.
              </p>
              <button
                onClick={() => setActiveTab('explore')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-colors cursor-pointer border-0"
              >
                Explore Events
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myEvents.map((item) => {
                const event = item.event;
                const payment = item.payment || {};
                const dateStr = new Date(event.eventDate).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={item.registrationId}
                    className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-extrabold">
                          {event.category}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-extrabold ${
                            item.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.paymentStatus === 'free'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.paymentStatus === 'paid' ? `₹${payment.amount || event.registrationFee} Paid` : 'Free Entry'}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-indigo-600 block">
                          {event.organization?.name || 'Campus Event'}
                        </span>
                        <h4 className="text-base font-extrabold text-slate-900 leading-snug mt-0.5">
                          {event.title}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-2xl">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Date & Time</span>
                          <span className="font-semibold text-slate-800">{dateStr}</span>
                          <span className="text-[11px] text-slate-400 block">{event.startTime} - {event.endTime}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Venue</span>
                          <span className="font-semibold text-slate-800 line-clamp-1">{event.venue}</span>
                          <span className="text-[11px] text-slate-400 capitalize block">{event.mode}</span>
                        </div>
                      </div>

                      {payment.razorpayPaymentId && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          Payment Ref: <span className="font-semibold text-slate-600">{payment.razorpayPaymentId}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-extrabold">
                        <CheckCircle2 className="w-4 h-4" /> Registration Confirmed
                      </div>
                      <button
                        onClick={() => setSelectedEvent({ ...event, isRegistered: true })}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border-0"
                      >
                        View Ticket Info
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail & Registration Modal */}
      {selectedEvent && (
        <StudentEventDetailModal
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  );
}
