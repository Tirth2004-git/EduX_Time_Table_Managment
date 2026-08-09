import { useEffect, useState, useCallback } from 'react';
import timetableApi from '@/services/api/timetableApi';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '09:30-10:25',
  '10:25-11:20',
  '11:20-12:20',
  '12:20-13:15',
  '13:15-14:10',
  '14:10-14:30',
  '14:30-15:25',
  '15:25-16:20',
];
const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];

export default function StudentTimetablePreview({ studentId }) {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTimetable = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await timetableApi.getStudentTimetable(studentId);
      const mappedEntries = (response.data.entries || []).map(e => ({
        _id: e._id,
        day: e.day,
        timeSlot: e.period,
        status: e.status,
        slot_type: e.type,
        subjectId: e.subject_id,
        teacherId: e.teacher_id,
        classroomId: e.room_id,
        isLab: e.type === 'LAB'
      }));
      setTimetable(mappedEntries);
    } catch (err) {
      console.error('Error fetching student timetable:', err);
      setError(err.response?.data?.error || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const getEntriesForSlot = (day, time) => {
    return timetable.filter(entry => entry.day === day && entry.timeSlot === time);
  };

  const isBreakSlot = (time) => BREAK_SLOTS.includes(time);

  if (!studentId) {
    return (
      <div className="px-4 py-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Student Not Configured</h3>
          <p className="text-slate-600">Your student account is not properly configured.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 mt-4">Loading your timetable...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-8 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (timetable.length === 0) {
    return (
      <div className="px-4 py-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No timetable generated for your division yet.</h3>
          <p className="text-slate-600">Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-sans">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                  {DAYS.map((day) => (
                    <th key={day} className="px-4 py-3 text-left text-sm font-semibold min-w-[140px]">
                      <div>{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, idx) => (
                  <tr key={time} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 font-semibold text-sm text-slate-900 border-r border-slate-200">{time}</td>
                    {DAYS.map((day) => {
                      const entries = getEntriesForSlot(day, time);
                      const isBreak = isBreakSlot(time);
                      
                      return (
                        <td
                          key={`${day}-${time}`}
                          className={`px-4 py-3 border-r border-slate-200 min-w-[140px] ${
                            isBreak ? 'bg-amber-50 border-r border-slate-200' :
                            entries.length > 0 ? 'bg-blue-50 border-r border-slate-200' :
                            'border-r border-slate-200'
                          }`}
                        >
                          {isBreak ? (
                            <div className="text-center">
                              <div className="text-amber-700 font-bold text-sm">BREAK</div>
                            </div>
                          ) : entries.length > 0 ? (
                            <div className="space-y-2">
                              {entries.map((entry, index) => (
                                <div key={entry._id || index} className={`${index > 0 ? 'border-t border-slate-200 pt-2' : ''} text-xs`}>
                                  
                                  {/* Subject Name */}
                                  {entry.subject_id && (
                                    <div className="font-semibold text-slate-900 text-sm">
                                      {entry.subject_id.subject_name}
                                    </div>
                                  )}
                                  
                                  {/* Teacher Name */}
                                  {entry.teacher_id && (
                                    <div className="text-xs text-slate-600 mt-1">
                                      👨‍🏫 {entry.teacher_id.faculty_name || entry.teacher_id.name || entry.teacher_id.email || 'Unknown Teacher'}
                                    </div>
                                  )}
                                  
                                  {/* Classroom */}
                                  <div className="text-xs text-slate-500 mt-1">
                                    {entry.room_id ? (
                                      <span>🏫 Room: {entry.room_id.roomNumber}</span>
                                    ) : entry.lab_id ? (
                                      <span>🧪 Lab: {entry.lab_id.roomNumber || entry.lab_id.labName}</span>
                                    ) : (
                                      <span className="text-slate-400">No room assigned</span>
                                    )}
                                  </div>

                                  {/* Time Slot display just to be explicit if needed */}
                                  <div className="text-[10px] text-slate-400 mt-1">
                                    ⏱️ {time}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-slate-400 text-xs">-</div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
