import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Trash2, Calendar, Sparkles, RefreshCw, Download, ChevronRight, Clock, BookOpen, UserX, Bot, Undo, Redo, Share2, MoreVertical, Eye, Edit3, ArrowRightLeft, Move, History } from 'lucide-react';
import { useTimetable } from '@/context/TimetableContext';
import { showToast } from '@/components/ui/toast';
import { exportTimetableToPDF } from '@/utils/pdfExport';
import { exportTimetableToExcel } from '@/utils/excelExport';
import { exportTimetableToCSV } from '@/utils/csvExport';
import SmartGenerateModal from './SmartGenerateModal';
import subjectApi from '@/services/api/subjectApi';
import classroomApi from '@/services/api/classroomApi';
import teacherApi from '@/services/api/teacherApi';
import timetableApi from '@/services/api/timetableApi';
import { useMasterData } from '@/hooks/useMasterData';
import CopyTimetableModal from './CopyTimetableModal';
import { calculateTimetableCapacity } from '@/utils/timetableCalculations';

const getSubjectColorClasses = (subjectCode, isLab) => {
  if (isLab) {
    return { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-white', badge: 'bg-indigo-500 text-white border-indigo-400' };
  }
  let hash = 0;
  const codeStr = subjectCode || '';
  for (let i = 0; i < codeStr.length; i++) {
    hash = codeStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    { bg: 'bg-indigo-50/60 hover:bg-indigo-50', border: 'border-indigo-150', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { bg: 'bg-emerald-50/60 hover:bg-emerald-50', border: 'border-emerald-150', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { bg: 'bg-amber-50/60 hover:bg-amber-50', border: 'border-amber-150', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
    { bg: 'bg-rose-50/60 hover:bg-rose-50', border: 'border-rose-150', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
    { bg: 'bg-sky-50/60 hover:bg-sky-50', border: 'border-sky-150', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
    { bg: 'bg-violet-50/60 hover:bg-violet-50', border: 'border-violet-150', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700 border-violet-200' }
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};


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

export default function TimetableBuilder() {
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
  } = useTimetable();

  const { departments, semesters, divisions, loading: masterDataLoading } = useMasterData(selectedProgram, selectedSemester);

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState(new Set());
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenerateResult, setAutoGenerateResult] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [isLabMode, setIsLabMode] = useState(false);

  // New states for Slot Action dropdowns & Modals
  const [actionMenu, setActionMenu] = useState(null);
  
  // Modals state
  const [detailsModalEntry, setDetailsModalEntry] = useState(null);
  const [editModalEntry, setEditModalEntry] = useState(null);
  const [editForm, setEditForm] = useState({ subjectId: '', teacherId: '', day: '', timeSlot: '', isLab: false });
  const [editValidation, setEditValidation] = useState({ isValid: true, errors: [], warnings: [] });
  const [editLoading, setEditLoading] = useState(false);

  // Replace Faculty Modal state
  const [replacementModal, setReplacementModal] = useState(null);
  const [replacementCandidates, setReplacementCandidates] = useState([]);
  const [replacementLoading, setReplacementLoading] = useState(false);

  // Move Slot Modal state
  const [moveModalEntry, setMoveModalEntry] = useState(null);
  const [moveForm, setMoveForm] = useState({ day: '', timeSlot: '' });
  const [moveValidation, setMoveValidation] = useState({ isValid: true, errors: [] });

  // Delete Confirm Modal state
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState(null);
  const [deleteImpact, setDeleteImpact] = useState(null);

  // AI Suggest Fix state
  const [aiSuggestFixEntry, setAiSuggestFixEntry] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);

  // Add Lecture Modal state
  const [addLectureModalSlot, setAddLectureModalSlot] = useState(null);
  const [addForm, setAddForm] = useState({ subjectId: '', teacherId: '', isLab: false });
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState('');
  const [addValidation, setAddValidation] = useState({ isValid: true, errors: [], warnings: [] });

  // Smart Generate modal state
  const [smartModal, setSmartModal] = useState(false);
  const [smartConfig, setSmartConfig] = useState({
    mode: 'full',
    freeSlots: 4,
    subjectConfigs: [],
    labRoomAssignments: []
  });

  // Copy timetable state
  const [copyModal, setCopyModal] = useState(false);
  const [targetCopyDivision, setTargetCopyDivision] = useState('');
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Dropdown states
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [moreActionsDropdownOpen, setMoreActionsDropdownOpen] = useState(false);

  // Tab State for right panel
  const [activeRightTab, setActiveRightTab] = useState('copilot'); // 'copilot' or 'history'
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const fetchSubjects = async () => {
    if (!selectedProgram || !selectedSemester) {
      setSubjects([]);
      return;
    }
    setSubjectsLoading(true);
    setSubjectsError('');
    try {
      const response = await subjectApi.list({ program: selectedProgram, semester: selectedSemester });
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
      setSubjectsError(error.response?.data?.error || 'Unable to load subjects for the selected timetable context.');
    } finally {
      setSubjectsLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await classroomApi.list();
      setClassrooms(response.data.data || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await teacherApi.list();
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchEligibleTeachers = async (subjectId, slot = addLectureModalSlot) => {
    if (!subjectId || !slot || !selectedProgram || !selectedSemester) {
      setTeachers([]);
      return;
    }
    setTeachersLoading(true);
    setTeachersError('');
    try {
      setTeachers([]); // Clear previous faculty
      const response = await timetableApi.getAvailableFaculty(subjectId, {
        day: slot?.day,
        timeSlot: slot?.timeSlot,
        semesterId: selectedSemester,
        departmentId: selectedProgram
      });
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Error fetching eligible teachers:', error);
      setTeachersError(error.response?.data?.error || 'Failed to fetch teachers');
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  };


  const fetchAssignedTeachers = useCallback(async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) {
      setAssignedTeacherIds(new Set());
      return;
    }
    try {
      const params = {
        program: selectedProgram,
        semester: selectedSemester,
        division: selectedDivision,
      };
      if (selectedSlot) {
        params.day = selectedSlot.day;
        params.timeSlot = selectedSlot.time;
      }
      const response = await teacherApi.list(params);
      const ids = new Set((response.data.data || []).map((t) => t._id));
      setAssignedTeacherIds(ids);
    } catch (error) {
      console.error('Error fetching assigned teachers:', error);
    }
  }, [selectedProgram, selectedSemester, selectedDivision, selectedSlot]);

  const fetchTimetable = useCallback(async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) return;
    try {
      const response = await timetableApi.getDivisionTimetable(selectedDivision);
      const mappedEntries = (response.data.entries || []).map(e => ({
        _id: e._id,
        day: e.day,
        timeSlot: e.timeSlot || e.period,
        status: e.status,
        slot_type: e.slot_type || e.type,
        subjectId: e.subject,
        teacherId: e.teacher,
        classroomId: e.classroom || e.laboratory,
        isLab: e.isLab || e.type === 'LAB'
      }));
      setTimetable(mappedEntries);

      const configResponse = await timetableApi.getWeeklyConfig({
        departmentId: selectedProgram,
        semesterId: selectedSemester,
        division: selectedDivision,
      });
      if (configResponse.data) {
        setHolidays(configResponse.data.holidays || []);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    }
  }, [selectedProgram, selectedSemester, selectedDivision, setTimetable]);

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const response = await timetableApi.getAuditLogs();
      setAuditLogs(response.data.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
      fetchClassrooms();
      fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedProgram && selectedSemester && selectedDivision) {
      fetchTimetable();
      fetchAssignedTeachers();
      fetchSubjects();
      fetchAuditLogs();
    } else {
      setTimetable([]);
    }
  }, [selectedProgram, selectedSemester, selectedDivision, selectedSlot, fetchTimetable, fetchAssignedTeachers, setTimetable]);

  const handleSlotClick = async (day, time) => {
    if (BREAK_SLOTS.includes(time)) return;
    if (holidays.includes(day)) return;

    // Check if occupied
    const isOccupied = timetable.some(t => t.day === day && t.timeSlot === time);
    if (isOccupied) {
      showToast('Slot already assigned. Use Edit or Replace option.', 'warning');
      return;
    }

    // Reset validations and open beautiful Add Lecture Modal
    setAddLectureModalSlot({ day, timeSlot: time });
    setAddForm({
      subjectId: '',
      teacherId: '',
      isLab: false
    });
    setAddValidation({ isValid: true, errors: [], warnings: [] });
    // Refresh when the modal opens as well as when context changes. This
    // prevents an out-of-date request from leaving the subject list blank.
    await fetchSubjects();
  };

  const isBreakSlot = (time) => BREAK_SLOTS.includes(time);
  const isHoliday = (day) => holidays.includes(day);

  const toggleHoliday = async (day) => {
    const isCurrentlyHoliday = holidays.includes(day);

    if (!isCurrentlyHoliday) {
      const dayEntries = timetable.filter(entry => entry.day === day);
      if (dayEntries.length > 0) {
        const subjectNames = Array.from(new Set(dayEntries.map(e => e.subjectId?.subject_name).filter(Boolean)));
        const teacherNames = Array.from(new Set(dayEntries.map(e => e.teacherId?.faculty_name).filter(Boolean)));
        const confirmed = confirm(
          `This day already contains ${dayEntries.length} scheduled lecture(s):\n\nSubjects: ${subjectNames.join(', ')}\nTeachers: ${teacherNames.join(', ')}\n\nMarking it as a holiday will permanently delete all timetable entries for this day.\n\nDo you want to continue?`
        );
        if (!confirmed) return;
      }

      setLoading(true);
      try {
        const response = await timetableApi.setHoliday({
          departmentId: selectedProgram,
          semesterId: selectedSemester,
          division: selectedDivision,
          day,
          action: 'set'
        });
        setHolidays([...holidays, day]);
        await fetchTimetable();
        await fetchSubjects();
        await fetchAuditLogs();

        if (selectedSlot?.day === day) { setSelectedSlot(null); setSelectedSubject(''); }
        alert(`Holiday applied successfully!\n\n${response.data.deletedEntries} lecture(s) cleared from ${day}.`);
        setLoading(false);
      } catch (error) {
        alert('Error setting holiday: ' + (error.response?.data?.error || error.message || 'Unknown error'));
        setLoading(false);
      }
    } else {
      const confirmed = confirm(`Remove holiday status from ${day}?\n\nThe day will become available for scheduling again.\nPreviously deleted lectures will NOT be restored.`);
      if (!confirmed) return;
      setLoading(true);
      try {
        await timetableApi.setHoliday({
          departmentId: selectedProgram,
          semesterId: selectedSemester,
          division: selectedDivision,
          day,
          action: 'remove'
        });
        setHolidays(holidays.filter(h => h !== day));
        await fetchAuditLogs();
        alert(`Holiday removed from ${day}. Day is now available for scheduling.`);
        setLoading(false);
      } catch (error) {
        alert('Error removing holiday: ' + (error.response?.data?.error || error.message || 'Unknown error'));
        setLoading(false);
      }
    }
  };

  const handleSmartGenerate = async (options) => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) {
      showToast('Please select program, class, semester, and division', 'error');
      return;
    }

    console.log({
      subjects: options.selectedTheorySubjects || [],
      teachers: teachers || [],
      labs: options.selectedLabSubjects || [],
      libraryPeriods: options.libraryPeriodsRequired || 0,
      division: selectedDivision,
      semester: selectedSemester
    });

    setSmartModal(false);
    setAutoGenerating(true);
    setAutoGenerateResult(null);
    setConflicts([]);
    setWarnings([]);

    try {
      const response = await timetableApi.smartGenerate({
        departmentId: selectedProgram,
        semesterId: selectedSemester,
        division: selectedDivision,
        options
      });
      const data = response.data;
      setAutoGenerateResult(data);

      if (data.success && data.entries) {
        // Prepare payload for MongoDB persistence
        const selectedSemesterRecord = semesters.find((semester) => semester._id === selectedSemester);
        const saveResponse = await timetableApi.saveGeneratedEntries({
          departmentId: selectedProgram,
          semesterId: selectedSemester,
          divisionId: selectedDivision,
          academicYear: selectedSemesterRecord?.academic_year,
          mode: options.mode,
          entries: data.entries,
        });

        if (saveResponse.data.success) {
          showToast('Timetable generated and saved successfully', 'success');
          // Update Grid from API response
          fetchTimetable();
        }
      }

      await Promise.all([fetchSubjects(), fetchAssignedTeachers(), fetchAuditLogs()]);

      if (data.success) {
        if (!data.entries || data.entries.length === 0) {
          showToast('No valid slots available', 'warning');
        } else {
          if (data.summary && data.summary.unassignedSubjects && data.summary.unassignedSubjects.length > 0) {
            const reasons = data.summary.unassignedSubjects.join('\n- ');
            window.alert(`Generation completed partially (Skipped ${data.skipped || 0} periods). Unallocated Subjects:\n- ${reasons}`);
          } else if (data.errors && data.errors.length > 0) {
             window.alert(`Generation completed but with errors:\n- ${data.errors.join('\n- ')}`);
          } else {
             showToast('Timetable fully generated and saved successfully!', 'success');
          }
        }
      } else {
        window.alert(`Generation Failed/Incomplete:\n- ${data.errors?.join('\n- ') || 'Unknown error'}\nUnallocated Subjects:\n- ${data.summary?.unassignedSubjects?.join('\n- ') || 'None'}`);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate';
      showToast(msg, 'error');
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleSaveTimetable = async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) {
      showToast('Please select program, class, semester, and division', 'error');
      return;
    }
    setSaving(true);
    setConflicts([]);
    setWarnings([]);
    try {
      const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
      // Draft endpoint accepts only persisted timetable fields.  Do not send
      // placeholder grid cells or partial assignments.
      const entries = timetable.map(entry => ({
        subjectId: entry.subjectId?._id || entry.subjectId,
        teacherId: entry.teacherId?._id || entry.teacherId,
        classroomId: entry.classroomId?._id || entry.classroomId || entry.classroom?._id || classroomId,
        day: entry.day,
        slot: entry.timeSlot,
        type: entry.isLab ? 'LAB' : entry.slot_type === 'LIBRARY' ? 'LIBRARY' : entry.slot_type === 'FREE' ? 'FREE' : 'THEORY'
      })).filter((entry) => Object.values(entry).every(hasValue));

      if (!entries.length) {
        showToast('No complete timetable entries are available to save.', 'error');
        setSaving(false);
        return;
      }

      const selectedSemesterRecord = semesters.find((semester) => semester._id === selectedSemester);

      const response = await timetableApi.saveDraft({
        departmentId: selectedProgram,
        semesterId: selectedSemester,
        divisionId: selectedDivision,
        academicYear: selectedSemesterRecord?.academic_year || `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
        classroomId: classroomId || entries[0]?.classroomId,
        entries
      });
      if (response.data.warnings?.length > 0) setWarnings(response.data.warnings);
      showToast('Draft saved successfully!', 'success');
      setSaving(false);
      await fetchAuditLogs();
    } catch (error) {
      setConflicts(error.response?.data?.conflicts || [error.response?.data?.message || error.message]);
      if (error.response?.data?.warnings) setWarnings(error.response.data.warnings);
      showToast(error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to save draft', 'error');
      setSaving(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) {
      showToast('Please select program, class, semester, and division', 'error');
      return;
    }
    setSaving(true);
    setConflicts([]);
    setWarnings([]);
    try {
      // Map local timetable state to API payload
      const entries = timetable.map(entry => ({
        subjectId: entry.subjectId?._id || entry.subjectId,
        teacherId: entry.teacherId?._id || entry.teacherId,
        roomId: entry.classroomId?._id || entry.classroomId || entry.classroom?._id,
        day: entry.day,
        period: entry.timeSlot,
        type: entry.isLab ? 'LAB' : entry.slot_type === 'LIBRARY' ? 'LIBRARY' : entry.slot_type === 'FREE' ? 'FREE' : 'THEORY'
      }));

      const selectedSemesterRecord = semesters.find((semester) => semester._id === selectedSemester);
      const response = await timetableApi.saveGeneratedEntries({
        departmentId: selectedProgram,
        semesterId: selectedSemester,
        divisionId: selectedDivision,
        academicYear: selectedSemesterRecord?.academic_year,
        mode: 'full',
        entries
      });
      if (response.data.warnings?.length > 0) setWarnings(response.data.warnings);
      showToast('Timetable generated and saved successfully', 'success');
      setSaving(false);
      await fetchAuditLogs();
      // Reload timetable after save
      fetchTimetable();
    } catch (error) {
      setConflicts(error.response?.data?.conflicts || [error.response?.data?.message || error.message]);
      if (error.response?.data?.warnings) setWarnings(error.response.data.warnings);
      showToast('Generation completed but save failed', 'error');
      setSaving(false);
    }
  };

  // ── Modals & Slot Management Actions Implementation ──
  const handleViewDetails = (entry) => {
    setDetailsModalEntry(entry);
  };

  const buildEntryContext = (entry) => {
    const subject = getSubjectForEntry(entry) || {};
    const teacher = getTeacherForEntry(entry) || {};
    const room = getRoomForEntry(entry) || {};
    return {
      entry,
      entryId: entry._id, subjectId: getId(entry.subjectId), subjectName: subject.subject_name || subject.name || '', subjectCode: subject.subject_code || subject.code || '',
      teacherId: getId(entry.teacherId), teacherName: teacher.faculty_name || teacher.name || '',
      departmentId: selectedProgram, departmentName: selectedDepartmentRecord?.department_name || '', className: selectedClass || '',
      semesterId: selectedSemester, semesterName: selectedSemesterRecord?.semester_number ? `Semester ${selectedSemesterRecord.semester_number}` : '',
      divisionId: selectedDivision, divisionName: divisions.find((item) => String(item._id) === String(selectedDivision))?.division_name || '',
      day: entry.day, timeSlot: entry.timeSlot, classroomId: getId(entry.classroomId), classroomName: room.roomNumber || room.room_name || room.lab_name || '',
      type: entry.isLab || entry.slot_type === 'LAB' ? 'LAB' : (entry.slot_type || 'THEORY'),
    };
  };

  useEffect(() => {
    if (!actionMenu) return undefined;
    const closeMenu = () => setActionMenu(null);
    const handleKeyDown = (event) => { if (event.key === 'Escape') closeMenu(); };
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('scroll', closeMenu, true); window.removeEventListener('resize', closeMenu); window.removeEventListener('keydown', handleKeyDown); };
  }, [actionMenu]);

  const handleEditSlot = (entry) => {
    setEditModalEntry(entry);
    setEditForm({
      subjectId: entry.subjectId?._id || entry.subjectId || '',
      teacherId: entry.teacherId?._id || entry.teacherId || '',
      classroomId: entry.classroomId?._id || entry.classroomId || entry.classroom?._id || '',
      day: entry.day,
      timeSlot: entry.timeSlot,
      isLab: entry.isLab || false
    });
    setEditValidation({ isValid: true, errors: [], warnings: [] });
  };

  const handleEditFormChange = async (fields) => {
    const updatedForm = { ...editForm, ...fields };
    setEditForm(updatedForm);

    if (!updatedForm.subjectId || !updatedForm.teacherId) return;

    try {
      const response = await timetableApi.validateChange({
        program: selectedProgram,
        className: selectedClass,
        semester: selectedSemester,
        division: selectedDivision,
        day: updatedForm.day,
        timeSlot: updatedForm.timeSlot,
        subjectId: updatedForm.subjectId,
        teacherId: updatedForm.teacherId,
        excludeTimetableId: editModalEntry._id,
        isLab: updatedForm.isLab
      });
      setEditValidation({
        isValid: response.data.isValid,
        errors: response.data.errors,
        warnings: response.data.warnings
      });
    } catch (err) {
      console.error('Validation check failed', err);
    }
  };

  const handleConfirmEdit = async () => {
    if (!editValidation.isValid) {
      showToast('Please resolve the scheduling conflicts first.', 'error');
      return;
    }
    setEditLoading(true);
    try {
      const originalTeacherId = editModalEntry.teacherId?._id || editModalEntry.teacherId;
      if (editForm.teacherId !== originalTeacherId || editForm.day !== editModalEntry.day || editForm.timeSlot !== editModalEntry.timeSlot) {
        await timetableApi.move({
          entryId: editModalEntry._id,
          newDay: editForm.day,
          newTimeSlot: editForm.timeSlot,
          newTeacherId: editForm.teacherId !== originalTeacherId ? editForm.teacherId : undefined,
        });
      }
      showToast('Lecture updated successfully.', 'success');
      setEditModalEntry(null);
      await Promise.all([fetchTimetable(), fetchSubjects(), fetchAssignedTeachers(), fetchAuditLogs()]);
    } catch (error) {
      showToast(error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to update lecture', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const fetchReplacementEligibility = async (context) => {
    setReplacementLoading(true);
    setReplacementCandidates([]);
    try {
      const required = ['entryId', 'departmentId', 'className', 'semesterId', 'divisionId', 'day', 'timeSlot', 'subjectId'];
      const missing = required.filter((key) => !context[key]);
      if (missing.length) {
        console.error('[Replace] Missing context fields:', missing, context);
        showToast('Unable to replace this lecture because timetable context is incomplete.', 'error');
        return;
      }
      console.debug('[Replace] Context:', context);
      const response = await timetableApi.getReplacementFaculty({
        timetableId: context.entryId,
        program: context.departmentId, className: context.className, semester: context.semesterId, division: context.divisionId,
        day: context.day, timeSlot: context.timeSlot, subjectId: context.subjectId,
        departmentId: context.departmentId, semesterId: context.semesterId, divisionId: context.divisionId, classroomId: context.classroomId
      });
      setReplacementCandidates(response.data.candidates || []);
    } catch (error) {
      showToast(error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to load eligible replacements', 'error');
    } finally {
      setReplacementLoading(false);
    }
  };

  const handleApplyReplacement = async (candidateId) => {
    if (!replacementModal) return;
    setLoading(true);
    try {
      await timetableApi.updateTeacher({
        entryId: replacementModal.entryId,
        newTeacherId: candidateId
      });
      showToast('Teacher replaced successfully.', 'success');
      setReplacementModal(null);
      await Promise.all([fetchTimetable(), fetchSubjects(), fetchAssignedTeachers(), fetchAuditLogs()]);
    } catch (error) {
      showToast(error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to apply replacement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSlotClick = (entry) => {
    setMoveModalEntry(entry);
    setMoveForm({
      day: entry.day,
      timeSlot: entry.timeSlot
    });
    setMoveValidation({ isValid: true, errors: [] });
  };

  const handleMoveFormChange = async (fields) => {
    const updatedForm = { ...moveForm, ...fields };
    setMoveForm(updatedForm);
    try {
      const response = await timetableApi.checkMove({
        entryId: moveModalEntry._id,
        newDay: updatedForm.day,
        newTimeSlot: updatedForm.timeSlot
      });
      setMoveValidation({
        isValid: response.data.isValid,
        errors: response.data.errors || []
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleConfirmMove = async () => {
    if (!moveValidation.isValid) {
      showToast('Cannot move due to conflict', 'error');
      return;
    }
    setLoading(true);
    try {
      await timetableApi.move({
        entryId: moveModalEntry._id,
        newDay: moveForm.day,
        newTimeSlot: moveForm.timeSlot
      });
      showToast('Slot shifted successfully', 'success');
      setMoveModalEntry(null);
      await Promise.all([fetchTimetable(), fetchSubjects(), fetchAssignedTeachers(), fetchAuditLogs()]);
    } catch (err) {
      showToast(err.response?.data?.error || 'Move failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlotClick = (entry) => {
    setDeleteConfirmEntry(entry);
    // Calculate impact report
    const subject = subjects.find(s => s._id === (entry.subjectId?._id || entry.subjectId));
    const totalRequired = subject ? subject.requiredPeriods : 0;
    const totalAllotted = subject ? subject.allottedPeriods : 0;
    const deletedCount = entry.isLab ? 2 : 1;
    const newAllotted = Math.max(0, totalAllotted - deletedCount);
    const oldPct = totalRequired > 0 ? Math.round((totalAllotted / totalRequired) * 100) : 0;
    const newPct = totalRequired > 0 ? Math.round((newAllotted / totalRequired) * 100) : 0;

    const teacher = entry.teacherId;
    const oldWorkload = teacher ? teacher.assignedHours || 0 : 0;
    const newWorkload = Math.max(0, oldWorkload - deletedCount);

    setDeleteImpact({
      subjectName: subject ? subject.subject_name : 'Subject',
      subjectCode: subject ? subject.subject_code : 'CODE',
      oldCoverage: oldPct,
      newCoverage: newPct,
      teacherName: teacher ? teacher.faculty_name : 'Teacher',
      oldWorkload,
      newWorkload,
      deletedCount,
      day: entry.day,
      timeSlot: entry.timeSlot
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmEntry) return;
    setLoading(true);
    try {
      await timetableApi.delete(deleteConfirmEntry._id);
      showToast('Lecture deleted successfully.', 'success');
      setDeleteConfirmEntry(null);
      setDeleteImpact(null);
      await Promise.all([fetchTimetable(), fetchSubjects(), fetchAssignedTeachers(), fetchAuditLogs()]);
    } catch (error) {
      showToast(error.response?.data?.error || 'Deletion failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestFixClick = async (entry) => {
    setAiSuggestFixEntry(entry);
    setAiSuggestionsLoading(true);
    setAiSuggestions([]);
    try {
      const response = await timetableApi.suggestFix({
        entryId: entry._id
      });
      setAiSuggestions(response.data.recommendations || []);
    } catch (err) {
      showToast('AI suggestion failed', 'error');
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  const handleApplyAISuggestion = async (suggestion) => {
    setLoading(true);
    try {
      if (suggestion.type === 'MOVE') {
        await timetableApi.move({
          entryId: aiSuggestFixEntry._id,
          newDay: suggestion.payload.newDay,
          newTimeSlot: suggestion.payload.newTimeSlot
        });
      } else if (suggestion.type === 'REPLACE') {
        await timetableApi.updateTeacher({
          entryId: aiSuggestFixEntry._id,
          newTeacherId: suggestion.payload.newTeacherId
        });
      }
      showToast('AI optimization applied successfully', 'success');
      setAiSuggestFixEntry(null);
      setAiSuggestions([]);
      await Promise.all([fetchTimetable(), fetchSubjects(), fetchAssignedTeachers(), fetchAuditLogs()]);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to apply recommendation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFormChange = async (fields) => {
    const updatedForm = { ...addForm, ...fields };
    setAddForm(updatedForm);

    if (!updatedForm.subjectId) return;
    if (fields.subjectId) {
      setAddForm({ ...updatedForm, teacherId: '' });
      setAddValidation({ isValid: true, errors: [], warnings: [] });
      await fetchEligibleTeachers(updatedForm.subjectId);
      return;
    }
    if (!updatedForm.teacherId) return;

    try {
      const response = await timetableApi.validateChange({
        program: selectedProgram,
        className: selectedClass,
        semester: selectedSemester,
        division: selectedDivision,
        day: addLectureModalSlot.day,
        timeSlot: addLectureModalSlot.timeSlot,
        subjectId: updatedForm.subjectId,
        teacherId: updatedForm.teacherId,
        classroomId: updatedForm.classroomId,
        isLab: updatedForm.isLab
      });
      setAddValidation({
        isValid: response.data.isValid,
        errors: response.data.errors || [],
        warnings: response.data.warnings || []
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLecture = async () => {
    if (!addForm.subjectId) {
      showToast('Choose a subject', 'error');
      return;
    }
    if (!addForm.teacherId) {
      showToast('Choose an available faculty member', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        departmentId: selectedProgram,
        semesterId: selectedSemester,
        division: selectedDivision,
        day: addLectureModalSlot.day,
        timeSlot: addLectureModalSlot.timeSlot,
        subjectId: addForm.subjectId,
        teacherId: addForm.teacherId,

        isLab: addForm.isLab
      };
      await timetableApi.add(payload);
      showToast('Lecture scheduled successfully', 'success');
      setAddLectureModalSlot(null);
      await Promise.all([fetchTimetable(), fetchSubjects(), fetchAssignedTeachers(), fetchAuditLogs()]);
    } catch (error) {
      showToast(error.response?.data?.error || 'Scheduling failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Original auto generate triggering
  const handleAutoGenerate = async (mode) => {
    const configs = subjects.map(s => ({ 
      subjectId: s._id, 
      requiredPeriods: s.requiredPeriods || 1, 
      labDuration: s.labDuration || 2,
      selected: true
    }));
    
    const labRoomAssignments = subjects.filter(s => s.type === 'lab' && s.subject_code !== 'LIB-FREE').map(s => ({ 
      subjectId: s._id, 

    }));

    setSmartConfig(prev => ({ 
      ...prev, 
      mode,
      subjectConfigs: configs,
      labRoomAssignments
    }));
    setSmartModal(true);
  };



  const handleShareTimetable = async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) {
      showToast('Please select timetable details first', 'error');
      return;
    }
    setSharing(true);
    try {
      const response = await timetableApi.share({
        departmentId: selectedProgram,
        semesterId: selectedSemester,
        division: selectedDivision
      });
      await navigator.clipboard.writeText(response.data?.link || window.location.href);
      showToast('Share link copied to clipboard!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate timetable', 'error');
    } finally {
      setAutoGenerating(false);
    }
  };
  const handleCopyTimetable = async () => {
    try {
      setCopying(true);
      if (!selectedProgram || !selectedSemester || !selectedDivision) {
        showToast('Source configuration missing', 'error');
        return;
      }
      if (!targetCopyDivision) {
        showToast('Please select a target division', 'error');
        return;
      }
      const response = await timetableApi.copy({
        program: selectedProgram,
        className: selectedClass,
        semester: selectedSemester,
        sourceDivision: selectedDivision,
        targetDivision: targetCopyDivision
      });
      showToast(`Timetable copied successfully! ${response.data.copiedCount} entries cloned.`, 'success');
      setCopyModal(false);
      setTargetCopyDivision('');
      await fetchTimetable();
      await fetchAuditLogs();
    } catch (error) {
      console.error("Copy timetable failed", error);
      showToast(error.response?.data?.error || 'Failed to copy timetable', 'error');
    } finally {
      setCopying(false);
    }
  };

  const handleResetTimetable = async () => {
    if (!window.confirm("Are you sure you want to reset timetable?")) return;
    setLoading(true);
    try {
      const response = await timetableApi.reset({
        departmentId: selectedProgram,
        semesterId: selectedSemester,
        division: selectedDivision
      });
      await fetchTimetable();
      await fetchSubjects();
      await fetchAuditLogs();
      showToast(`Timetable cleared successfully! ${response.data.deletedCount} entries removed.`, 'success');
      setSelectedSlot(null);
      setSelectedSubject('');
      setConflicts([]);
      setWarnings([]);
    } catch (error) {
      console.error(error);
      showToast('Error resetting timetable: ' + (error.response?.data?.error || error.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) { alert('Please select program, semester, and division first'); return; }
    if (timetable.length === 0) { alert('No timetable data to export'); return; }
    setExportingPDF(true);
    try {
      await exportTimetableToPDF({
        timetable,
        subjects,
        teachers,
        department: selectedDepartmentRecord?.department_name || selectedDepartmentRecord?.name || selectedProgram,
        semester: selectedSemesterRecord?.semester_number ? `Semester ${selectedSemesterRecord.semester_number}` : `Semester ${selectedSemester}`,
        division: (divisions.find((item) => String(item._id) === String(selectedDivision))?.division_name || selectedDivision),
        classroom: timetableClassroom,
        academicYear: selectedSemesterRecord?.academic_year || new Date().getFullYear() + '-' + String(new Date().getFullYear() + 1).slice(-2),
        filename: `Timetable_${selectedProgram.replace(/[^a-zA-Z0-9]/g, '')}_${selectedClass}_Sem${selectedSemester}_${selectedDivision}.pdf`,
      });
      showToast('Timetable exported successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to export PDF', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) { alert('Please select program, semester, and division first'); return; }
    if (timetable.length === 0) { alert('No timetable data to export'); return; }
    setExportingExcel(true);
    try {
      await exportTimetableToExcel({
        title: `Weekly Timetable — ${selectedProgram} ${selectedClass} Sem-${selectedSemester} ${selectedDivision}`,
        filename: `Timetable_${selectedProgram.replace(/[^a-zA-Z0-9]/g, '')}_${selectedClass}_Sem${selectedSemester}_${selectedDivision}.xlsx`,
        days: DAYS,
        timeSlots: TIME_SLOTS,
        timetable,
      });
      showToast('Excel exported successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to export Excel', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedProgram || !selectedSemester || !selectedDivision) { alert('Please select program, semester, and division first'); return; }
    if (timetable.length === 0) { alert('No timetable data to export'); return; }
    setExportingCSV(true);
    try {
      await exportTimetableToCSV({
        title: `Weekly Timetable — ${selectedProgram} ${selectedClass} Sem-${selectedSemester} ${selectedDivision}`,
        filename: `Timetable_${selectedProgram.replace(/[^a-zA-Z0-9]/g, '')}_${selectedClass}_Sem${selectedSemester}_${selectedDivision}.csv`,
        days: DAYS,
        timeSlots: TIME_SLOTS,
        timetable,
      });
      showToast('CSV exported successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to export CSV', 'error');
    } finally {
      setExportingCSV(false);
    }
  };

  const getEntryForSlot = (day, time) =>
    timetable.find((entry) => entry.day === day && entry.timeSlot === time);

  const getId = (value) => (value && typeof value === 'object' ? value._id : value);
  const getTeacherForEntry = (entry) => {
    if (entry.teacherId && typeof entry.teacherId === 'object') return entry.teacherId;
    const teacherId = getId(entry.teacherId);
    return Array.isArray(teachers) ? teachers.find((teacher) => String(teacher._id) === String(teacherId)) : null;
  };
  const getRoomForEntry = (entry) => {
    if (entry.classroomId && typeof entry.classroomId === 'object') return entry.classroomId;
    const roomId = getId(entry.classroomId);
    return Array.isArray(classrooms) ? classrooms.find((room) => String(room._id) === String(roomId)) : null;
  };
  const getTeacherName = (entry) => {
    const teacher = getTeacherForEntry(entry);
    return teacher?.faculty_name || teacher?.name || teacher?.teacher_name || (entry.teacherId ? `Faculty ${getId(entry.teacherId)}` : 'Unassigned faculty');
  };
  const getRoomName = (entry) => {
    const room = getRoomForEntry(entry);
    return room?.roomNumber || room?.room_name || room?.lab_name || room?.room_number || 'Room not assigned';
  };
  const getSubjectForEntry = (entry) => {
    if (entry.subjectId && typeof entry.subjectId === 'object') return entry.subjectId;
    const subjectId = getId(entry.subjectId);
    return Array.isArray(subjects) ? subjects.find((subject) => String(subject._id) === String(subjectId)) : null;
  };
  const selectedDepartmentRecord = departments.find((department) => String(department._id) === String(selectedProgram));
  const selectedSemesterRecord = semesters.find((semester) => String(semester._id) === String(selectedSemester));
  const divisionRoom = classrooms.find((room) => String(room.division_id || room.divisionId) === String(selectedDivision)) || getRoomForEntry(timetable[0] || {});
  const timetableClassroom = divisionRoom?.roomNumber || divisionRoom?.room_name || divisionRoom?.lab_name || 'Not assigned';
  const timetableAllocationDetails = Object.values(timetable.reduce((allocation, entry) => {
    const subject = getSubjectForEntry(entry);
    const teacher = getTeacherForEntry(entry);
    if (!subject || !teacher) return allocation;
    const key = `${getId(subject)}:${getId(teacher)}`;
    if (!allocation[key]) allocation[key] = { subject, teacher, periods: 0, isLab: false };
    allocation[key].periods += Number(entry.duration) || (entry.isLab || entry.slot_type === 'LAB' ? 2 : 1);
    allocation[key].isLab ||= entry.isLab || entry.slot_type === 'LAB';
    return allocation;
  }, {}));

  const activeDays = holidays.length > 0 ? DAYS.filter(d => !holidays.includes(d)) : DAYS;
  const activePeriods = TIME_SLOTS.filter(t => !BREAK_SLOTS.includes(t));
  const { totalSlots } = calculateTimetableCapacity(activeDays, activePeriods);
  const filledSlots = timetable.length;
  const progressPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  const selectCls =
    'w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl text-sm text-slate-700 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' +
    'hover:border-blue-400 transition-colors duration-150 appearance-none cursor-pointer ' +
    'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';

  const cardCls = 'bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden';
  const cardHeaderCls = 'px-6 py-5 border-b border-slate-100 flex items-center gap-3';

  return (
    <>
      {/* ── EXISTING MODALS ── */}
      <SmartGenerateModal
        open={smartModal}
        onClose={() => setSmartModal(false)}
        config={smartConfig}
        setConfig={setSmartConfig}
        subjects={subjects}
        classrooms={classrooms}
        onConfirm={handleSmartGenerate}
        generating={autoGenerating}
      />
      <CopyTimetableModal
        open={copyModal}
        onClose={() => { setCopyModal(false); setTargetCopyDivision(''); }}
        sourceDivision={selectedDivision}
        targetDivision={targetCopyDivision}
        setTargetDivision={setTargetCopyDivision}
        onConfirm={handleCopyTimetable}
        copying={copying}
      />

      {/* ── NEW ERP SLOT MANAGEMENT MODALS ── */}
      
      {/* 1. View Details Modal */}
      {detailsModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Lecture Allocation Details</h3>
              </div>
              <button onClick={() => setDetailsModalEntry(null)} className="text-white/70 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="space-y-1.5 pb-3 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</span>
                <p className="font-bold text-slate-800 text-base">{detailsModalEntry.subjectId?.subject_name || 'No subject'}</p>
                <p className="text-xs text-indigo-600 font-bold">{detailsModalEntry.subjectId?.subject_code}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Faculty</span>
                  <p className="font-bold text-slate-700">{detailsModalEntry.teacherId?.faculty_name || 'N/A'}</p>
                  <p className="text-xs text-slate-400">ID: {detailsModalEntry.teacherId?.teacherID || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Classroom</span>
                  <p className="font-bold text-slate-700">Room {detailsModalEntry.classroom?.roomNumber || detailsModalEntry.classroom?.room_name || detailsModalEntry.classroom?.lab_name || detailsModalEntry.classroomId?.roomNumber || detailsModalEntry.classroomId?.room_name || detailsModalEntry.classroomId?.lab_name || 'N/A'}</p>
                  <p className="text-xs text-slate-400">Capacity: {detailsModalEntry.classroom?.capacity || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Timeslot</span>
                  <p className="font-bold text-slate-700">{detailsModalEntry.day}</p>
                  <p className="text-xs text-slate-500 font-medium">{detailsModalEntry.timeSlot}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Duration</span>
                  <p className="font-bold text-slate-700">{detailsModalEntry.isLab ? '2 Hours (Lab)' : '1 Hour (Lecture)'}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setDetailsModalEntry(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 text-xs font-bold rounded-lg transition-colors border-0 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Edit Slot Modal */}
      {editModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="bg-indigo-600 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Edit Timetable Slot</h3>
              </div>
              <button onClick={() => setEditModalEntry(null)} className="text-white/70 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Faculty selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Faculty</label>
                <select
                  value={editForm.teacherId}
                  onChange={(e) => handleEditFormChange({ teacherId: e.target.value })}
                  className={selectCls}
                >
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.faculty_name} {teacher.department ? `(${teacher.department})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">Availability is checked before the change is saved.</p>
              </div>

              {/* Day & Time Slot selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Day</label>
                  <select
                    value={editForm.day}
                    onChange={(e) => handleEditFormChange({ day: e.target.value })}
                    className={selectCls}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Timeslot</label>
                  <select
                    value={editForm.timeSlot}
                    onChange={(e) => handleEditFormChange({ timeSlot: e.target.value })}
                    className={selectCls}
                  >
                    {TIME_SLOTS.filter(s => !BREAK_SLOTS.includes(s)).map(ts => (
                      <option key={ts} value={ts}>{ts}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Safety Checks */}
              {(!editValidation.isValid || editValidation.warnings.length > 0) && (
                <div className="rounded-xl p-3.5 space-y-1.5 text-xs border bg-amber-50/40 border-amber-100">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" /> Scheduling Warnings
                  </div>
                  {editValidation.errors.map((err, idx) => (
                    <p key={idx} className="text-red-700">• {err}</p>
                  ))}
                  {editValidation.warnings.map((warn, idx) => (
                    <p key={idx} className="text-amber-700">• {warn}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setEditModalEntry(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEdit}
                disabled={editLoading || !editValidation.isValid}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg border-0 cursor-pointer disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Confirm Edit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Replace Faculty Modal */}
      {replacementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="bg-purple-700 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Find Best AI Substitute</h3>
              </div>
              <button onClick={() => setReplacementModal(null)} className="text-white/70 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-purple-50/50 rounded-xl border border-purple-100 p-4 text-xs">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">Current lecture details</span>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 mt-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Subject</p>
                    <p className="font-bold text-slate-800 mt-0.5">{replacementModal.subjectName || 'Lecture'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Assigned faculty</p>
                    <p className="font-bold text-slate-800 mt-0.5">{replacementModal.teacherName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Classroom</p>
                    <p className="font-bold text-slate-800 mt-0.5">{replacementModal.classroomName || 'Not assigned'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Day & time</p>
                    <p className="font-bold text-slate-800 mt-0.5">{replacementModal.day} · {replacementModal.timeSlot}</p>
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI-ranked recommendations</h4>

              {replacementLoading ? (
                <div className="text-center py-8 text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Analyzing Schedules...</span>
                </div>
              ) : replacementCandidates.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">No other teachers registered in this department.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {replacementCandidates.map(c => (
                    <div
                      key={c.id}
                      className={`border rounded-xl p-3.5 flex justify-between items-center transition-all ${
                        c.conflict ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-sm">{c.faculty_name}</p>
                          <span className="text-[10px] text-slate-400 font-bold">({c.department})</span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-slate-500 font-semibold">
                          <span>Current load: <strong className="text-slate-700">{c.workload}%</strong></span>
                          <span>• Availability: <strong className={c.available ? 'text-emerald-600' : 'text-red-500'}>{c.available ? 'Available' : 'Busy'}</strong></span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic font-medium leading-normal">{c.reasons.join(', ')}</p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2 shrink-0">
                        <div className="bg-purple-50 border border-purple-100 rounded px-2 py-0.5">
                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Confidence: {c.compatibility}%</span>
                        </div>
                        <button
                          disabled={c.conflict}
                          onClick={() => handleApplyReplacement(c.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer transition-colors"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setReplacementModal(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Move Slot Modal */}
      {moveModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="bg-indigo-600 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Move className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Move Lecture Period</h3>
              </div>
              <button onClick={() => setMoveModalEntry(null)} className="text-white/70 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 text-xs">
                <p className="text-slate-400 font-bold uppercase tracking-wider">Shifting slot</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{moveModalEntry.subjectId?.subject_name}</p>
                <p className="text-slate-500 font-medium mt-0.5">Current: {moveModalEntry.day} · {moveModalEntry.timeSlot}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Day</label>
                  <select
                    value={moveForm.day}
                    onChange={(e) => handleMoveFormChange({ day: e.target.value })}
                    className={selectCls}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Timeslot</label>
                  <select
                    value={moveForm.timeSlot}
                    onChange={(e) => handleMoveFormChange({ timeSlot: e.target.value })}
                    className={selectCls}
                  >
                    {TIME_SLOTS.filter(ts => !BREAK_SLOTS.includes(ts)).map(ts => (
                      <option key={ts} value={ts}>{ts}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Safety checks feedback */}
              <div className="pt-2">
                {moveValidation.isValid ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50/40 border border-emerald-100 rounded-lg p-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Safe Move: Slot is fully open & eligible.</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50/40 border border-red-100 rounded-lg p-2.5">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block uppercase tracking-wide">Overlap Collision</span>
                      <p className="mt-0.5">{moveValidation.errors[0] || 'Teacher or room is occupied.'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setMoveModalEntry(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMove}
                disabled={!moveValidation.isValid}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg border-0 cursor-pointer disabled:opacity-50"
              >
                Apply Shifting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation & Impact Analysis Modal */}
      {deleteConfirmEntry && deleteImpact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="bg-red-600 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base">Confirm Deletion</h3>
              </div>
              <button onClick={() => { setDeleteConfirmEntry(null); setDeleteImpact(null); }} className="text-white/70 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-xs leading-relaxed">
                You are about to delete the following scheduled slot. Review the calculated syllabus and workload impact below:
              </p>

              <div className="space-y-3 bg-red-50/20 border border-red-100/50 rounded-xl p-4">
                {/* Subject Coverage Impact */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Syllabus Coverage</span>
                  <div className="flex items-center justify-between text-xs">
                    <p className="font-bold text-slate-800">{deleteImpact.subjectName} ({deleteImpact.subjectCode})</p>
                    <p className="text-red-600 font-bold">-{deleteImpact.deletedCount} period(s)</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold pt-1">
                    <span>Current: <strong className="text-slate-700">{deleteImpact.oldCoverage}%</strong></span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-450" />
                    <span>Projected: <strong className="text-red-600">{deleteImpact.newCoverage}%</strong></span>
                  </div>
                </div>

                <div className="h-px bg-red-100/40 my-2"></div>

                {/* Teacher Workload Impact */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Workload Assignment</span>
                  <div className="flex items-center justify-between text-xs">
                    <p className="font-bold text-slate-800">Faculty: {deleteImpact.teacherName}</p>
                    <p className="text-slate-500 font-semibold">-{deleteImpact.deletedCount}h</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold pt-1">
                    <span>Current: <strong className="text-slate-700">{deleteImpact.oldWorkload}h</strong></span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-450" />
                    <span>Projected: <strong className="text-slate-850">{deleteImpact.newWorkload}h</strong></span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => { setDeleteConfirmEntry(null); setDeleteImpact(null); }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg border-0 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. AI Suggest Fix Modal */}
      {aiSuggestFixEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-amber-100 overflow-hidden animate-scaleIn">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">AI Resolution Suggestions</h3>
              </div>
              <button onClick={() => setAiSuggestFixEntry(null)} className="text-white/70 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50/30 border border-amber-150 rounded-xl p-3 text-xs">
                <p className="text-slate-450 font-bold uppercase tracking-wider">Resolving conflicts for</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{aiSuggestFixEntry.subjectId?.subject_name}</p>
                <p className="text-slate-500 font-semibold mt-0.5">{aiSuggestFixEntry.teacherId?.faculty_name}</p>
              </div>

              {aiSuggestionsLoading ? (
                <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Running AI Schedulers...</span>
                </div>
              ) : aiSuggestions.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">No safe auto-relocations detected.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {aiSuggestions.map((s, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-sm rounded-xl p-4 space-y-2 transition-all">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wider">{s.type === 'MOVE' ? 'Move Slot' : 'Faculty Substitution'}</span>
                        <span className="text-slate-500">Rec Score: {s.score}/100</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {s.description}
                      </p>
                      <p className="text-xs text-slate-500 leading-normal">{s.reason}</p>
                      <button
                        onClick={() => handleApplyAISuggestion(s)}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs border-0 cursor-pointer transition-colors mt-2"
                      >
                        Apply AI Fix
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
              <button
                onClick={() => setAiSuggestFixEntry(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Lecture Modal */}
      {addLectureModalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Schedule Lecture Period</h3>
              </div>
              <button onClick={() => setAddLectureModalSlot(null)} className="text-white/70 hover:text-white text-xl font-bold bg-transparent border-0 cursor-pointer">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Slot</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{addLectureModalSlot.day} @ {addLectureModalSlot.timeSlot}</p>
              </div>

              {/* Subject Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</label>
                <select
                  value={addForm.subjectId}
                  onChange={(e) => handleAddFormChange({ subjectId: e.target.value })}
                  className={selectCls}
                  disabled={subjectsLoading}
                >
                  <option value="">{subjectsLoading ? 'Loading contextual subjects…' : 'Choose a subject…'}</option>
                  {subjects
                    .map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.subject_code} · {subject.subject_name} · Sem {subject.semester} · {subject.department || subject.program} · {subject.type} · {subject.assignedTeacherCount || 0} faculty
                      </option>
                    ))}
                </select>
                {subjectsError && <p className="text-[11px] text-red-600 mt-1">{subjectsError}</p>}
                {!subjectsLoading && !subjectsError && subjects.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No subjects are assigned to the selected semester. Please assign subjects before generating the timetable.</p>
                )}
              </div>

              {/* Faculty Selection — populated only after selecting a contextual subject */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Faculty</label>
                <select
                  value={addForm.teacherId}
                  onChange={(e) => handleAddFormChange({ teacherId: e.target.value })}
                  className={selectCls}
                  disabled={!addForm.subjectId}
                >
                  <option value="">{teachersLoading ? 'Loading contextual faculty…' : addForm.subjectId ? 'Choose an available faculty member…' : 'Select a subject first…'}</option>
                  {teachers.map((teacher) => (
                    <option 
                      key={teacher._id} 
                      value={teacher._id}
                      disabled={teacher.availabilityStatus !== 'available'}
                    >
                      {teacher.faculty_name || teacher.name} · {teacher.teacherID} · {teacher.availabilityStatus === 'available' ? 'Available' : 'Busy'} · {teacher.currentWorkload}/{teacher.workloadLimit} hrs {teacher.is_primary_teacher ? '· 🏆 Primary Faculty' : teacher.is_replacement ? '· 🔄 Replacement Faculty' : ''}
                    </option>
                  ))}
                </select>
                {teachersError && <p className="text-[11px] text-red-600 mt-1">{teachersError}</p>}
                {addForm.subjectId && !teachersLoading && !teachersError && teachers.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No faculty assigned to this subject. Please map a faculty member first.</p>
                )}
                {addForm.teacherId && teachers.find((teacher) => teacher._id === addForm.teacherId)?.workloadWarning && (
                  <p className="text-[11px] text-amber-600 mt-1">{teachers.find((teacher) => teacher._id === addForm.teacherId).workloadWarning}</p>
                )}
              </div>

              {/* Lab session toggle */}
              <div className="flex items-center space-x-2 py-1.5">
                <input
                  type="checkbox"
                  id="isLabModalCheck"
                  checked={addForm.isLab}
                  onChange={(e) => handleAddFormChange({ isLab: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 bg-gray-50 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isLabModalCheck" className="text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none">
                  Lab Session (Blocks 2 consecutive slots)
                </label>
              </div>

              {/* Real-time Safety alert checks inside creation modal */}
              {addForm.subjectId && (!addValidation.isValid || addValidation.warnings.length > 0) && (
                <div className="rounded-xl p-3.5 space-y-1 text-xs border bg-amber-50/40 border-amber-100">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold uppercase tracking-wider mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Scheduling Conflicts
                  </div>
                  {addValidation.errors.map((err, idx) => (
                    <p key={idx} className="text-red-750 font-medium">• {err}</p>
                  ))}
                  {addValidation.warnings.map((warn, idx) => (
                    <p key={idx} className="text-amber-700">• {warn}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setAddLectureModalSlot(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLecture}
                disabled={loading || !addForm.subjectId || !addForm.teacherId || !addValidation.isValid}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-lg border-0 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Scheduling...' : 'Schedule Period'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT MARKUP ── */}
      <div className="space-y-6 animate-fadeIn text-slate-800 font-sans">
        
        {/* Selector Header Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Program */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
              <div className="relative">
                <select
                  value={selectedProgram}
                  onChange={(e) => { setSelectedProgram(e.target.value); setSelectedSemester(''); setSelectedDivision(''); }}
                  className={selectCls}
                >
                  <option value="">Select Department…</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.department_name}</option>)}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Semester */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Semester</label>
              <div className="relative">
                <select
                  value={selectedSemester}
                  onChange={(e) => { setSelectedSemester(e.target.value); setSelectedDivision(''); }}
                  className={selectCls}
                  disabled={!selectedProgram}
                >
                  <option value="">Select Semester…</option>
                  {semesters.map((s) => <option key={s._id} value={s._id}>Semester {s.semester_number} ({s.academic_year})</option>)}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Division */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Division</label>
              <div className="relative">
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className={selectCls}
                  disabled={!selectedProgram || !selectedSemester}
                >
                  <option value="">Select Division…</option>
                  {divisions.map((d) => <option key={d._id} value={d._id}>{d.division_name}</option>)}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {selectedProgram && selectedSemester && selectedDivision ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* ── SCHEDULE BUILDER VIEW GRID (75%) ── */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Breadcrumb Header Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 shadow-sm p-6 rounded-2xl">
                <div className="flex flex-wrap items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>{departments.find(d => d._id === selectedProgram)?.short_name || 'Department'}</span>
                  <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
                  <span>Semester {semesters.find(s => s._id === selectedSemester)?.semester_number || ''}</span>
                  <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 shrink-0" />
                  <span className="text-indigo-600 bg-indigo-50 border border-indigo-100/40 px-2 py-0.5 rounded">Division {divisions.find(d => d._id === selectedDivision)?.division_name || ''}</span>
                </div>

                {/* Top Toolbar Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSaveTimetable}
                    disabled={saving || conflicts.length > 0}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    onClick={handleSaveGenerated}
                    disabled={saving || conflicts.length > 0 || timetable.length === 0}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-[#6366F1] hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm hover:shadow border-0 cursor-pointer"
                  >
                    {saving ? 'Publishing...' : 'Save & Publish'}
                  </button>

                  {/* Export dropdown menu */}
                  <div className="relative">
                    <button
                      onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 bg-white transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export
                    </button>
                    {exportDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setExportDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg z-50 py-1.5 animate-fadeIn">
                          <button
                            onClick={() => { setExportDropdownOpen(false); handleExportPDF(); }}
                            disabled={exportingPDF || timetable.length === 0}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" /> Export PDF
                          </button>
                          <button
                            onClick={() => { setExportDropdownOpen(false); handleExportExcel(); }}
                            disabled={exportingExcel || timetable.length === 0}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" /> Export Excel
                          </button>
                          <button
                            onClick={() => { setExportDropdownOpen(false); handleExportCSV(); }}
                            disabled={exportingCSV || timetable.length === 0}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button
                            onClick={() => { setExportDropdownOpen(false); handleShareTimetable(); }}
                            disabled={sharing}
                            className="w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                          >
                            <Share2 className="w-3.5 h-3.5 text-indigo-500" /> Copy Share Link
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setMoreActionsDropdownOpen(!moreActionsDropdownOpen)}
                      className="flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 bg-white transition-all cursor-pointer font-bold text-xs"
                    >
                      •••
                    </button>
                    {moreActionsDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMoreActionsDropdownOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg z-50 py-1.5 animate-fadeIn">
                          <button
                            onClick={() => { setMoreActionsDropdownOpen(false); setCopyModal(true); }}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer font-semibold flex items-center gap-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Copy Division
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button
                            onClick={() => { setMoreActionsDropdownOpen(false); handleResetTimetable(); }}
                            disabled={loading}
                            className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 border-0 bg-transparent cursor-pointer font-bold flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" /> Reset Timetable
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Completion indicator */}
              <div className={cardCls}>
                <div className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule Completion</span>
                      <span className="text-xs font-bold text-indigo-600">{filledSlots} / {totalSlots} slots · {progressPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-indigo-50 rounded-full overflow-hidden border border-slate-100/20">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <section className={`${cardCls} print:shadow-none print:border-slate-300`}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <div><h2 className="text-base font-bold text-slate-800">Timetable Information</h2><p className="text-xs text-slate-400">University class schedule context</p></div>
                </div>
                <dl className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100">
                  {[
                    ['Department', selectedDepartmentRecord?.department_name || selectedDepartmentRecord?.short_name || '—'],
                    ['Semester', selectedSemesterRecord ? `Semester ${selectedSemesterRecord.semester_number}` : '—'],
                    ['Division', divisions.find((division) => String(division._id) === String(selectedDivision))?.division_name || '—'],
                    ['Classroom', timetableClassroom],
                    ['Academic Year', selectedSemesterRecord?.academic_year || divisionRoom?.year || '—'],
                  ].map(([label, value]) => <div key={label} className="px-4 py-4 min-w-0"><dt className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</dt><dd className="mt-1 text-sm text-slate-800 font-semibold truncate" title={value}>{value}</dd></div>)}
                </dl>
              </section>

              {/* Scheduling Grid */}
              <div className={cardCls}>
                <div className={cardHeaderCls}>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Weekly Schedule Grid</h2>
                    <p className="text-xs text-slate-400">Hover empty slot to "+ Add Period", or drag cards to reschedule</p>
                  </div>
                </div>

                <div className="p-3 sm:p-6" id="timetable-export-container">
                  <div className="overflow-x-auto md:overflow-visible rounded-xl border border-slate-100">
                    
                      <table className="min-w-[960px] w-full table-fixed border-collapse text-sm">
                        <colgroup>
                          <col className="w-[120px]" />
                          {DAYS.map((day) => <col key={day} className="min-w-[140px]" />)}
                        </colgroup>
                        <thead>
                          <tr className="bg-slate-900 text-white border-0">
                            <th className="px-2 sm:px-4 py-3.5 text-left text-xs font-semibold tracking-wider sticky left-0 bg-slate-900 z-20">Time</th>
                            {DAYS.map((day) => (
                              <th key={day} className="px-1 sm:px-3 py-3.5 text-center text-[10px] sm:text-xs font-semibold tracking-wider break-words">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {TIME_SLOTS.map((time, rowIdx) => {
                            const isBreak = isBreakSlot(time);
                            return (
                              <tr key={time} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className={`px-4 py-3 text-xs font-semibold sticky left-0 z-10 border-r border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} ${isBreak ? 'text-slate-400' : 'text-indigo-600 font-bold'}`}>
                                  {time}
                                </td>
                                {DAYS.map((day) => {
                                  const entry = getEntryForSlot(day, time);
                                  const isHolidayDay = isHoliday(day);

                                  if (isBreak) {
                                    return (
                                      <td key={`${day}-${time}`} className="border-l border-slate-100 px-2 py-2.5 h-[112px]">
                                        <div className="h-[100px] flex items-center justify-center rounded-lg bg-slate-100/60 border border-slate-200/20">
                                          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Break</span>
                                        </div>
                                      </td>
                                    );
                                  }

                                  if (isHolidayDay) {
                                    return (
                                      <td key={`${day}-${time}`} className="border-l border-slate-100 px-2 py-2.5 h-[112px]">
                                        <div className="h-[100px] flex flex-col items-center justify-center rounded-lg bg-red-50/50 border border-red-100/40">
                                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Holiday</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  
                                  if (entry && entry.slot_type === 'FREE') {
                                    return (
                                      <td key={`${day}-${time}`} className="border-l border-slate-100 px-2 py-2.5 align-top h-[112px]">
                                        <div className="flex flex-col items-center justify-center h-[100px] bg-slate-50 border border-slate-200 border-dashed rounded-lg p-2">
                                          <span className="font-bold text-slate-400">FREE</span>
                                          <span className="text-[10px] text-slate-500 text-center mt-1">Free Period</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  
                                  if (entry && entry.slot_type === 'LIBRARY') {
                                    return (
                                      <td key={`${day}-${time}`} className="border-l border-slate-100 px-2 py-2.5 align-top h-[112px]">
                                        <div className="flex flex-col items-center justify-center h-[100px] bg-indigo-50/50 border border-indigo-200/50 rounded-lg p-2">
                                          <span className="font-bold text-indigo-500">📚 Library / Self Study</span>
                                        </div>
                                      </td>
                                    );
                                  }

                                  const cellId = `${day}|${time}`;

                                  return (
                                    <td
                                      key={cellId}
                                      id={cellId}
                                      data-holiday={isHolidayDay}
                                      onClick={() => handleSlotClick(day, time)}
                                      className={`border-l border-slate-100 p-2 h-[112px] cursor-pointer transition-all duration-150 relative ${
                                        entry ? 'bg-[#F8FAFC]' : 'hover:bg-slate-50/50'
                                      }`}
                                    >
                                      {entry ? (() => {
                                        const subject = getSubjectForEntry(entry);
                                        const colorCls = getSubjectColorClasses(subject?.subject_code, entry.isLab);
                                        const isLabEntry = entry.isLab || entry.slot_type === 'LAB';
                                        return (
                                          <div className="select-none">
                                            <div className={`rounded-lg border ${colorCls.border} ${isLabEntry ? 'bg-slate-800 border-slate-700' : 'bg-white'} shadow-sm p-2.5 group transition-all duration-200 hover:shadow-md relative h-[100px] overflow-hidden flex flex-col justify-center`}>
                                              <div className="flex items-start justify-between gap-1.5 pr-5">
                                                <div className="min-w-0"><p className={`text-xs font-bold ${isLabEntry ? 'text-white' : colorCls.text} leading-snug line-clamp-2`}>{subject?.subject_name || 'Subject unavailable'}</p><p className={`mt-0.5 text-[9px] font-semibold tracking-wide truncate ${isLabEntry ? 'text-slate-300' : 'text-slate-400'}`}>{subject?.subject_code || '—'}</p></div>
                                                {isLabEntry && (
                                                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase shrink-0 tracking-wider bg-indigo-500 text-white border border-indigo-300">
                                                    LAB
                                                  </span>
                                                )}
                                              </div>

                                              {/* Slot actions */}
                                              <div className="absolute top-2 right-2 print:hidden z-30">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const menuWidth = 196;
                                                    const menuHeight = 132;
                                                    setActionMenu({
                                                      context: buildEntryContext(entry),
                                                      top: rect.bottom + 6 + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
                                                      left: Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8),
                                                    });
                                                  }}
                                                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all cursor-pointer font-bold"
                                                >
                                                  <MoreVertical className="w-3.5 h-3.5" />
                                                </button>
                                                
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })() : (
                                        <div className="rounded-lg h-[100px] border border-dashed border-slate-200 py-4 px-2 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                          <span className="text-[10px] font-bold text-slate-350 uppercase tracking-wider">+ Add Lecture</span>
                                        </div>
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

              <section className={`${cardCls} print:shadow-none print:border-slate-300`}>
                <div className={cardHeaderCls}><BookOpen className="w-4 h-4 text-indigo-600" /><div><h2 className="text-base font-bold text-slate-800">Timetable Allocation Details</h2><p className="text-xs text-slate-400">Subject and faculty assignments in this timetable</p></div></div>
                <div className="overflow-x-auto">
                  <table className="min-w-[860px] w-full text-sm"><thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Subject Code</th><th className="px-5 py-3">Subject Name</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Faculty ID</th><th className="px-5 py-3">Faculty Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3 text-right">Total Periods</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{timetableAllocationDetails.length ? timetableAllocationDetails.map(({ subject, teacher, periods, isLab }) => <tr key={`${getId(subject)}:${getId(teacher)}`}><td className="px-5 py-3 font-mono text-xs text-slate-500">{subject.subject_code || '—'}</td><td className="px-5 py-3 font-semibold text-slate-800">{subject.subject_name || '—'}</td><td className="px-5 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${isLab ? 'bg-slate-800 text-white' : 'bg-indigo-50 text-indigo-700'}`}>{isLab ? 'LAB' : 'THEORY'}</span></td><td className="px-5 py-3 font-mono text-xs text-slate-500">{teacher.teacher_id || teacher.teacherId || '—'}</td><td className="px-5 py-3 font-semibold text-slate-800">{teacher.faculty_name || teacher.name || '—'}</td><td className="px-5 py-3 text-slate-500">{teacher.email || '—'}</td><td className="px-5 py-3 text-right font-bold text-slate-700">{periods}</td></tr>) : <tr><td colSpan="7" className="px-5 py-6 text-center text-sm text-slate-400">No timetable allocations available.</td></tr>}</tbody>
                  </table>
                </div>
              </section>

              {/* Holidays Selection */}
              <div className={cardCls}>
                <div className={cardHeaderCls}>
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Weekly Holidays</h2>
                    <p className="text-xs text-slate-400">Lock off entire days from slots scheduling</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {DAYS.map((day) => {
                      const isHol = holidays.includes(day);
                      const dayEntries = timetable.filter(entry => entry.day === day);
                      return (
                        <label
                          key={day}
                          className={`relative flex flex-col items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                            isHol
                              ? 'border-red-200 bg-red-50/50 shadow-sm'
                              : 'border-slate-100 bg-white hover:border-indigo-100 hover:bg-indigo-50/10'
                          } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          <input type="checkbox" checked={isHol} onChange={() => toggleHoliday(day)} className="sr-only" />
                          <span className={`text-xs font-bold uppercase tracking-wider ${isHol ? 'text-red-600' : 'text-slate-500'}`}>{day.slice(0, 3)}</span>
                          {isHol ? (
                            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Holiday</span>
                          ) : dayEntries.length > 0 ? (
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{dayEntries.length} slots</span>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold">—</span>
                          )}
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isHol ? 'bg-red-500 border-red-500' : 'border-slate-300 bg-white'}`}>
                            {isHol && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN: TABBED AI COPILOT & ACTIVITY LOG (25%) ── */}
            <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 py-3 text-center text-xs font-bold uppercase tracking-wider text-indigo-650">
                  <Bot className="inline-block w-4 h-4 mr-1.5" /> AI Copilot
                </div>

                {/* Tab content wrapper */}
                <div className="p-6 space-y-6">
                  {activeRightTab === 'copilot' ? (
                    <>
                      {/* Optimization Tools */}
                      <div className="space-y-2.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto Utilities</h4>
                        <button
                          onClick={() => handleAutoGenerate('fill')}
                          disabled={autoGenerating}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {autoGenerating ? 'Optimizing...' : 'Smart Fill Remaining'}
                        </button>
                        <button
                          onClick={() => handleAutoGenerate('full')}
                          disabled={autoGenerating}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${autoGenerating ? 'animate-spin' : ''}`} />
                          {autoGenerating ? 'Rebuilding...' : 'AI Full Rebuild'}
                        </button>
                      </div>

                      {/* Neutral sync status. Conflict detection remains enforced by save APIs. */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Status</h4>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                          <CheckCircle2 className="w-7 h-7 text-indigo-500 mx-auto mb-1.5" />
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Schedule information synced</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Changes are checked when saved or published.</p>
                        </div>
                      </div>

                      {autoGenerateResult && (
                        <div className={`rounded-xl border p-4 space-y-1.5 animate-fadeIn text-xs bg-green-50/30 border-green-200 text-green-800`}>
                          <p className="font-bold uppercase tracking-wider text-[9px] opacity-80">Generation Log</p>
                          <div className="space-y-1 text-[11px] mt-1">
                            <p>Assigned periods: <strong>{autoGenerateResult.assignedLectures || 0}</strong></p>
                            <p>Slots skipped: <strong>{autoGenerateResult.skippedSlots || 0}</strong></p>
                            {autoGenerateResult.summary?.unassignedSubjects?.length > 0 && (
                              <p className="text-red-500 mt-1">Skipped Subjects: {autoGenerateResult.summary.unassignedSubjects.join(', ')}</p>
                            )}
                            {autoGenerateResult.skippedDetails?.length > 0 && (
                              <div className="text-orange-600 mt-1 max-h-24 overflow-y-auto">
                                Skip Details:<br/>
                                {autoGenerateResult.skippedDetails.map((e,i)=><div key={i}>- {e}</div>)}
                              </div>
                            )}
                            {autoGenerateResult.errors?.length > 0 && (
                              <div className="text-red-600 mt-1 max-h-24 overflow-y-auto">Errors:<br/>{autoGenerateResult.errors.map((e,i)=><div key={i}>- {e}</div>)}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* History Tab content displaying live audit trail */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Trail</h4>
                        <button
                          onClick={fetchAuditLogs}
                          className="text-[10px] text-indigo-600 font-bold hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          Refresh
                        </button>
                      </div>

                      {auditLoading ? (
                        <div className="text-center py-6 text-slate-400 text-xs">Loading logs...</div>
                      ) : auditLogs.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-400">No modifications logged yet.</p>
                      ) : (
                        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                          {auditLogs.map((log) => {
                            let actionColor = 'bg-slate-100 text-slate-700';
                            if (log.actionType === 'ADD') actionColor = 'bg-green-100 text-green-800';
                            if (log.actionType === 'DELETE') actionColor = 'bg-red-150 text-red-800';
                            if (log.actionType === 'MOVE') actionColor = 'bg-blue-100 text-blue-800';
                            if (log.actionType === 'REPLACE') actionColor = 'bg-purple-100 text-purple-800';

                            return (
                              <div key={log._id} className="border border-slate-100 rounded-xl p-3 space-y-1.5 hover:shadow-xs transition-shadow">
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${actionColor}`}>{log.actionType}</span>
                                  <span className="text-slate-400 font-semibold">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-normal font-medium">{log.details}</p>
                                <p className="text-[9px] text-slate-400">By {log.userId?.username || 'Admin'}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100/40 flex items-center justify-center mx-auto text-indigo-600">
              <Calendar className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Timetable Selected</h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
              Please choose a Program, Class, Semester, and Division in the selectors above to load or create a weekly timetable.
            </p>
          </div>
        )}

      </div>
      {actionMenu && createPortal(
        <>
          <div className="fixed inset-0 z-[1000]" onClick={() => setActionMenu(null)} />
          <div
            className="fixed z-[1001] w-[196px] rounded-xl border border-slate-200 bg-white py-1.5 text-left shadow-xl"
            style={{ top: actionMenu.top, left: actionMenu.left }}
            onClick={(event) => event.stopPropagation()}
          >
            <button onClick={() => { const context = actionMenu.context; setActionMenu(null); setReplacementModal(context); fetchReplacementEligibility(context); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 border-0 bg-transparent cursor-pointer">
              <UserX className="h-3.5 w-3.5" /> Replace Teacher
            </button>
            <button onClick={() => { const entry = actionMenu.context.entry; setActionMenu(null); handleEditSlot(entry); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 border-0 bg-transparent cursor-pointer">
              <Edit3 className="h-3.5 w-3.5" /> Update Lecture
            </button>
            <div className="my-1 h-px bg-slate-100" />
            <button onClick={() => { const entry = actionMenu.context.entry; setActionMenu(null); handleDeleteSlotClick(entry); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 border-0 bg-transparent cursor-pointer">
              <Trash2 className="h-3.5 w-3.5" /> Delete Lecture
            </button>
          </div>
        </>, document.body
      )}
    </>
  );
}

