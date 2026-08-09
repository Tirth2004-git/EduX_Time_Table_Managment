import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Download, RefreshCw, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import timetableApi from '@/services/api/timetableApi';
import { exportTimetableToPDF } from '@/utils/pdfExport';
import { exportTimetableToExcel } from '@/utils/excelExport';
import { exportTimetableToCSV } from '@/utils/csvExport';
import { showToast, ToastContainer } from '@/components/ui/toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];
const TIME_SLOTS = [
  '09:30-10:25',
  '10:25-11:20',
  '11:20-12:20', // Recess
  '12:20-13:15',
  '13:15-14:10',
  '14:10-14:30', // Short Break
  '14:30-15:25',
  '15:25-16:20',
];

export default function SharedTimetable() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const fetchSharedTimetable = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await timetableApi.getShared(token);
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired shared link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedTimetable();
  }, [token]);

  const getEntryForSlot = (day, time) => {
    if (!data?.timetable) return null;
    return data.timetable.find((entry) => entry.day === day && entry.timeSlot === time);
  };

  const handleExportPDF = async () => {
    if (!data) return;
    setExportingPDF(true);
    try {
      await exportTimetableToPDF({
        viewMode: 'class',
        title: `Weekly Timetable — ${data.program} ${data.className} Sem-${data.semester} Div-${data.division}`,
        filename: `Shared_Timetable_${data.program.replace(/[^a-zA-Z0-9]/g, '')}_${data.className}_Sem${data.semester}_${data.division}.pdf`,
      });
      showToast('Timetable PDF exported successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export PDF', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    setExportingExcel(true);
    try {
      await exportTimetableToExcel({
        title: `Weekly Timetable — ${data.program} ${data.className} Sem-${data.semester} Div-${data.division}`,
        filename: `Shared_Timetable_${data.program.replace(/[^a-zA-Z0-9]/g, '')}_${data.className}_Sem${data.semester}_${data.division}.xlsx`,
        days: DAYS,
        timeSlots: TIME_SLOTS,
        timetable: data.timetable,
      });
      showToast('Excel exported successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export Excel', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportCSV = async () => {
    if (!data) return;
    setExportingCSV(true);
    try {
      await exportTimetableToCSV({
        title: `Weekly Timetable — ${data.program} ${data.className} Sem-${data.semester} Div-${data.division}`,
        filename: `Shared_Timetable_${data.program.replace(/[^a-zA-Z0-9]/g, '')}_${data.className}_Sem${data.semester}_${data.division}.csv`,
        days: DAYS,
        timeSlots: TIME_SLOTS,
        timetable: data.timetable,
      });
      showToast('CSV exported successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      setExportingCSV(false);
    }
  };

  const isBreakSlot = (time) => BREAK_SLOTS.includes(time);
  const isHoliday = (day) => data?.holidays?.includes(day);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Retrieving shared timetable…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center font-sans p-6">
        <div className="bg-white rounded-2xl border border-red-100 shadow-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Shared Link Unreachable</h1>
          <p className="text-sm text-slate-500 leading-relaxed">{error}</p>
          <p className="text-xs text-slate-400">The link might have expired, or the sharing token is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 md:p-8 space-y-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Block */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Shared Timetable View</h1>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Read Only</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.program} · {data.className} Sem-{data.semester} Division {data.division}
              </p>
            </div>
          </div>

          {/* Export Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export PDF
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Export Excel
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exportingCSV}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingCSV ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export CSV
            </button>
          </div>
        </div>

        {/* Timetable Grid Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-blue-100 w-28 sticky left-0 bg-blue-600 z-10">
                    Time
                  </th>
                  {DAYS.map((day) => (
                    <th key={day} className="px-3 py-3 text-center text-xs font-semibold text-white min-w-[140px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {TIME_SLOTS.map((time) => {
                  const isBreak = isBreakSlot(time);
                  return (
                    <tr key={time} className={isBreak ? 'bg-slate-50/50' : 'hover:bg-blue-50/10'}>
                      {/* Time Slot Column */}
                      <td className="px-3 py-3 font-semibold text-slate-700 bg-slate-50 border-r border-blue-50 sticky left-0 z-10 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>{time}</span>
                      </td>

                      {/* Day Columns */}
                      {DAYS.map((day) => {
                        const isHolidayDay = isHoliday(day);
                        const entry = getEntryForSlot(day, time);

                        if (isBreak) {
                          return (
                            <td key={`${day}-${time}`} className="border-l border-blue-50 px-2 py-2 text-center">
                              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Break</span>
                            </td>
                          );
                        }

                        if (isHolidayDay) {
                          return (
                            <td key={`${day}-${time}`} className="border-l border-blue-50 px-2 py-2">
                              <div className="flex flex-col items-center justify-center py-1.5 rounded-lg bg-red-50 border border-red-100">
                                <span className="text-xs font-semibold text-red-500">Holiday</span>
                              </div>
                            </td>
                          );
                        }

                        // Check if this slot is the second half of a 2-hour lab slot
                        const currentIdx = TIME_SLOTS.indexOf(time);
                        if (currentIdx > 0) {
                          const prevTime = TIME_SLOTS[currentIdx - 1];
                          const prevEntry = getEntryForSlot(day, prevTime);
                          if (prevEntry && prevEntry.isLab && entry && prevEntry._id === entry._id) {
                            return null;
                          }
                        }

                        const rowSpan = (entry && entry.isLab) ? 2 : 1;

                        return (
                          <td
                            key={cellId}
                            id={cellId}
                            rowSpan={rowSpan}
                            data-holiday={isHolidayDay}
                            className={`border-l border-slate-100 p-2 relative ${
                              entry ? 'bg-[#F8FAFC]' : 'bg-white'
                            }`}
                          >
                            {entry ? (
                              <div className={`rounded-lg bg-white border ${entry.isLab ? 'border-purple-300' : 'border-green-200'} shadow-sm px-2.5 py-2 space-y-1`}>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-slate-700 leading-tight line-clamp-2">
                                    {entry.subjectId?.subject_name || 'No subject'}
                                  </p>
                                  {entry.isLab && (
                                    <span className="text-[9px] font-bold bg-purple-100 text-purple-600 px-1 rounded uppercase">
                                      Lab
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-blue-500 truncate">
                                  {entry.teacherId?.faculty_name || 'No teacher'}
                                </p>
                                {entry.classroomId?.roomNumber && (
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    Room: {entry.classroomId.roomNumber}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="h-8" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
