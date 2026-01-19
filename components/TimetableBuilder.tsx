'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, AlertTriangle, Save, Trash2, Calendar, Sparkles, RefreshCw, Download } from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { showToast } from '@/components/ui/toast';
import { exportTimetableToPDF } from '@/lib/pdf-export';

interface TimetableEntry {
  _id: string;
  program: string;
  className: string;
  semester: number;
  division: string;
  day: string;
  timeSlot: string;
  subjectId: {
    _id: string;
    subject_name: string;
    subject_code: string;
    requiredPeriods: number;
    allottedPeriods: number;
    remainingPeriods: number;
  };
  teacherId: {
    _id: string;
    teacherID: string;
    faculty_name: string;
    department: string;
    teaching_hours: number;
    assignedHours: number;
    remainingHours: number;
  };
  status: string;
}

interface Classroom {
  _id: string;
  program: string;
  className: string;
  semester: number;
  division: string;
  year?: string;
  roomNumber?: string;
}

interface Subject {
  _id: string;
  subject_name: string;
  subject_code: string;
  teacherId: {
    _id: string;
    teacherID: string;
    faculty_name: string;
    department: string;
  } | null;
  requiredPeriods: number;
  allottedPeriods: number;
  remainingPeriods: number;
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday','Saturday'];
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

// Break time slots that cannot be selected
const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];

