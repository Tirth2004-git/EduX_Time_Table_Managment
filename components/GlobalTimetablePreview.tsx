// 'use client';

// import { useEffect, useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Filter, X, Eye, User, BookOpen, Download } from 'lucide-react';
// import { useTimetableStore } from '@/lib/store';
// import { exportTimetableToPDF } from '@/lib/pdf-export';

// interface TimetableEntry {
//   _id: string;
//   program: string;
//   className: string;
//   semester: number;
//   division: string;
//   day: string;
//   timeSlot: string;
//   status: string;
//   subject: {
//     _id: string;
//     subject_name: string;
//     subject_code: string;
//   } | null;
//   teacher: {
//     _id: string;
//     faculty_name: string;
//     teacherID: string;
//     department: string;
//   } | null;
//   classroom: {
//     _id: string;
//     roomNumber: string;
//     building?: string;
//     floor?: string;
//     capacity?: number;
//   } | null;
// }

// interface Teacher {
//   _id: string;
//   teacherID: string;
//   faculty_name: string;
//   department: string;
// }

// interface Subject {
//   _id: string;
//   subject_name: string;
//   subject_code: string;
// }

// const PROGRAMS = [
//   'Information Technology',
//   'Cyber Security',
//   'Computer Science & Technology',
//   'Computer Engineering',
//   'Artificial Intelligence & Data Science',
// ];

// const CLASS_LEVELS = ['FY', 'SY', 'TY'];
// const SEMESTERS = [1, 2, 3, 4, 5, 6];
// const DIVISIONS = ['A', 'B', 'C'];
// const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// const TIME_SLOTS = [
//   '09:30-10:25',
//   '10:25-11:20',
//   '11:20-12:20',
//   '12:20-13:15',
//   '13:15-14:10',
//   '14:10-14:30',
//   '14:30-15:25',
//   '15:25-16:20',
// ];
// const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];

// export default function GlobalTimetablePreview() {
//   const { setSelectedProgram, setSelectedClass, setSelectedSemester, setSelectedDivision } = useTimetableStore();

//   const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
//   const [teachers, setTeachers] = useState<Teacher[]>([]);
//   const [subjects, setSubjects] = useState<Subject[]>([]);
//   const [holidays, setHolidays] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [showFilters, setShowFilters] = useState(true);
//   const [exportingPDF, setExportingPDF] = useState(false);
  
//   const [filters, setFilters] = useState({
//     program: '',
//     className: '',
//     semester: '',
//     division: '',
//     teacherId: '',
//     subjectId: '',
//   });

//   const [viewMode, setViewMode] = useState<'division' | 'teacher' | 'subject'>('division');

//   useEffect(() => {
//     fetchInitialData();
//   }, []);

//   useEffect(() => {
//     fetchTimetable();
//   }, [filters]);

//   const fetchInitialData = async () => {
//     try {
//       const response = await fetch('/api/timetable/preview');
//       const data = await response.json();
//       setTeachers(data.teachers || []);
//       setSubjects(data.subjects || []);
//     } catch (error) {
//       console.error('Error fetching initial data:', error);
//     }
//   };

//   const fetchTimetable = async () => {
//     setLoading(true);
//     try {
//       const params = new URLSearchParams();
//       Object.entries(filters).forEach(([key, value]) => {
//         if (value) params.append(key, value);
//       });

//       const response = await fetch(`/api/timetable/preview?${params.toString()}`);
//       const data = await response.json();
//       setTimetable(data.timetable || []);
//       setHolidays(data.holidays || []);
//     } catch (error) {
//       console.error('Error fetching timetable:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleFilterChange = (key: string, value: string) => {
//     setFilters((prev) => ({ ...prev, [key]: value }));
    
//     // Update view mode based on active filters
//     if (key === 'teacherId' && value) {
//       setViewMode('teacher');
//       // Clear division-specific filters for teacher view
//       setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', subjectId: '' }));
//     } else if (key === 'subjectId' && value) {
//       setViewMode('subject');
//       // Clear division-specific filters for subject view
//       setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', teacherId: '' }));
//     } else if (['program', 'className', 'semester', 'division'].includes(key)) {
//       setViewMode('division');
//       // Clear teacher/subject filters for division view
//       setFilters(prev => ({ ...prev, teacherId: '', subjectId: '' }));
//     }
//   };

