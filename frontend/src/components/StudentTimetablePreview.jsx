import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import timetableApi from '@/services/api/timetableApi';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];
const uniqueBy = (items, key) => [...new Map(items.map((item) => [key(item), item])).values()];

export default function StudentTimetablePreview() {
  const [profile, setProfile] = useState(null);
  const [combinations, setCombinations] = useState([]);
  const [selection, setSelection] = useState(null);
  const [draftSelection, setDraftSelection] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChooser, setShowChooser] = useState(false);

  const departments = useMemo(
    () => uniqueBy(combinations.map((item) => item.department), (item) => item.id),
    [combinations],
  );
  const semesters = useMemo(
    () => uniqueBy(
      combinations.filter((item) => item.department.id === draftSelection?.department).map((item) => item.semester),
      (item) => item.id,
    ),
    [combinations, draftSelection?.department],
  );
  const divisions = useMemo(
    () => uniqueBy(
      combinations
        .filter((item) => item.department.id === draftSelection?.department && item.semester.id === draftSelection?.semester)
        .map((item) => item.division),
      (item) => item.id,
    ),
    [combinations, draftSelection?.department, draftSelection?.semester],
  );

  const defaultSelection = useMemo(() => profile ? ({
    department: String(profile.department?.id || ''),
    semester: String(profile.semester?.id || ''),
    division: String(profile.division?.id || ''),
  }) : null, [profile]);
  const selectedCombination = combinations.find((item) =>
    item.department.id === selection?.department && item.semester.id === selection?.semester && item.division.id === selection?.division,
  );
  const isDefaultSelection = Boolean(defaultSelection && selection &&
    defaultSelection.department === selection.department &&
    defaultSelection.semester === selection.semester &&
    defaultSelection.division === selection.division);

  const loadTimetable = useCallback(async (nextSelection) => {
    if (!nextSelection?.department || !nextSelection?.semester || !nextSelection?.division) return;
    setLoading(true);
    setError('');
    setEntries([]);
    try {
      const response = await timetableApi.getPublishedStudentTimetable(nextSelection);
      setEntries(response.data.entries || []);
    } catch {
      setError('Unable to load your timetable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialise = async () => {
      setLoading(true);
      setError('');
      try {
        const profileResponse = await timetableApi.getStudentTimetable();
        const academicProfile = profileResponse.data.academicProfile;
        const initialSelection = academicProfile?.department?.id && academicProfile?.semester?.id && academicProfile?.division?.id ? {
          department: String(academicProfile.department.id),
          semester: String(academicProfile.semester.id),
          division: String(academicProfile.division.id),
        } : null;
        if (!active) return;
        setProfile(academicProfile || null);
        setSelection(initialSelection);
        setDraftSelection(initialSelection);
        if (!initialSelection) {
          setLoading(false);
          return;
        }
        // The profile is the source of truth for the initial view.  Available
        // combinations are only needed when the student chooses to browse.
        await loadTimetable(initialSelection);
        try {
          const availableResponse = await timetableApi.getAvailableStudentTimetables();
          if (active) setCombinations(availableResponse.data.combinations || []);
        } catch {
          // The default timetable remains usable even if optional browsing
          // options cannot be loaded at this moment.
        }
      } catch {
        if (active) {
          setError('Unable to load your timetable.');
          setLoading(false);
        }
      }
    };
    initialise();
    return () => { active = false; };
  }, [loadTimetable]);

  const openChooser = () => {
    setDraftSelection(selection || defaultSelection);
    setShowChooser(true);
  };
  const updateDepartment = (department) => {
    const match = combinations.find((item) => item.department.id === department);
    setDraftSelection({ department, semester: match?.semester.id || '', division: match?.division.id || '' });
  };
  const updateSemester = (semester) => {
    const match = combinations.find((item) =>
      item.department.id === draftSelection?.department && item.semester.id === semester,
    );
    setDraftSelection((current) => ({ ...current, semester, division: match?.division.id || '' }));
  };
  const viewSelection = async () => {
    if (!draftSelection?.department || !draftSelection?.semester || !draftSelection?.division) return;
    setSelection(draftSelection);
    setShowChooser(false);
    await loadTimetable(draftSelection);
  };
  const slots = [...new Set(entries.map((entry) => entry.timeSlot).filter(Boolean))].sort();
  const heading = selectedCombination || (isDefaultSelection && profile ? {
    department: profile.department,
    semester: profile.semester,
    division: profile.division,
  } : null);

  if (!profile && !loading && !error) {
    return <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6"><EmptyProfile /></main>;
  }

  return <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">My Timetable</p>
        {heading ? <>
          <h2 className="mt-2 text-xl font-extrabold text-slate-800">{heading.department.name}</h2>
          <p className="text-sm text-slate-500 mt-1">Semester {heading.semester.number} · Division {heading.division.name}</p>
          {heading.semester.academicYear && <p className="text-sm text-slate-500 mt-1">Academic Year {heading.semester.academicYear}</p>}
        </> : <p className="mt-2 text-sm text-slate-500">Loading your academic profile...</p>}
      </div>
      <button onClick={openChooser} disabled={!combinations.length} className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 px-4 py-2.5 text-sm font-bold text-white transition-colors">
        Change Timetable
      </button>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-extrabold text-slate-800">Weekly Timetable</h2></div>
      {loading ? <p className="p-12 text-center text-slate-500">Loading your timetable...</p>
        : error ? <div className="p-12 text-center text-slate-600"><p>{error}</p><button onClick={() => loadTimetable(selection)} className="mt-4 text-sm font-bold text-blue-600 hover:text-blue-700">Retry</button></div>
        : !entries.length ? <EmptyTimetable heading={heading} isDefault={isDefaultSelection} />
        : <Schedule entries={entries} slots={slots} />}
    </section>

{showChooser && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 p-4" role="dialog" aria-modal="true">
  <div className="w-[min(480px,calc(100vw-2rem))] max-w-none rounded-2xl bg-white p-5 sm:p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-800">Change Timetable</h2>
        <p className="mt-1 text-sm text-slate-500">Published timetables only.</p>
      </div>
      <button onClick={() => setShowChooser(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
        <X className="h-5 w-5" />
      </button>
    </div>

    <div className="mt-5 flex flex-col gap-4">
      <Filter label="Department / Branch" value={draftSelection?.department || ''} onChange={updateDepartment} options={departments.map((item) => ({ value: item.id, label: item.name }))} />
      <Filter label="Semester" value={draftSelection?.semester || ''} onChange={updateSemester} options={semesters.map((item) => ({ value: item.id, label: `Semester ${item.number}${item.academicYear ? ` (${item.academicYear})` : ''}` }))} />
      <Filter label="Division" value={draftSelection?.division || ''} onChange={(division) => setDraftSelection((current) => ({ ...current, division }))} options={divisions.map((item) => ({ value: item.id, label: item.name }))} />
    </div>

    <div className="mt-6 flex justify-end gap-3">
      <button onClick={() => setShowChooser(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
      <button onClick={viewSelection} disabled={!draftSelection?.division} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-blue-200">View Timetable</button>
    </div>
  </div>
</div>}
  </main>;
}

function Filter({ label, value, onChange, options }) { return <label className="min-w-0 text-xs font-bold text-slate-500 uppercase tracking-wide">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 block min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="">Select {label}</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>; }
function EmptyProfile() { return <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">Your academic profile is incomplete. Please contact the administrator.</section>; }
function EmptyTimetable({ heading, isDefault }) { return <div className="p-12 text-center text-slate-500"><p>{isDefault ? 'No published timetable available for your academic group.' : 'No published timetable available for this selection.'}</p>{heading && <p className="mt-2 text-sm">{heading.department.name} · Semester {heading.semester.number} · Division {heading.division.name}</p>}{isDefault && <p className="mt-2 text-sm">Please check with the administrator.</p>}</div>; }
function Schedule({ entries, slots }) { return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-slate-900 text-white"><th className="p-3 text-left">Time</th>{DAYS.map((day) => <th key={day} className="p-3 text-left">{day}</th>)}</tr></thead><tbody>{slots.map((time) => <tr key={time} className="border-t border-slate-100"><td className="p-3 font-bold text-slate-700">{time}</td>{DAYS.map((day) => { const item = entries.find((entry) => entry.day === day && entry.timeSlot === time); return <td key={day} className="p-3 align-top">{BREAK_SLOTS.includes(time) ? <span className="font-bold text-amber-700">BREAK</span> : item ? <ClassCard entry={item} /> : <span className="text-slate-300">—</span>}</td>; })}</tr>)}</tbody></table></div>; }
function ClassCard({ entry }) { const subject = entry.subject || {}; const teacher = entry.teacher || {}; const room = entry.classroom || entry.laboratory || {}; return <div className="space-y-1"><p className="font-bold text-slate-800">{subject.subject_name || subject.name || 'Subject'}</p>{subject.subject_code && <p className="text-xs text-slate-500">{subject.subject_code}{entry.isLab ? ' · Lab' : ''}</p>}<p className="text-xs text-slate-600">{teacher.faculty_name || teacher.name || 'Teacher'}</p><p className="text-xs text-slate-500">{room.roomNumber || room.room_name || room.lab_name || 'Room not assigned'}</p></div>; }
