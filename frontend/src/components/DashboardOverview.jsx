import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  Building2,
  BarChart3,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  Ticket,
} from 'lucide-react';
import adminDashboardApi from '@/services/api/adminDashboardApi';

export default function DashboardOverview({ onTabChange }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalSubjects: 0,
    utilizationRate: 0,
    filledSlots: 0,
    totalSlots: 0,
    classrooms: 0,
    activeDivisions: 0,
    upcomingEvents: 0,
    totalRevenue: 0,
    pendingLeaves: 0,
    pendingSubstitutions: 0,
  });
  const [error, setError] = useState('');

  const loadStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError('');

    try {
      const res = await adminDashboardApi.getDashboard();
      const data = res.data?.data || {};

      setStats({
        totalTeachers: data.totalTeachers || data.activeFaculty || 0,
        totalSubjects: data.totalSubjects || data.configuredSubjects || 0,
        utilizationRate: data.utilization !== undefined ? data.utilization : (data.utilizationRate || 0),
        filledSlots: data.scheduledPeriods !== undefined ? data.scheduledPeriods : (data.filledSlots || 0),
        totalSlots: data.totalSlots || 0,
        classrooms: data.totalClassrooms || data.classrooms || 0,
        activeDivisions: data.totalDivisions || data.activeDivisions || 0,
        upcomingEvents: data.upcomingEvents || 0,
        totalRevenue: data.totalRevenue || 0,
        pendingLeaves: data.pendingLeaves || 0,
        pendingSubstitutions: data.pendingSubstitutions || 0,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
      setError('Unable to load dashboard data. Please check your connection and retry.');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();

    // Controlled automatic refresh every 30 seconds
    const interval = setInterval(() => {
      loadStats();
    }, 30000);

    // Cross-component live update listener
    const handleUpdate = () => loadStats();
    window.addEventListener('dashboardUpdate', handleUpdate);
    window.addEventListener('timetableUpdated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboardUpdate', handleUpdate);
      window.removeEventListener('timetableUpdated', handleUpdate);
    };
  }, [loadStats]);

  const statCards = [
    {
      title: 'Active Faculty',
      value: stats.totalTeachers,
      description: 'Registered teachers',
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      color: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Configured Subjects',
      value: stats.totalSubjects,
      description: 'Unique subject modules',
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Overall Utilization',
      value: `${stats.utilizationRate}%`,
      description: 'Of total timetable slots',
      icon: <BarChart3 className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50 border-purple-100',
    },
    {
      title: 'Scheduled Periods',
      value: stats.filledSlots,
      description: 'Active allocations',
      icon: <Calendar className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-3xl p-8 shadow-xl shadow-indigo-950/10 border border-indigo-950">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> AI-Assisted Planner
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">EduX Timetable Console</h1>
            <p className="text-indigo-100/90 text-sm md:text-base leading-relaxed">
              Design, optimize, and resolve teacher/room conflicts automatically with intelligent recommendations. Run full division generations in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadStats(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-md border border-white/20 transition-all text-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              onClick={() => onTabChange('timetable')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-indigo-950 font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 shrink-0 border-0 cursor-pointer text-sm"
            >
              Launch Builder <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {lastUpdated && (
          <div className="relative z-10 mt-4 text-[11px] text-indigo-200/80 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>

      {/* Error Banner with Retry */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between gap-4 text-red-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Unable to load dashboard data</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadStats(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold border-0 cursor-pointer shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Skeleton Cards
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-start gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-7 w-16 bg-slate-200 rounded" />
                <div className="h-2.5 w-28 bg-slate-100 rounded" />
              </div>
            </div>
          ))
        ) : (
          statCards.map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 group flex items-start gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{card.value}</h3>
                <p className="text-xs text-slate-400 mt-1">{card.description}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Quick Management Shortcuts</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ShortcutCard
                title="Build Timetable"
                description="Edit division slots, resolve conflicts, and export schedules."
                icon={<Calendar className="w-5 h-5 text-indigo-600" />}
                action={() => onTabChange('timetable')}
              />
              <ShortcutCard
                title="Faculty Database"
                description="Manage teachers list, teaching hours, and divisions."
                icon={<Users className="w-5 h-5 text-emerald-600" />}
                action={() => onTabChange('teachers')}
              />
              <ShortcutCard
                title="Course Subjects"
                description="Configure subject codes, names, and link teachers."
                icon={<BookOpen className="w-5 h-5 text-purple-600" />}
                action={() => onTabChange('subjects')}
              />
              <ShortcutCard
                title="Classrooms & Rooms"
                description="Assign room numbers, capacity limits, and divisions."
                icon={<Building2 className="w-5 h-5 text-amber-600" />}
                action={() => onTabChange('classrooms')}
              />
              <ShortcutCard
                title="Campus Events"
                description="Promotions, workshop registrations, and Razorpay revenue."
                icon={<Sparkles className="w-5 h-5 text-indigo-600" />}
                action={() => onTabChange('events')}
              />
              <ShortcutCard
                title="Leave & Substitutions"
                description="Faculty leave requests and replacement slot assignments."
                icon={<Clock className="w-5 h-5 text-blue-600" />}
                action={() => onTabChange('leaves')}
              />
            </div>
          </div>
        </div>

        {/* System Health / Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between h-full min-h-[300px]">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Planner Status</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Conflict Engine Active</h4>
                    <p className="text-xs text-slate-400">Monitoring overlaps in real time</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">AI Placement Ready</h4>
                    <p className="text-xs text-slate-400">Multi-candidate optimization active</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Academic Schedule Grid</h4>
                    <p className="text-xs text-slate-400">{stats.activeDivisions} Active Divisions · 6 Working Days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 mt-6">
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Redesign Version</p>
                  <p className="text-sm font-bold text-slate-800">EduX Premium SaaS v2.0</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">LIVE SYNC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ title, description, icon, action }) {
  return (
    <button
      onClick={action}
      className="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-indigo-50/20 hover:border-indigo-100 text-left transition-all duration-300 group cursor-pointer flex gap-4 w-full"
    >
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
          {title}
        </h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
