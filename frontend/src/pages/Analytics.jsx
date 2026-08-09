import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BookOpen, Building2, CheckCircle2, Loader2, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import timetableApi from '@/services/api/timetableApi';

const metricCards = [
  { key: 'teachersCount', label: 'Total Teachers', icon: Users, tone: 'text-indigo-600 bg-indigo-50' },
  { key: 'subjectsCount', label: 'Total Subjects', icon: BookOpen, tone: 'text-sky-600 bg-sky-50' },
  { key: 'classroomsCount', label: 'Total Classrooms', icon: Building2, tone: 'text-violet-600 bg-violet-50' },
  { key: 'timetableCompletion', label: 'Timetable Completion', suffix: '%', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
  { key: 'conflictCount', label: 'Conflict Count', icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50' },
  { key: 'scheduleHealthScore', label: 'Timetable Health Score', suffix: '/100', icon: ShieldCheck, tone: 'text-teal-600 bg-teal-50' },
];

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-800">Generate a timetable to view analytics</h2>
      <p className="mt-1 text-sm text-slate-500">Once classes are assigned, EduX will show workload and timetable health here.</p>
    </div>
  );
}

export default function Analytics({ isTab = false }) {
  const navigate = useNavigate();
  const [semester, setSemester] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await timetableApi.getAnalytics(semester === 'all' ? {} : { semester });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load analytics right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, [semester]);

  const insights = () => {
    if (!data?.hasData) return [];
    const workload = data.teacherWorkload || [];
    const overloaded = workload.filter((teacher) => teacher.assignedHours > teacher.totalHours);
    const recommendations = [];
    if (overloaded.length) recommendations.push(`${overloaded[0].name} is over their weekly workload limit. Reassign one or more lectures.`);
    else recommendations.push('Faculty workload is within the configured weekly limits.');
    if (data.health?.teacherConflicts) recommendations.push(`${data.health.teacherConflicts} teacher scheduling conflict${data.health.teacherConflicts === 1 ? '' : 's'} need review.`);
    if (data.health?.classroomConflicts) recommendations.push(`${data.health.classroomConflicts} classroom conflict${data.health.classroomConflicts === 1 ? '' : 's'} need review.`);
    if (data.health?.freeRooms > 0) recommendations.push(`${data.health.freeRooms} room${data.health.freeRooms === 1 ? ' is' : 's are'} currently unassigned; consider consolidating room usage.`);
    if (data.timetableCompletion < 80) recommendations.push('Add more timetable slots to improve completion coverage.');
    if (data.scheduleHealthScore >= 85) recommendations.push('The timetable is healthy. Continue monitoring changes before publishing.');
    return recommendations.slice(0, 5);
  };

  return (
    <div className={isTab ? 'animate-fadeIn text-slate-900' : 'min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8'}>
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {!isTab && <Button variant="outline" size="icon" className="rounded-xl" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>}
          <div><h1 className="text-xl font-bold">Analytics</h1><p className="text-sm text-slate-500">A focused view of timetable readiness and resource health.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Semester" value={semester} onChange={(event) => setSemester(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All semesters</option>
            {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>Semester {value}</option>)}
          </select>
          <Button variant="outline" className="gap-2 rounded-xl" disabled={loading} onClick={fetchAnalytics}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}Refresh</Button>
        </div>
      </div>

      {loading ? <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div> : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : !data?.hasData ? <EmptyState /> : <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map(({ key, label, suffix = '', icon: Icon, tone }) => <Card key={key} className="border-slate-200 shadow-sm"><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{data[key]}{suffix}</p></div><div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div></CardContent></Card>)}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Faculty Workload</CardTitle><CardDescription>Top 5 teachers by assigned weekly lectures.</CardDescription></CardHeader><CardContent>
            <div className="space-y-5">{data.teacherWorkload.slice(0, 5).map((teacher) => { const percent = Math.min(100, Math.round((teacher.assignedHours / Math.max(1, teacher.totalHours)) * 100)); const over = teacher.assignedHours > teacher.totalHours; return <div key={teacher.name}><div className="mb-2 flex justify-between gap-4 text-sm"><span className="font-medium text-slate-800">{teacher.name}</span><span className={over ? 'font-semibold text-rose-600' : 'text-slate-500'}>{teacher.assignedHours} / {teacher.totalHours} lectures</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${over ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-indigo-600'}`} style={{ width: `${percent}%` }} /></div></div>; })}</div>
          </CardContent></Card>
          <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>Timetable Health</CardTitle><CardDescription>Key operational checks for the selected scope.</CardDescription></CardHeader><CardContent className="space-y-3">
            {[['Teacher Conflicts', data.health.teacherConflicts], ['Classroom Conflicts', data.health.classroomConflicts], ['Free Rooms', data.health.freeRooms], ['Overall Health Score', `${data.health.overallScore}/100`]].map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-600">{label}</span><span className="font-semibold text-slate-900">{value}</span></div>)}
          </CardContent></Card>
        </div>

        <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>AI Insights</CardTitle><CardDescription>Clear next steps based on the current timetable.</CardDescription></CardHeader><CardContent><ul className="space-y-3">{insights().map((insight) => <li key={insight} className="flex gap-3 rounded-xl bg-indigo-50/60 p-3 text-sm text-slate-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />{insight}</li>)}</ul></CardContent></Card>
      </div>}
    </div>
  );
}