//   const clearFilters = () => {
//     setFilters({
//       program: '',
//       className: '',
//       semester: '',
//       division: '',
//       teacherId: '',
//       subjectId: '',
//     });
//     setViewMode('division');
//   };

//   const getEntriesForSlot = (day: string, time: string): TimetableEntry[] => {
//     return timetable.filter(entry => entry.day === day && entry.timeSlot === time);
//   };

//   const isBreakSlot = (time: string) => BREAK_SLOTS.includes(time);
//   const isHoliday = (day: string) => holidays.includes(day);

//   const getCellStyle = (entries: TimetableEntry[]) => {
//     if (entries.length === 0) return 'bg-gray-50';
//     if (entries.some(e => e.status === 'conflict')) return 'bg-red-100';
//     return 'bg-green-100';
//   };

//   const getViewTitle = () => {
//     if (viewMode === 'teacher' && filters.teacherId) {
//       const teacher = teachers.find(t => t._id === filters.teacherId);
//       return `Teacher Schedule - ${teacher?.faculty_name} (${teacher?.teacherID})`;
//     }
//     if (viewMode === 'subject' && filters.subjectId) {
//       const subject = subjects.find(s => s._id === filters.subjectId);
//       return `Subject Schedule - ${subject?.subject_name} (${subject?.subject_code})`;
//     }
//     if (viewMode === 'division' && filters.program && filters.className && filters.semester && filters.division) {
//       return `Division Schedule - ${filters.program} ${filters.className} Sem-${filters.semester} ${filters.division}`;
//     }
//     return 'Select filters to view timetable';
//   };

//   const hasActiveFilters = filters.teacherId || filters.subjectId || 
//     (filters.program && filters.className && filters.semester && filters.division);

//   const handleExportPDF = async () => {
//     if (!hasActiveFilters) {
//       alert('Please select filters first');
//       return;
//     }

//     if (timetable.length === 0) {
//       alert('No timetable data to export');
//       return;
//     }

//     setExportingPDF(true);
//     try {
//       let title = '';
//       let filename = '';

//       if (viewMode === 'teacher' && filters.teacherId) {
//         const teacher = teachers.find(t => t._id === filters.teacherId);
//         title = `Teacher Schedule — ${teacher?.faculty_name} (${teacher?.teacherID})`;
//         filename = `TeacherSchedule_${teacher?.faculty_name.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
//       } else if (viewMode === 'subject' && filters.subjectId) {
//         const subject = subjects.find(s => s._id === filters.subjectId);
//         title = `Subject Schedule — ${subject?.subject_name} (${subject?.subject_code})`;
//         filename = `SubjectSchedule_${subject?.subject_name.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
//       } else {
//         title = `Division Schedule — ${filters.program} ${filters.className} Sem-${filters.semester} ${filters.division}`;
//         filename = `Timetable_${filters.program.replace(/[^a-zA-Z0-9]/g, '')}_${filters.className}_Sem${filters.semester}_${filters.division}.pdf`;
//       }

//       await exportTimetableToPDF({
//         viewMode,
//         title,
//         filename,
//       });

