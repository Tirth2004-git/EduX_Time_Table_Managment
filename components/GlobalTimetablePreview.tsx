'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Eye, 
  Plus, 
  User, 
  Calendar,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useTimetableStore } from '@/lib/store';

interface TimetableEntry {
  _id: string;
  program: string;
  className: string;
  semester: number;
  division: string;
  day: string;
  timeSlot: string;
  status: string;
  classroomId: string | null;
  classroom: {
    program: string;
    className: string;
    semester: number;
    division: string;
    roomNumber?: string;
    year?: string;
  } | null;
  subject: {
    _id: string;
    subject_name: string;
    subject_code: string;
    requiredPeriods: number;
    allottedPeriods: number;
    remainingPeriods: number;
  } | null;
  teacher: {
    _id: string;
    teacherID: string;
    faculty_name: string;
    department: string;
    teaching_hours: number;
    assignedHours: number;
    remainingHours: number;
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
const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];

export default function GlobalTimetablePreview() {
  const {
    setSelectedProgram,
    setSelectedClass,
    setSelectedSemester,
    setSelectedDivision,
    setClassroomId,
  } = useTimetableStore();

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    program: '',
    className: '',
    semester: '',
    division: '',
    teacherId: '',
    subjectId: '',
    day: '',
    timeSlot: '',
  });

  const [showFilters, setShowFilters] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchGlobalTimetable();
  }, [filters]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers');
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchGlobalTimetable = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.program) params.append('program', filters.program);
      if (filters.className) params.append('className', filters.className);
      if (filters.semester) params.append('semester', filters.semester);
      if (filters.division) params.append('division', filters.division);
      if (filters.teacherId) params.append('teacherId', filters.teacherId);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);
      if (filters.day) params.append('day', filters.day);
      if (filters.timeSlot) params.append('timeSlot', filters.timeSlot);

      const response = await fetch(`/api/timetable/global?${params.toString()}`);
      const data = await response.json();
      setTimetable(data.timetable || []);
    } catch (error) {
      console.error('Error fetching global timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      program: '',
      className: '',
      semester: '',
      division: '',
      teacherId: '',
      subjectId: '',
      day: '',
      timeSlot: '',
    });
    setSelectedTeacher('');
    setSelectedTimeSlot('');
    setSelectedDay('');
  };

  const handleShowTimetable = (entry: TimetableEntry) => {
    // Set state in store to open timetable builder
    setSelectedProgram(entry.program);
    setSelectedClass(entry.className);
    setSelectedSemester(entry.semester);
    setSelectedDivision(entry.division);
    if (entry.classroomId) {
      setClassroomId(entry.classroomId);
    }
    
    // Switch to timetable tab (this will be handled by parent)
    // For now, we'll use a custom event or callback
    window.dispatchEvent(new CustomEvent('switchToTimetable'));
  };

  const handleViewTeacherWorkload = (teacher: TimetableEntry['teacher']) => {
    if (!teacher) return;
    const workloadPercent = (teacher.assignedHours / teacher.teaching_hours) * 100;
    alert(
      `Teacher: ${teacher.faculty_name}\n` +
      `Department: ${teacher.department}\n` +
      `Assigned Hours: ${teacher.assignedHours} / ${teacher.teaching_hours}\n` +
      `Remaining Hours: ${teacher.remainingHours}\n` +
      `Workload: ${workloadPercent.toFixed(1)}%`
    );
  };

  const getStatusColor = (status: string, timeSlot: string) => {
    if (BREAK_SLOTS.includes(timeSlot)) {
      return 'bg-gray-300 text-gray-700';
    }
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'conflict':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string, timeSlot: string) => {
    if (BREAK_SLOTS.includes(timeSlot)) {
      return <Clock className="h-4 w-4" />;
    }
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'conflict':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Teacher lecture tracking
  const teacherLectures = selectedTeacher
    ? timetable.filter((entry) => entry.teacher?._id === selectedTeacher)
    : [];

  const filteredByTimeAndDay = selectedTimeSlot && selectedDay
    ? teacherLectures.filter(
        (entry) => entry.timeSlot === selectedTimeSlot && entry.day === selectedDay
      )
    : selectedTimeSlot
    ? teacherLectures.filter((entry) => entry.timeSlot === selectedTimeSlot)
    : selectedDay
    ? teacherLectures.filter((entry) => entry.day === selectedDay)
    : teacherLectures;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Global Timetable Preview</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Panel */}
        {showFilters && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Program Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Program</label>
                  <select
                    value={filters.program}
                    onChange={(e) => handleFilterChange('program', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Programs</option>
                    {PROGRAMS.map((program) => (
                      <option key={program} value={program}>
                        {program}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <select
                    value={filters.className}
                    onChange={(e) => handleFilterChange('className', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Classes</option>
                    {CLASS_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Semester Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Semester</label>
                  <select
                    value={filters.semester}
                    onChange={(e) => handleFilterChange('semester', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Semesters</option>
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Division Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Division</label>
                  <select
                    value={filters.division}
                    onChange={(e) => handleFilterChange('division', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Divisions</option>
                    {DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Teacher</label>
                  <select
                    value={filters.teacherId}
                    onChange={(e) => {
                      handleFilterChange('teacherId', e.target.value);
                      setSelectedTeacher(e.target.value);
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Teachers</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.faculty_name} ({teacher.teacherID})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <select
                    value={filters.subjectId}
                    onChange={(e) => handleFilterChange('subjectId', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.subject_name} ({subject.subject_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Day Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Day</label>
                  <select
                    value={filters.day}
                    onChange={(e) => {
                      handleFilterChange('day', e.target.value);
                      setSelectedDay(e.target.value);
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Days</option>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Slot Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Time Slot</label>
                  <select
                    value={filters.timeSlot}
                    onChange={(e) => {
                      handleFilterChange('timeSlot', e.target.value);
                      setSelectedTimeSlot(e.target.value);
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Time Slots</option>
                    <option value="09:30-10:25">09:30-10:25</option>
                    <option value="10:25-11:20">10:25-11:20</option>
                    <option value="11:20-12:20">11:20-12:20 (Break)</option>
                    <option value="12:20-13:15">12:20-13:15</option>
                    <option value="13:15-14:10">13:15-14:10</option>
                    <option value="14:10-14:30">14:10-14:30 (Break)</option>
                    <option value="14:30-15:25">14:30-15:25</option>
                    <option value="15:25-16:20">15:25-16:20</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Teacher Lecture Tracking */}
            {selectedTeacher && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Teacher Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {teachers.find((t) => t._id === selectedTeacher)?.faculty_name}
                    </div>
                    {selectedTimeSlot && (
                      <div className="text-xs text-gray-600">
                        At {selectedTimeSlot}
                      </div>
                    )}
                    {selectedDay && (
                      <div className="text-xs text-gray-600">
                        On {selectedDay}
                      </div>
                    )}
                    <div className="text-xs text-gray-600">
                      {filteredByTimeAndDay.length} lecture(s) found
                    </div>
                    {filteredByTimeAndDay.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {filteredByTimeAndDay.map((entry) => (
                          <div key={entry._id} className="text-xs p-2 bg-gray-50 rounded">
                            <div className="font-medium">{entry.subject?.subject_name}</div>
                            <div className="text-gray-600">
                              {entry.className} Sem-{entry.semester} {entry.division}
                            </div>
                            {entry.classroom?.roomNumber && (
                              <div className="text-gray-600">Room: {entry.classroom.roomNumber}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Timetable Table */}
        <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <Card>
            <CardHeader>
              <CardTitle>
                Timetable Entries ({timetable.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : timetable.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No timetable entries found. Try adjusting your filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Program</th>
                        <th className="border p-2 text-left">Class</th>
                        <th className="border p-2 text-left">Sem</th>
                        <th className="border p-2 text-left">Div</th>
                        <th className="border p-2 text-left">Teacher</th>
                        <th className="border p-2 text-left">Subject</th>
                        <th className="border p-2 text-left">Day</th>
                        <th className="border p-2 text-left">Time</th>
                        <th className="border p-2 text-left">Room</th>
                        <th className="border p-2 text-left">Status</th>
                        <th className="border p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timetable.map((entry) => (
                        <tr key={entry._id} className="hover:bg-gray-50">
                          <td className="border p-2">{entry.program}</td>
                          <td className="border p-2">{entry.className}</td>
                          <td className="border p-2">{entry.semester}</td>
                          <td className="border p-2">{entry.division}</td>
                          <td className="border p-2">
                            {entry.teacher ? (
                              <div>
                                <div className="font-medium">{entry.teacher.faculty_name}</div>
                                <div className="text-xs text-gray-600">{entry.teacher.teacherID}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border p-2">
                            {entry.subject ? (
                              <div>
                                <div className="font-medium">{entry.subject.subject_name}</div>
                                <div className="text-xs text-gray-600">{entry.subject.subject_code}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border p-2">{entry.day}</td>
                          <td className="border p-2">{entry.timeSlot}</td>
                          <td className="border p-2">
                            {entry.classroom?.roomNumber || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border p-2">
                            <div
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getStatusColor(
                                entry.status,
                                entry.timeSlot
                              )}`}
                            >
                              {getStatusIcon(entry.status, entry.timeSlot)}
                              <span className="text-xs">
                                {BREAK_SLOTS.includes(entry.timeSlot) ? 'BREAK' : entry.status}
                              </span>
                            </div>
                          </td>
                          <td className="border p-2">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShowTimetable(entry)}
                                title="Show Timetable"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              {entry.teacher && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewTeacherWorkload(entry.teacher)}
                                  title="View Teacher Workload"
                                >
                                  <User className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

