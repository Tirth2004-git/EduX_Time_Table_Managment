import connectDB from './mongodb';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';
import Timetable from '@/models/Timetable';
import { computeTeacherWorkload, computeSubjectPeriods } from './workload-compute';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Recess time slots that cannot be scheduled
const RECESS_SLOTS = ['11:20-12:20', '14:10-14:30'];
// Active teaching slots (excluding breaks)
const ACTIVE_SLOTS = ['09:30-10:25', '10:25-11:20', '12:20-13:15', '13:15-14:10', '14:30-15:25', '15:25-16:20'];
const MAX_LECTURES_PER_DAY = 6;

/**
 * Helper function to extract ID from populated or non-populated field
 */
function extractId(value: any): string {
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return (value as any)._id.toString();
  }
  return value.toString();
}

/**
 * Validates a timetable entry before saving
 * Rules:
 * 0. Cannot schedule during recess/break time slots
 * 1. Teacher not already assigned in same time slot
 * 2. Teacher assignedHours <= teaching_hours
 * 3. Subject allottedPeriods <= requiredPeriods
 * 4. Class time slot must be free (Program + Class + Semester + Division + TimeSlot)
 * 5. Each lecture = 1 hour (implicit)
 */
export async function validateTimetableEntry(
  program: string,
  className: string,
  semester: number,
  division: string,
  day: string,
  timeSlot: string,
  subjectId: string,
  teacherId: string,
  excludeTimetableId?: string
): Promise<ValidationResult> {
  await connectDB();

  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 0: Check if time slot is a break/recess period (skip validation for break slots)
  if (RECESS_SLOTS.includes(timeSlot)) {
    errors.push(`Cannot schedule during break time slot: ${timeSlot}`);
    return { isValid: false, errors };
  }

  // Fetch teacher and subject
  const teacher = await Teacher.findById(teacherId);
  const subject = await Subject.findById(subjectId);

  if (!teacher) {
    errors.push('Teacher not found');
    return { isValid: false, errors };
  }

  if (!subject) {
    errors.push('Subject not found');
    return { isValid: false, errors };
  }

  // Rule 1: Check if teacher is already assigned in same time slot
  const teacherConflict = await Timetable.findOne({
    teacherId,
    day,
    timeSlot,
    _id: { $ne: excludeTimetableId },
  }).populate('subjectId', 'subject_name');

  if (teacherConflict) {
    errors.push(
      `Teacher ${teacher.faculty_name} is already assigned to ${(teacherConflict.subjectId as any).subject_name} at ${day} ${timeSlot}`
    );
  }

  // Rule 2: Check if class time slot is already occupied (Program + Class + Semester + Division + TimeSlot)
  const classConflict = await Timetable.findOne({
    program,
    className,
    semester,
    division,
    day,
    timeSlot,
    _id: { $ne: excludeTimetableId },
  }).populate('subjectId', 'subject_name');

  if (classConflict) {
    errors.push(
      `Class ${program} ${className} Sem-${semester} ${division} already has ${(classConflict.subjectId as any).subject_name} scheduled at ${day} ${timeSlot}`
    );
  }

  // Rule 3: Check teacher workload (division-scoped, dynamically computed)
  // Compute current workload by counting timetable entries for this division context
  const currentWorkload = await computeTeacherWorkload(teacherId, program, className, semester, division);
  const currentAssignedHours = currentWorkload.assignedHours;
  const newAssignedHours = currentAssignedHours + 1;
  const newRemainingHours = currentWorkload.teaching_hours - newAssignedHours;

  // Validation Rule: Only block when exceeding limit (remainingHours < 0)
  // Full capacity (remainingHours === 0) is VALID and should NOT generate warnings
  // remainingHours > 0: Valid, no warning
  // remainingHours === 0: Valid (full load), no warning
  // remainingHours < 0: Invalid, block allocation
  if (newRemainingHours < 0) {
    errors.push(
      `Teacher ${teacher.faculty_name} workload exceeded for ${program} ${className} Sem-${semester} ${division} — slot cannot be assigned. Current: ${currentAssignedHours}/${currentWorkload.teaching_hours}, Adding: +1 would exceed limit.`
    );
  }
  // Note: No warnings for remainingHours === 0 (full capacity is valid)
  // No warnings for remainingHours > 0 (capacity available)

  // Rule 4: Check subject allotted periods (division-scoped, dynamically computed)
  const currentSubjectPeriods = await computeSubjectPeriods(subjectId, program, className, semester, division);
  const currentAllottedPeriods = currentSubjectPeriods.allottedPeriods;
  const newAllottedPeriods = currentAllottedPeriods + 1;
  const newRemainingPeriods = currentSubjectPeriods.requiredPeriods - newAllottedPeriods;

  // Validation Rule: Only block when exceeding limit (remainingPeriods < 0)
  // Full capacity (remainingPeriods === 0) is VALID and should NOT generate warnings
  // remainingPeriods > 0: Valid, no warning
  // remainingPeriods === 0: Valid (full periods), no warning
  // remainingPeriods < 0: Invalid, block allocation
  if (newRemainingPeriods < 0) {
    errors.push(
      `Subject ${subject.subject_name} periods exceeded for ${program} ${className} Sem-${semester} ${division} — slot cannot be assigned. Current: ${currentAllottedPeriods}/${currentSubjectPeriods.requiredPeriods}, Adding: +1 would exceed limit.`
    );
  }
  // Note: No warnings for remainingPeriods === 0 (full capacity is valid)
  // No warnings for remainingPeriods > 0 (capacity available)

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates an existing timetable entry (for save validation)
 * This validates the ACTUAL state without simulating additions
 * Mode: Check current assigned load, not "what if we add +1"
 */
async function validateExistingTimetableEntry(
  entry: any
): Promise<ValidationResult> {
  await connectDB();

  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip validation for break slots
  if (RECESS_SLOTS.includes(entry.timeSlot)) {
    return { isValid: true, errors: [], warnings: undefined };
  }

  // Extract IDs - handle both ObjectId and populated objects
  const subjectIdStr = extractId(entry.subjectId);
  const teacherIdStr = extractId(entry.teacherId);

  // Fetch teacher and subject
  const teacher = await Teacher.findById(teacherIdStr);
  const subject = await Subject.findById(subjectIdStr);

  if (!teacher) {
    errors.push(`Teacher not found for entry at ${entry.day} ${entry.timeSlot}`);
    return { isValid: false, errors };
  }

  if (!subject) {
    errors.push(`Subject not found for entry at ${entry.day} ${entry.timeSlot}`);
    return { isValid: false, errors };
  }

  // Rule 1: Check if teacher is assigned to multiple subjects at same time slot (conflict)
  const teacherConflicts = await Timetable.find({
    teacherId: teacherIdStr,
    day: entry.day,
    timeSlot: entry.timeSlot,
    _id: { $ne: entry._id },
  }).populate('subjectId', 'subject_name');

  if (teacherConflicts.length > 0) {
    const conflictSubjects = teacherConflicts.map((c: any) => (c.subjectId as any).subject_name).join(', ');
    errors.push(
      `Teacher ${teacher.faculty_name} has multiple assignments at ${entry.day} ${entry.timeSlot}: ${conflictSubjects}`
    );
  }

  // Rule 2: Check if class time slot has multiple subjects (conflict)
  const classConflicts = await Timetable.find({
    program: entry.program,
    className: entry.className,
    semester: entry.semester,
    division: entry.division,
    day: entry.day,
    timeSlot: entry.timeSlot,
    _id: { $ne: entry._id },
  }).populate('subjectId', 'subject_name');

  if (classConflicts.length > 0) {
    const conflictSubjects = classConflicts.map((c: any) => (c.subjectId as any).subject_name).join(', ');
    errors.push(
      `Class ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division} has multiple subjects at ${entry.day} ${entry.timeSlot}: ${conflictSubjects}`
    );
  }

  // Rule 3: Check teacher workload - VALIDATE ACTUAL STATE (not simulate +1)
  // Compute current workload from actual timetable entries
  const currentWorkload = await computeTeacherWorkload(
    teacherIdStr,
    entry.program,
    entry.className,
    entry.semester,
    entry.division
  );

  // Validation: Check if current assigned hours exceed teaching hours
  // remainingHours >= 0: VALID (including 0, which is full capacity)
  // remainingHours < 0: INVALID (exceeded limit)
  if (currentWorkload.remainingHours < 0) {
    errors.push(
      `Teacher ${teacher.faculty_name} workload exceeded for ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division}. Current: ${currentWorkload.assignedHours}/${currentWorkload.teaching_hours} (exceeds limit).`
    );
  }
  // Note: remainingHours === 0 (full capacity) is VALID - no error, no warning

  // Rule 4: Check subject periods - VALIDATE ACTUAL STATE (not simulate +1)
  const currentSubjectPeriods = await computeSubjectPeriods(
    subjectIdStr,
    entry.program,
    entry.className,
    entry.semester,
    entry.division
  );

  // Validation: Check if current allotted periods exceed required periods
  // remainingPeriods >= 0: VALID (including 0, which is full capacity)
  // remainingPeriods < 0: INVALID (exceeded limit)
  if (currentSubjectPeriods.remainingPeriods < 0) {
    errors.push(
      `Subject ${subject.subject_name} periods exceeded for ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division}. Current: ${currentSubjectPeriods.allottedPeriods}/${currentSubjectPeriods.requiredPeriods} (exceeds limit).`
    );
  }
  // Note: remainingPeriods === 0 (full capacity) is VALID - no error, no warning

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates entire timetable
 * Mode: Validates existing entries using ACTUAL state (not simulating additions)
 */
export async function validateTimetable(
  program?: string,
  className?: string,
  semester?: number,
  division?: string,
  classroomId?: string
): Promise<ValidationResult> {
  await connectDB();

  const errors: string[] = [];
  const warnings: string[] = [];

  const query: any = {};
  if (classroomId) {
    query.classroomId = classroomId;
  } else {
    if (program) query.program = program;
    if (className) query.className = className;
    if (semester !== undefined) query.semester = semester;
    if (division) query.division = division;
  }

  const timetableEntries = await Timetable.find(query)
    .populate('teacherId')
    .populate('subjectId');

  // Validate each existing entry using ACTUAL state validation
  // Do NOT simulate "+1" - just check if current state is valid
  for (const entry of timetableEntries) {
    const validation = await validateExistingTimetableEntry(entry);

    if (!validation.isValid) {
      errors.push(
        `Entry ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division} ${entry.day} ${entry.timeSlot}: ${validation.errors.join(', ')}`
      );
    }

    if (validation.warnings) {
      warnings.push(
        `Entry ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division} ${entry.day} ${entry.timeSlot}: ${validation.warnings.join(', ')}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates weekly timetable before saving
 * Additional rules:
 * - Maximum 6 lectures per day (excluding breaks)
 * - No allocations on holiday days
 * - Break slots must remain empty
 */
export async function validateWeeklyTimetable(
  program: string,
  className: string,
  semester: number,
  division: string,
  holidays: string[] = []
): Promise<ValidationResult> {
  await connectDB();

  const errors: string[] = [];
  const warnings: string[] = [];

  const query: any = {
    program,
    className,
    semester,
    division,
  };

  const timetableEntries = await Timetable.find(query)
    .populate('teacherId')
    .populate('subjectId');

  // Group entries by day
  const entriesByDay: { [day: string]: any[] } = {};
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  DAYS.forEach((day) => {
    entriesByDay[day] = [];
  });

  timetableEntries.forEach((entry) => {
    if (entriesByDay[entry.day]) {
      entriesByDay[entry.day].push(entry);
    }
  });

  // Validate each day
  for (const day of DAYS) {
    const dayEntries = entriesByDay[day];
    const isHoliday = holidays.includes(day);

    // Rule: Holiday days must not have any allocations
    if (isHoliday && dayEntries.length > 0) {
      errors.push(`Holiday day ${day} cannot have any timetable allocations`);
      continue;
    }

    // Skip validation for holiday days
    if (isHoliday) {
      continue;
    }

    // Count active lectures (excluding breaks)
    const activeLectures = dayEntries.filter(
      (entry) => ACTIVE_SLOTS.includes(entry.timeSlot)
    );

    // Rule: Maximum 6 lectures per day
    if (activeLectures.length > MAX_LECTURES_PER_DAY) {
      errors.push(
        `${day} has ${activeLectures.length} lectures. Maximum allowed is ${MAX_LECTURES_PER_DAY} lectures per day.`
      );
    }

    // Rule: Break slots must remain empty
    const breakSlotEntries = dayEntries.filter((entry) =>
      RECESS_SLOTS.includes(entry.timeSlot)
    );
    if (breakSlotEntries.length > 0) {
      errors.push(
        `${day} has ${breakSlotEntries.length} entry(ies) in break slots. Break slots must remain empty.`
      );
    }
  }

  // Validate all entries using existing validation
  const fullValidation = await validateTimetable(program, className, semester, division);
  errors.push(...fullValidation.errors);
  if (fullValidation.warnings) {
    warnings.push(...fullValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