//       alert('Timetable exported successfully!');
//     } catch (error: any) {
//       alert(error.message || 'Failed to export PDF');
//     } finally {
//       setExportingPDF(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h2 className="text-2xl font-bold">Timetable Preview</h2>
//         <div className="flex gap-2">
//           <Button 
//             variant="outline" 
//             onClick={handleExportPDF}
//             disabled={exportingPDF || !hasActiveFilters || timetable.length === 0}
//             className="bg-green-50 hover:bg-green-100 border-green-200"
//           >
//             <Download className="mr-2 h-4 w-4" />
//             {exportingPDF ? 'Preparing PDF...' : 'Download as PDF'}
//           </Button>
//           <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
//             <Filter className="mr-2 h-4 w-4" />
//             {showFilters ? 'Hide' : 'Show'} Filters
//           </Button>
//           <Button variant="outline" onClick={clearFilters}>
//             <X className="mr-2 h-4 w-4" />
//             Clear All
//           </Button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//         {showFilters && (
//           <div className="lg:col-span-1">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Filters</CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 {/* View Mode Selector */}
//                 <div>
//                   <label className="block text-sm font-medium mb-2">View Mode</label>
//                   <div className="flex gap-2">
//                     <Button
//                       size="sm"
//                       variant={viewMode === 'division' ? 'default' : 'outline'}
//                       onClick={() => {
//                         setViewMode('division');
//                         setFilters(prev => ({ ...prev, teacherId: '', subjectId: '' }));
//                       }}
//                     >
//                       Division
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant={viewMode === 'teacher' ? 'default' : 'outline'}
//                       onClick={() => {
//                         setViewMode('teacher');
//                         setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', subjectId: '' }));
//                       }}
//                     >
//                       <User className="mr-1 h-3 w-3" />
//                       Teacher
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant={viewMode === 'subject' ? 'default' : 'outline'}
//                       onClick={() => {
//                         setViewMode('subject');
//                         setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', teacherId: '' }));
//                       }}
//                     >
//                       <BookOpen className="mr-1 h-3 w-3" />
//                       Subject
//                     </Button>
//                   </div>
//                 </div>

//                 {/* Teacher Filter */}
//                 {viewMode === 'teacher' && (
//                   <div>
//                     <label className="block text-sm font-medium mb-1">Teacher</label>
//                     <select
//                       value={filters.teacherId}
//                       onChange={(e) => handleFilterChange('teacherId', e.target.value)}
//                       className="w-full p-2 border rounded-md"
//                     >
//                       <option value="">Select Teacher...</option>
//                       {teachers.map((teacher) => (
//                         <option key={teacher._id} value={teacher._id}>
//                           {teacher.faculty_name} ({teacher.teacherID})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 )}

//                 {/* Subject Filter */}
//                 {viewMode === 'subject' && (
//                   <div>
//                     <label className="block text-sm font-medium mb-1">Subject</label>
//                     <select
//                       value={filters.subjectId}
//                       onChange={(e) => handleFilterChange('subjectId', e.target.value)}
//                       className="w-full p-2 border rounded-md"
//                     >
//                       <option value="">Select Subject...</option>
//                       {subjects.map((subject) => (
//                         <option key={subject._id} value={subject._id}>
//                           {subject.subject_name} ({subject.subject_code})
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 )}

//                 {/* Division Filters */}
//                 {viewMode === 'division' && (
//                   <>
//                     <div>
//                       <label className="block text-sm font-medium mb-1">Program</label>
//                       <select
//                         value={filters.program}
//                         onChange={(e) => handleFilterChange('program', e.target.value)}
//                         className="w-full p-2 border rounded-md"
//                       >
//                         <option value="">Select Program...</option>
//                         {PROGRAMS.map((program) => (
//                           <option key={program} value={program}>
//                             {program}
//                           </option>
//                         ))}
//                       </select>
//                     </div>

//                     {filters.program && (
//                       <div>
//                         <label className="block text-sm font-medium mb-1">Class</label>
//                         <select
//                           value={filters.className}
//                           onChange={(e) => handleFilterChange('className', e.target.value)}
//                           className="w-full p-2 border rounded-md"
//                         >
//                           <option value="">Select Class...</option>
//                           {CLASS_LEVELS.map((level) => (
//                             <option key={level} value={level}>
//                               {level}
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                     )}

//                     {filters.program && filters.className && (
//                       <div>
//                         <label className="block text-sm font-medium mb-1">Semester</label>
//                         <select
//                           value={filters.semester}
//                           onChange={(e) => handleFilterChange('semester', e.target.value)}
//                           className="w-full p-2 border rounded-md"
//                         >
//                           <option value="">Select Semester...</option>
//                           {SEMESTERS.map((sem) => (
//                             <option key={sem} value={sem}>
//                               {sem}
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                     )}