export default function TimetableBuilder() {
  // Persistent state from store
  const {
    selectedProgram,
    selectedClass,
    selectedSemester,
    selectedDivision,
    classroomId,
    timetable,
    selectedSlot,
    selectedSubject,
    conflicts,
    warnings,
    setSelectedProgram,
    setSelectedClass,
    setSelectedSemester,
    setSelectedDivision,
    setClassroomId,
    setTimetable,
    setSelectedSlot,
    setSelectedSubject,
    setConflicts,
    setWarnings,
    restoreTimetableState,
  } = useTimetableStore();

  // Local component state (not persisted)
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenerateResult, setAutoGenerateResult] = useState<any>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await fetch('/api/classrooms');
      const data = await response.json();
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  const fetchTimetable = useCallback(async () => {
    if (!selectedProgram || !selectedClass || !selectedSemester || !selectedDivision) return;
    try {
      const response = await fetch(
        `/api/timetable/list?program=${encodeURIComponent(selectedProgram)}&className=${selectedClass}&semester=${selectedSemester}&division=${selectedDivision}`
      );
      const data = await response.json();
      setTimetable(data.timetable || []);
      
      // Fetch saved holidays from WeeklyConfig
      const configResponse = await fetch(
        `/api/timetable/weekly-config?program=${encodeURIComponent(selectedProgram)}&className=${selectedClass}&semester=${selectedSemester}&division=${selectedDivision}`
      );
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setHolidays(configData.holidays || []);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    }
  }, [selectedProgram, selectedClass, selectedSemester, selectedDivision]);

  useEffect(() => {
    // Restore state on mount
    restoreTimetableState();
    fetchSubjects();
    fetchClassrooms();
  }, [restoreTimetableState]);

  useEffect(() => {
    if (selectedProgram && selectedClass && selectedSemester && selectedDivision) {
      fetchTimetable();
    } else {
      setTimetable([]);
    }
  }, [selectedProgram, selectedClass, selectedSemester, selectedDivision, fetchTimetable]);

  const handleSlotClick = (day: string, time: string) => {
    // Prevent selecting break slots
    if (BREAK_SLOTS.includes(time)) {
      return;
    }
    // Prevent selecting holiday days
    if (holidays.includes(day)) {
      return;
    }
    setSelectedSlot({ day, time });
    setConflicts([]);
    setWarnings([]);
  };

  const isBreakSlot = (time: string) => {
    return BREAK_SLOTS.includes(time);
  };

  const isHoliday = (day: string) => {
    return holidays.includes(day);
  };

  const toggleHoliday = async (day: string) => {
    const isCurrentlyHoliday = holidays.includes(day);
    
    if (!isCurrentlyHoliday) {
      // Check if day has existing entries
      const dayEntries = timetable.filter(entry => entry.day === day);
      
      if (dayEntries.length > 0) {
        const subjects = [...new Set(dayEntries.map(e => e.subjectId?.subject_name).filter(Boolean))];
        const teachers = [...new Set(dayEntries.map(e => e.teacherId?.faculty_name).filter(Boolean))];
        
        const confirmed = confirm(
          `This day already contains ${dayEntries.length} scheduled lecture(s):\n\n` +
          `Subjects: ${subjects.join(', ')}\n` +
          `Teachers: ${teachers.join(', ')}\n\n` +
          `Marking it as a holiday will permanently delete all timetable entries for this day.\n\n` +
          `Teacher workloads and subject periods will be automatically recalculated.\n\n` +
          `Do you want to continue?`
        );
        
        if (!confirmed) {
          return;
        }
      }
      
      // Set holiday
      setLoading(true);
      try {
        const response = await fetch('/api/timetable/set-holiday', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            program: selectedProgram,
            className: selectedClass,
            semester: selectedSemester,
            division: selectedDivision,
            day,
            action: 'set',
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          alert(data.error || 'Failed to set holiday');
          setLoading(false);
          return;
        }
        
        // Update holidays state
        setHolidays([...holidays, day]);
        
        // Refresh timetable and subjects
        await fetchTimetable();
        await fetchSubjects();
        
        // Clear selected slot if it was on this day
        if (selectedSlot?.day === day) {
          setSelectedSlot(null);
          setSelectedSubject('');
        }
        
        alert(
          `Holiday applied successfully!\n\n` +
          `${data.deletedEntries} lecture(s) cleared from ${day}.\n\n` +
          `All workloads have been recalculated automatically.`
        );
        
        setLoading(false);
      } catch (error: any) {
        alert('Error setting holiday: ' + (error.message || 'Unknown error'));
        setLoading(false);
      }
    } else {
      // Remove holiday
      const confirmed = confirm(
        `Remove holiday status from ${day}?\n\n` +
        `The day will become available for scheduling again.\n` +
        `Previously deleted lectures will NOT be restored.`
      );
      
      if (!confirmed) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/timetable/set-holiday', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            program: selectedProgram,
            className: selectedClass,
            semester: selectedSemester,
            division: selectedDivision,
            day,
            action: 'remove',
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          alert(data.error || 'Failed to remove holiday');
          setLoading(false);
          return;
        }
        
        // Update holidays state
        setHolidays(holidays.filter(h => h !== day));
        
        alert(`Holiday removed from ${day}. Day is now available for scheduling.`);
        setLoading(false);
      } catch (error: any) {
        alert('Error removing holiday: ' + (error.message || 'Unknown error'));
        setLoading(false);
      }
    }
  };

  const handleSaveTimetable = async () => {
    if (!selectedProgram || !selectedClass || !selectedSemester || !selectedDivision) {
      showToast('Please select program, class, semester, and division', 'error');
      return;
    }

    setSaving(true);
    setConflicts([]);
    setWarnings([]);

    try {
      const response = await fetch('/api/timetable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: selectedProgram,
          className: selectedClass,
          semester: selectedSemester,
          division: selectedDivision,
          holidays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setConflicts(data.errors || [data.error]);
        if (data.warnings) {
          setWarnings(data.warnings);
        }
        showToast(data.error || 'Failed to save timetable', 'error');
        setSaving(false);
        return;
      }

      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      showToast('Timetable saved successfully!', 'success');
      setSaving(false);
    } catch (error: any) {
      showToast(error.message || 'An error occurred while saving', 'error');
      setSaving(false);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedProgram || !selectedClass || !selectedSemester || !selectedDivision || !selectedSlot || !selectedSubject) {
      alert('Please select program, class, semester, division, time slot, and subject');
      return;
    }

    // Prevent adding entries to break slots
    if (isBreakSlot(selectedSlot.time)) {
      alert('Cannot add entries to break time slots');
      setConflicts(['Break time slots cannot be scheduled']);
      return;
    }

    setLoading(true);
    setConflicts([]);
    setWarnings([]);

    try {
      const subject = subjects.find((s) => s._id === selectedSubject);
      if (!subject) return;

      if (!subject.teacherId) {
        alert('This subject does not have a teacher assigned. Please assign a teacher first.');
        return;
      }

      const selectedClassroom = classrooms.find(
        (c) => c.program === selectedProgram && 
               c.className === selectedClass && 
               c.semester === selectedSemester && 
               c.division === selectedDivision
      );

      // Update classroomId in store
      if (selectedClassroom?._id) {
        setClassroomId(selectedClassroom._id);
      }

      const response = await fetch('/api/timetable/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: selectedProgram,
          className: selectedClass,
          semester: selectedSemester,
          division: selectedDivision,
          day: selectedSlot.day,
          timeSlot: selectedSlot.time,
          subjectId: selectedSubject,
          teacherId: subject.teacherId._id,
          classroomId: selectedClassroom?._id || classroomId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setConflicts(data.errors || [data.error]);
        if (data.warnings) {
          setWarnings(data.warnings);
        }
        setLoading(false);
        return;
      }

      if (data.warnings) {
        setWarnings(data.warnings);
      }

      await fetchTimetable();
      await fetchSubjects();
      setSelectedSlot(null);
      setSelectedSubject('');
      setLoading(false);
      // State is automatically persisted by Zustand
    } catch (error: any) {
      setConflicts([error.message || 'An error occurred']);
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry? Workload will be restored.')) return;

    try {
      const response = await fetch(`/api/timetable/delete?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        showToast(data.error || 'Failed to delete entry', 'error');
        return;
      }

      const data = await response.json();

      // Small delay to ensure database updates are complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh both timetable and subjects to update remaining periods
      await Promise.all([
        fetchTimetable(),
        fetchSubjects()
      ]);
      
      // Clear selected slot if it was the deleted one
      setSelectedSlot(null);
      setSelectedSubject('');
      
      // Show success message with rollback details
      showToast('Slot removed — workload restored successfully', 'success');
      
      // Clear any conflicts/warnings since the entry is removed
      setConflicts([]);
      setWarnings([]);
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast('An error occurred while deleting the entry', 'error');
    }
  };

  const handleAutoGenerate = async (mode: 'fill' | 'full') => {
    if (!selectedProgram || !selectedClass || !selectedSemester || !selectedDivision) {
      showToast('Please select program, class, semester, and division', 'error');
      return;
    }

    if (mode === 'full') {
      if (!confirm('This will clear the entire timetable for this division and regenerate from scratch. Continue?')) {
        return;
      }
    }

    setAutoGenerating(true);
    setAutoGenerateResult(null);
    setConflicts([]);
    setWarnings([]);

    try {
      const response = await fetch('/api/timetable/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: selectedProgram,
          className: selectedClass,
          semester: selectedSemester,
          division: selectedDivision,
          mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setConflicts(data.errors || [data.error]);
        showToast(data.error || 'Auto-generation failed', 'error');
        setAutoGenerating(false);
        return;
      }

      setAutoGenerateResult(data);

      // Refresh timetable
      await fetchTimetable();
      await fetchSubjects();

      if (data.success) {
        showToast(
          `Auto-generation complete! Generated ${data.generated} slots, skipped ${data.skipped}`,
          'success'
        );
      } else {
        showToast('Auto-generation completed with warnings', 'warning');
      }

      if (data.warnings && data.warnings.length > 0) {
        setWarnings(data.warnings);
      }
    } catch (error: any) {
      showToast(error.message || 'An error occurred during auto-generation', 'error');
      setConflicts([error.message || 'Auto-generation failed']);
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedProgram || !selectedClass || !selectedSemester || !selectedDivision) {
      alert('Please select program, class, semester, and division');
      return;
    }

    const selectedClassroom = classrooms.find(
      (c) => c.program === selectedProgram && 
             c.className === selectedClass && 
             c.semester === selectedSemester && 
             c.division === selectedDivision
    );

    try {
      const response = await fetch('/api/timetable/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: selectedProgram,
          className: selectedClass,
          semester: selectedSemester,
          division: selectedDivision,
          classroomId: selectedClassroom?._id,
        }),
      });

      const data = await response.json();
      setConflicts(data.errors || []);
      setWarnings(data.warnings || []);
    } catch (error) {
      console.error('Error validating timetable:', error);
    }
  };

  const handleResetTimetable = async () => {
    if (!selectedProgram || !selectedClass || !selectedSemester || !selectedDivision) {
      alert('Please select program, class, semester, and division first');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to reset the entire timetable for ${selectedProgram} ${selectedClass} Sem-${selectedSemester} ${selectedDivision}?\n\nThis will:\n• Clear all time slots\n• Remove all subject allocations\n• Remove all teacher allocations\n• Reset to blank timetable\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/timetable/reset?program=${encodeURIComponent(selectedProgram)}&className=${selectedClass}&semester=${selectedSemester}&division=${selectedDivision}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to reset timetable');
        setLoading(false);
        return;
      }

      // Success - refresh data
      await fetchTimetable();
      await fetchSubjects();
      
      alert(`Timetable cleared successfully!\n\n${data.deletedCount} entries removed.\n\nYou can now start building the timetable again from scratch.`);
      
      // Clear any selected slot and conflicts
      setSelectedSlot(null);
      setSelectedSubject('');
      setConflicts([]);
      setWarnings([]);
      
      setLoading(false);
    } catch (error: any) {
      alert('Error resetting timetable: ' + (error.message || 'Unknown error'));
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedProgram || !selectedClass || !selectedSemester || !selectedDivision) {
      alert('Please select program, class, semester, and division first');
      return;
    }

    if (timetable.length === 0) {
      alert('No timetable data to export');
      return;
    }

    setExportingPDF(true);
    try {
      const title = `Weekly Timetable — ${selectedProgram} ${selectedClass} Sem-${selectedSemester} ${selectedDivision}`;
      const filename = `Timetable_${selectedProgram.replace(/[^a-zA-Z0-9]/g, '')}_${selectedClass}_Sem${selectedSemester}_${selectedDivision}.pdf`;
      
      await exportTimetableToPDF({
        viewMode: 'class',
        title,
        filename,
      });
      
      showToast('Timetable exported successfully!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to export PDF', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const getEntryForSlot = (day: string, time: string) => {
    return timetable.find(
      (entry) => entry.day === day && entry.timeSlot === time
    );
  };

  // Filter available classes, semesters, and divisions based on selected program
  const availableClasses = selectedProgram
    ? Array.from(new Set(classrooms.filter((c) => c.program === selectedProgram).map((c) => c.className)))
    : [];

  const availableSemesters = selectedProgram && selectedClass
    ? Array.from(
        new Set(
          classrooms
            .filter((c) => c.program === selectedProgram && c.className === selectedClass)
            .map((c) => c.semester)
        )
      ).sort()
    : [];

  const availableDivisions = selectedProgram && selectedClass && selectedSemester
    ? Array.from(
        new Set(
          classrooms
            .filter((c) => c.program === selectedProgram && c.className === selectedClass && c.semester === selectedSemester)
            .map((c) => c.division)
        )
      )
    : [];

  const selectedClassroom = classrooms.find(
    (c) => c.program === selectedProgram && 
           c.className === selectedClass && 
           c.semester === selectedSemester && 
           c.division === selectedDivision
  );

  return (
    <div className="space-y-6">
      {/* Hierarchical Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Classroom</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                setSelectedProgram(e.target.value);
                setSelectedClass('');
                setSelectedSemester('');
                setSelectedDivision('');
              }}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select Program...</option>
              {PROGRAMS.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>

          {selectedProgram && (
            <div>
              <label className="block text-sm font-medium mb-2">Class Name</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSemester('');
                  setSelectedDivision('');
                  // Store will automatically reset timetable on semester change
                }}
                className="w-full p-2 border rounded-md"
                disabled={!selectedProgram}
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

          {selectedProgram && selectedClass && (
            <div>
              <label className="block text-sm font-medium mb-2">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value ? parseInt(e.target.value) : '');
                  setSelectedDivision('');
                }}
                className="w-full p-2 border rounded-md"
                disabled={!selectedProgram || !selectedClass}
              >
                <option value="">Select Semester...</option>
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedProgram && selectedClass && selectedSemester && (
            <div>
              <label className="block text-sm font-medium mb-2">Division</label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={!selectedProgram || !selectedClass || !selectedSemester}
              >
                <option value="">Select Division...</option>
                {availableDivisions.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedClassroom && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="text-sm">
                <strong>Selected:</strong> {selectedClassroom.program} - {selectedClassroom.className} Sem-{selectedClassroom.semester} {selectedClassroom.division}
                {selectedClassroom.roomNumber && ` (Room: ${selectedClassroom.roomNumber})`}
                {selectedClassroom.year && ` - ${selectedClassroom.year}`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProgram && selectedClass && selectedSemester && selectedDivision && (
        <>
          {/* Timetable Grid */}
          <Card>
            <CardHeader>
              <CardTitle>
                Weekly Timetable - {selectedProgram} {selectedClass} Sem-{selectedSemester} {selectedDivision}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div id="timetable-export-container">
                {/* Export Header - Only visible in PDF */}
                <div className="hidden print:block mb-4">
                  <h2 className="text-xl font-bold mb-2">
                    Weekly Timetable — {selectedProgram} {selectedClass} Sem-{selectedSemester} {selectedDivision}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Academic Year: {new Date().getFullYear()}-{new Date().getFullYear() + 1}
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-gray-100 font-semibold">Time</th>
                        {DAYS.map((day) => (
                          <th key={day} className="border p-2 bg-gray-100 font-semibold">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((time) => (
                        <tr key={time}>
                          <td className="border p-2 bg-gray-50 font-medium">{time}</td>
                          {DAYS.map((day) => {
                            const entry = getEntryForSlot(day, time);
                            const isSelected =
                              selectedSlot?.day === day && selectedSlot?.time === time;
                            const isBreak = isBreakSlot(time);
                            const isHolidayDay = isHoliday(day);
                            return (
                              <td
                                key={`${day}-${time}`}
                                className={`border p-2 min-w-[150px] transition-colors ${
                                  isHolidayDay
                                    ? 'bg-red-100 cursor-not-allowed opacity-80 border-red-200'
                                    : isBreak
                                    ? 'bg-gray-300 cursor-not-allowed opacity-60'
                                    : isSelected
                                    ? 'bg-blue-200 ring-2 ring-blue-500 cursor-pointer'
                                    : entry
                                    ? entry.status === 'conflict'
                                      ? 'bg-red-100 cursor-pointer'
                                      : 'bg-green-100 cursor-pointer'
                                    : 'bg-white hover:bg-gray-50 cursor-pointer'
                                }`}
                                onClick={() => handleSlotClick(day, time)}
                              >
                                {isHolidayDay ? (
                                  <div className="text-center py-2">
                                    <div className="text-red-800 font-bold text-sm">
                                      🏖️ HOLIDAY
                                    </div>
                                    <div className="text-xs text-red-600 mt-1">
                                      No Lectures
                                    </div>
                                  </div>
                                ) : isBreak ? (
                                  <div className="text-center py-2">
                                    <div className="text-gray-700 font-bold text-sm">BREAK</div>
                                  </div>
                                ) : entry ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-sm">
                                      {entry.subjectId?.subject_name || 'No subject'}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {entry.teacherId?.faculty_name || 'No teacher'}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-xs print:hidden"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEntry(entry._id);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-xs text-center">
                                    Click to add
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
            </CardContent>
          </Card>

          {/* Subject Selection Panel */}
          {selectedSlot && (
            <Card>
              <CardHeader>
                <CardTitle>Add Subject to {selectedSlot.day} {selectedSlot.time}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Choose a subject...</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.subject_name} ({subject.subject_code}) -{' '}
                        {subject.teacherId?.faculty_name || 'No teacher assigned'} - Remaining: {subject.remainingPeriods}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSubject && (
                  <div className="space-y-2">
                    {(() => {
                      const subject = subjects.find((s) => s._id === selectedSubject);
                      if (!subject) return null;
                      return (
                        <>
                          <div className="text-sm">
                            <strong>Teacher:</strong> {subject.teacherId?.faculty_name || 'No teacher assigned'}
                          </div>
                          <div className="text-sm">
                            <strong>Remaining Periods:</strong> {subject.remainingPeriods} / {subject.requiredPeriods}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(subject.allottedPeriods / subject.requiredPeriods) * 100}%`,
                              }}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <Button
                  onClick={handleAddEntry}
                  disabled={!selectedSubject || loading}
                  className="w-full"
                >
                  {loading ? 'Adding...' : 'Add to Timetable'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Conflict Alerts */}
          {(conflicts.length > 0 || warnings.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Validation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {conflicts.map((error, idx) => (
                  <Alert key={idx} variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Conflict</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
                {warnings.map((warning, idx) => (
                  <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Warning</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      {warning}
                    </AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Holiday Management */}
          <Card>
            <CardHeader>
              <CardTitle>Holiday Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Mark days as holidays to prevent scheduling. All existing lectures on holiday days will be automatically removed.
                </div>
                <div className="flex flex-wrap gap-4">
                  {DAYS.map((day) => {
                    const isHoliday = holidays.includes(day);
                    const dayEntries = timetable.filter(entry => entry.day === day);
                    
                    return (
                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isHoliday}
                          onChange={() => toggleHoliday(day)}
                          disabled={loading}
                          className="w-4 h-4"
                        />
                        <span className={`text-sm ${isHoliday ? 'font-bold text-red-600' : ''}`}>
                          {day}
                          {dayEntries.length > 0 && !isHoliday && (
                            <span className="ml-1 text-xs text-blue-600">({dayEntries.length})</span>
                          )}
                          {isHoliday && (
                            <span className="ml-1 text-xs text-red-500">(HOLIDAY)</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {holidays.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm text-red-800">
                      <strong>Holiday Days:</strong> {holidays.join(', ')}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      These days are locked and cannot be scheduled.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auto-Generate Timetable */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Generate Timetable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => handleAutoGenerate('fill')}
                  disabled={autoGenerating}
                  variant="outline"
                  className="flex-1"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {autoGenerating ? 'Generating...' : 'Auto Fill Remaining Slots'}
                </Button>
                <Button
                  onClick={() => handleAutoGenerate('full')}
                  disabled={autoGenerating}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {autoGenerating ? 'Generating...' : 'Full Auto-Generate (Clear & Regenerate)'}
                </Button>
              </div>
              
              {autoGenerateResult && (
                <div className="space-y-2">
                  <Alert className={autoGenerateResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
                    <AlertTitle className={autoGenerateResult.success ? 'text-green-800' : 'text-yellow-800'}>
                      Auto-Generation Summary
                    </AlertTitle>
                    <AlertDescription className={autoGenerateResult.success ? 'text-green-700' : 'text-yellow-700'}>
                      <div className="space-y-1">
                        <div>✅ Generated: {autoGenerateResult.generated} slots</div>
                        <div>⏭️ Skipped: {autoGenerateResult.skipped} slots</div>
                        {autoGenerateResult.summary.teachersReachedFullLoad.length > 0 && (
                          <div className="mt-2">
                            <strong>Teachers at Full Load:</strong> {autoGenerateResult.summary.teachersReachedFullLoad.join(', ')}
                          </div>
                        )}
                        {autoGenerateResult.summary.subjectsFullyAllocated.length > 0 && (
                          <div>
                            <strong>Subjects Fully Allocated:</strong> {autoGenerateResult.summary.subjectsFullyAllocated.join(', ')}
                          </div>
                        )}
                        {autoGenerateResult.summary.unassignedSubjects.length > 0 && (
                          <div className="text-orange-600">
                            <strong>Unassigned Subjects:</strong> {autoGenerateResult.summary.unassignedSubjects.join(', ')}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 items-center flex-wrap">
            <Button onClick={handleValidate} variant="outline">
              Validate Timetable
            </Button>
            <Button 
              onClick={handleExportPDF} 
              disabled={exportingPDF || timetable.length === 0}
              variant="outline"
              className="bg-green-50 hover:bg-green-100 border-green-200"
            >
              <Download className="mr-2 h-4 w-4" />
              {exportingPDF ? 'Preparing PDF...' : 'Download as PDF'}
            </Button>
            <Button 
              onClick={handleResetTimetable} 
              disabled={loading}
              variant="destructive"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {loading ? 'Resetting...' : 'Reset Timetable'}
            </Button>
            <Button 
              onClick={handleSaveTimetable} 
              disabled={saving || conflicts.length > 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Timetable'}
            </Button>
            {conflicts.length === 0 && timetable.length > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Timetable is valid and ready to save
                </AlertDescription>
              </Alert>
            )}
          </div>
        </>
      )}
    </div>
  );
}