//                     {filters.program && filters.className && filters.semester && (
//                       <div>
//                         <label className="block text-sm font-medium mb-1">Division</label>
//                         <select
//                           value={filters.division}
//                           onChange={(e) => handleFilterChange('division', e.target.value)}
//                           className="w-full p-2 border rounded-md"
//                         >
//                           <option value="">Select Division...</option>
//                           {DIVISIONS.map((div) => (
//                             <option key={div} value={div}>
//                               {div}
//                             </option>
//                           ))}
//                         </select>
//                       </div>
//                     )}
//                   </>
//                 )}

//                 {/* Active Filter Summary */}
//                 {hasActiveFilters && (
//                   <div className="mt-4 p-3 bg-blue-50 rounded-md">
//                     <div className="text-sm">
//                       <strong>Viewing:</strong> {getViewTitle()}
//                     </div>
//                     {timetable.length > 0 && (
//                       <div className="text-xs text-blue-600 mt-1">
//                         {timetable.length} lecture(s) found
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </div>
//         )}

//         <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
//           <Card>
//             <CardHeader>
//               <CardTitle>{getViewTitle()}</CardTitle>
//             </CardHeader>
//             <CardContent>
//               {!hasActiveFilters ? (
//                 <div className="text-center py-12 text-gray-500">
//                   <div className="text-lg mb-2">📅 No Filter Selected</div>
//                   <div>Choose a view mode and select filters to view the timetable</div>
//                 </div>
//               ) : loading ? (
//                 <div className="text-center py-8">Loading timetable...</div>
//               ) : (
//                 <div id="timetable-export-container" className="w-full">
//                   <div className="w-full overflow-hidden">
//                     <table className="w-full border-collapse table-fixed">
//                       <thead>
//                         <tr>
//                           <th className="border p-2 bg-gray-100 font-semibold w-[10%]">Time</th>
//                           {DAYS.map((day) => (
//                             <th key={day} className="border p-2 bg-gray-100 font-semibold w-[15%]">
//                               {day}
//                               {isHoliday(day) && (
//                                 <div className="text-xs text-red-600 font-normal">HOLIDAY</div>
//                               )}
//                             </th>
//                           ))}
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {TIME_SLOTS.map((time) => (
//                           <tr key={time}>
//                             <td className="border p-2 bg-gray-50 font-medium text-sm w-[10%]">{time}</td>
//                             {DAYS.map((day) => {
//                               const entries = getEntriesForSlot(day, time);
//                               const isBreak = isBreakSlot(time);
//                               const isHolidayDay = isHoliday(day);
                              
//                               return (
//                                 <td
//                                   key={`${day}-${time}`}
//                                   className={`border p-2 w-[15%] ${
//                                     isHolidayDay ? 'bg-red-100 border-red-200' :
//                                     isBreak ? 'bg-gray-300' :
//                                     getCellStyle(entries)
//                                   }`}
//                                 >
//                                   {isHolidayDay ? (
//                                     <div className="text-center py-2">
//                                       <div className="text-red-800 font-bold text-sm">🚫 HOLIDAY</div>
//                                       <div className="text-xs text-red-600">No Lectures</div>
//                                     </div>
//                                   ) : isBreak ? (
//                                     <div className="text-center py-2">
//                                       <div className="text-gray-700 font-bold text-sm">BREAK</div>
//                                     </div>
//                                   ) : entries.length > 0 ? (
//                                     <div className="space-y-2">
//                                       {entries.map((entry, index) => (
//                                         <div key={entry._id} className={`${index > 0 ? 'border-t border-gray-300 pt-2' : ''}`}>
//                                           {/* Class Tag */}
//                                           {viewMode !== 'division' && (
//                                             <div className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded mb-1">
//                                               {entry.className}-{entry.division} | Sem-{entry.semester}
//                                             </div>
//                                           )}
                                          
//                                           {/* Subject Name */}
//                                           {entry.subject && (
//                                             <div className="font-semibold text-sm">
//                                               {entry.subject.subject_name}
//                                             </div>
//                                           )}
                                          
//                                           {/* Teacher Name */}
//                                           {entry.teacher && viewMode !== 'teacher' && (
//                                             <div className="text-xs text-gray-600">
//                                               {entry.teacher.faculty_name}
//                                             </div>
//                                           )}
                                          
//                                           {/* Classroom */}
//                                           <div className="text-xs text-gray-500 mt-1">
//                                             {entry.classroom ? (
//                                               <span>Room: {entry.classroom.roomNumber}</span>
//                                             ) : (
//                                               <span className="text-gray-400">No classroom assigned</span>
//                                             )}
//                                           </div>
//                                         </div>
//                                       ))}
//                                     </div>
//                                   ) : (
//                                     <div className="text-center py-2">
//                                       <div className="text-gray-400 text-xs">No Lectures</div>
//                                     </div>
//                                   )}
//                                 </td>
//                               );
//                             })}
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }



'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X, Eye, User, BookOpen, Download } from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { exportTimetableToPDF } from '@/lib/pdf-export';

interface TimetableEntry {
  _id: string;
  program: string;
  className: string;
  semester: number;
  division: string;
  day: string;
  timeSlot: string;
  status: string;
  subject: {
    _id: string;
    subject_name: string;
    subject_code: string;
  } | null;
  teacher: {
    _id: string;
    faculty_name: string;
    teacherID: string;
    department: string;
  } | null;
  classroom: {
    _id: string;
    roomNumber: string;
    building?: string;
    floor?: string;
    capacity?: number;
  } | null;
}

interface Teacher {
  _id: string;
  teacherID: string;
  faculty_name: string;
  department: string;
}

interface Subject {
  _id: string;
  subject_name: string;
  subject_code: string;
}

const PROGRAMS = [
  'Information Technology',
  'Cyber Security',
  'Computer Science & Technology',
  'Computer Engineering',
  'Artificial Intelligence & Data Science',
];

const CLASS_LEVELS = ['FY', 'SY', 'TY'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];
const DIVISIONS = ['A', 'B', 'C'];
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

export default function GlobalTimetablePreview() {
  const { setSelectedProgram, setSelectedClass, setSelectedSemester, setSelectedDivision } = useTimetableStore();

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  
  const [filters, setFilters] = useState({
    program: '',
    className: '',
    semester: '',
    division: '',
    teacherId: '',
    subjectId: '',
  });

  const [viewMode, setViewMode] = useState<'division' | 'teacher' | 'subject'>('division');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/timetable/preview');
      const data = await response.json();
      setTeachers(data.teachers || []);
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/timetable/preview?${params.toString()}`);
      const data = await response.json();
      setTimetable(data.timetable || []);
      setHolidays(data.holidays || []);
    } catch (error) {
      console.error('Error fetching timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    
    // Update view mode based on active filters
    if (key === 'teacherId' && value) {
      setViewMode('teacher');
      // Clear division-specific filters for teacher view
      setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', subjectId: '' }));
    } else if (key === 'subjectId' && value) {
      setViewMode('subject');
      // Clear division-specific filters for subject view
      setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', teacherId: '' }));
    } else if (['program', 'className', 'semester', 'division'].includes(key)) {
      setViewMode('division');
      // Clear teacher/subject filters for division view
      setFilters(prev => ({ ...prev, teacherId: '', subjectId: '' }));
    }
  };

  const clearFilters = () => {
    setFilters({
      program: '',
      className: '',
      semester: '',
      division: '',
      teacherId: '',
      subjectId: '',
    });
    setViewMode('division');
  };

  const getEntriesForSlot = (day: string, time: string): TimetableEntry[] => {
    return timetable.filter(entry => entry.day === day && entry.timeSlot === time);
  };

  const isBreakSlot = (time: string) => BREAK_SLOTS.includes(time);
  const isHoliday = (day: string) => holidays.includes(day);

  const getCellStyle = (entries: TimetableEntry[]) => {
    if (entries.length === 0) return 'bg-gray-50';
    if (entries.some(e => e.status === 'conflict')) return 'bg-red-100';
    return 'bg-green-100';
  };

  const getViewTitle = () => {
    if (viewMode === 'teacher' && filters.teacherId) {
      const teacher = teachers.find(t => t._id === filters.teacherId);
      return `Teacher Schedule - ${teacher?.faculty_name} (${teacher?.teacherID})`;
    }
    if (viewMode === 'subject' && filters.subjectId) {
      const subject = subjects.find(s => s._id === filters.subjectId);
      return `Subject Schedule - ${subject?.subject_name} (${subject?.subject_code})`;
    }
    if (viewMode === 'division' && filters.program && filters.className && filters.semester && filters.division) {
      return `Division Schedule - ${filters.program} ${filters.className} Sem-${filters.semester} ${filters.division}`;
    }
    return 'Select filters to view timetable';
  };

  const hasActiveFilters = filters.teacherId || filters.subjectId || 
    (filters.program && filters.className && filters.semester && filters.division);

  const handleExportPDF = async () => {
    if (!hasActiveFilters) {
      alert('Please select filters first');
      return;
    }

    if (timetable.length === 0) {
      alert('No timetable data to export');
      return;
    }

    setExportingPDF(true);
    try {
      let title = '';
      let filename = '';

      if (viewMode === 'teacher' && filters.teacherId) {
        const teacher = teachers.find(t => t._id === filters.teacherId);
        title = `Teacher Schedule — ${teacher?.faculty_name} (${teacher?.teacherID})`;
        filename = `TeacherSchedule_${teacher?.faculty_name.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
      } else if (viewMode === 'subject' && filters.subjectId) {
        const subject = subjects.find(s => s._id === filters.subjectId);
        title = `Subject Schedule — ${subject?.subject_name} (${subject?.subject_code})`;
        filename = `SubjectSchedule_${subject?.subject_name.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
      } else {
        title = `Division Schedule — ${filters.program} ${filters.className} Sem-${filters.semester} ${filters.division}`;
        filename = `Timetable_${filters.program.replace(/[^a-zA-Z0-9]/g, '')}_${filters.className}_Sem${filters.semester}_${filters.division}.pdf`;
      }

      await exportTimetableToPDF({
        viewMode,
        title,
        filename,
      });

      alert('Timetable exported successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header Section */}
      <div className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Timetable Preview</h1>
              <p className="text-sm text-slate-600 mt-1">Manage and view class schedules</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleExportPDF}
                disabled={exportingPDF || !hasActiveFilters || timetable.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportingPDF ? 'Preparing...' : 'Download PDF'}
              </Button>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="border-slate-300 hover:bg-slate-50 text-slate-900 bg-transparent"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section - Horizontal Layout */}
      <div className="border-b border-slate-200 bg-white">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-4">
            {/* View Mode Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">View Mode</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setViewMode('division');
                    setFilters(prev => ({ ...prev, teacherId: '', subjectId: '' }));
                  }}
                  className={`transition-all ${
                    viewMode === 'division'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-900 border border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  Division
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setViewMode('teacher');
                    setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', subjectId: '' }));
                  }}
                  className={`transition-all ${
                    viewMode === 'teacher'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-900 border border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <User className="mr-1 h-4 w-4" />
                  Teacher
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setViewMode('subject');
                    setFilters(prev => ({ ...prev, program: '', className: '', semester: '', division: '', teacherId: '' }));
                  }}
                  className={`transition-all ${
                    viewMode === 'subject'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-900 border border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <BookOpen className="mr-1 h-4 w-4" />
                  Subject
                </Button>
              </div>
            </div>

            {/* Dynamic Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Teacher Filter */}
              {viewMode === 'teacher' && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Teacher</label>
                  <select
                    value={filters.teacherId}
                    onChange={(e) => handleFilterChange('teacherId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="">Select Teacher...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.faculty_name} ({teacher.teacherID})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject Filter */}
              {viewMode === 'subject' && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Subject</label>
                  <select
                    value={filters.subjectId}
                    onChange={(e) => handleFilterChange('subjectId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.subject_name} ({subject.subject_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Division Filters */}
              {viewMode === 'division' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-2">Program</label>
                    <select
                      value={filters.program}
                      onChange={(e) => handleFilterChange('program', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="">Select Program...</option>
                      {PROGRAMS.map((program) => (
                        <option key={program} value={program}>
                          {program}
                        </option>
                      ))}
                    </select>
                  </div>

                  {filters.program && (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Class</label>
                      <select
                        value={filters.className}
                        onChange={(e) => handleFilterChange('className', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      >
                        <option value="">Select Class...</option>
                        {CLASS_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filters.program && filters.className && (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Semester</label>
                      <select
                        value={filters.semester}
                        onChange={(e) => handleFilterChange('semester', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      >
                        <option value="">Select Semester...</option>
                        {SEMESTERS.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filters.program && filters.className && filters.semester && (
                    <div>
                      <label className="block text-sm font-medium text-slate-900 mb-2">Division</label>
                      <select
                        value={filters.division}
                        onChange={(e) => handleFilterChange('division', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      >
                        <option value="">Select Division...</option>
                        {DIVISIONS.map((div) => (
                          <option key={div} value={div}>
                            {div}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Active Filter Summary */}
            {hasActiveFilters && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {getViewTitle()}
                    </p>
                    {timetable.length > 0 && (
                      <p className="text-xs text-blue-700 mt-1">
                        {timetable.length} lecture(s) found
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {!hasActiveFilters ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16 px-6">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Filter Selected</h3>
              <p className="text-slate-600">Choose a view mode and select filters to view the timetable</p>
            </div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-600 mt-4">Loading timetable...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div id="timetable-export-container" className="w-full">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                      {DAYS.map((day) => (
                        <th key={day} className="px-4 py-3 text-left text-sm font-semibold min-w-[140px]">
                          <div>{day}</div>
                          {isHoliday(day) && (
                            <div className="text-xs font-normal text-red-300 mt-1">HOLIDAY</div>
                          )}
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
                          const isHolidayDay = isHoliday(day);
                          
                          return (
                            <td
                              key={`${day}-${time}`}
                              className={`px-4 py-3 border-r border-slate-200 min-w-[140px] ${
                                isHolidayDay ? 'bg-red-50 border-r border-slate-200' :
                                isBreak ? 'bg-amber-50 border-r border-slate-200' :
                                entries.some(e => e.status === 'conflict') ? 'bg-red-50 border-r border-slate-200' :
                                entries.length > 0 ? 'bg-blue-50 border-r border-slate-200' :
                                'border-r border-slate-200'
                              }`}
                            >
                              {isHolidayDay ? (
                                <div className="text-center">
                                  <div className="text-red-700 font-bold text-sm">🚫 HOLIDAY</div>
                                  <div className="text-xs text-red-600">No Lectures</div>
                                </div>
                              ) : isBreak ? (
                                <div className="text-center">
                                  <div className="text-amber-700 font-bold text-sm">BREAK</div>
                                </div>
                              ) : entries.length > 0 ? (
                                <div className="space-y-2">
                                  {entries.map((entry, index) => (
                                    <div key={entry._id} className={`${index > 0 ? 'border-t border-slate-200 pt-2' : ''} text-xs`}>
                                      {/* Class Tag */}
                                      {viewMode !== 'division' && (
                                        <div className="text-xs font-bold text-blue-900 bg-blue-200 px-2 py-1 rounded mb-1 inline-block">
                                          {entry.className}-{entry.division} | Sem-{entry.semester}
                                        </div>
                                      )}
                                      
                                      {/* Subject Name */}
                                      {entry.subject && (
                                        <div className="font-semibold text-slate-900 text-sm">
                                          {entry.subject.subject_name}
                                        </div>
                                      )}
                                      
                                      {/* Teacher Name */}
                                      {entry.teacher && viewMode !== 'teacher' && (
                                        <div className="text-xs text-slate-600">
                                          👨‍🏫 {entry.teacher.faculty_name}
                                        </div>
                                      )}
                                      
                                      {/* Classroom */}
                                      <div className="text-xs text-slate-500 mt-1">
                                        {entry.classroom ? (
                                          <span>📍 Room: {entry.classroom.roomNumber}</span>
                                        ) : (
                                          <span className="text-slate-400">No room assigned</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="text-slate-400 text-xs">—</div>
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
        )}
      </div>
    </div>
  );
}

