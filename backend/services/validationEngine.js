const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const Classroom = require('../models/Classroom');
const TeacherLeave = require('../models/TeacherLeave');
const TeacherAssignment = require('../models/TeacherAssignment');
const { computeTeacherWorkload, computeSubjectPeriods } = require('./workloadCompute');
const { TIME_SLOTS, RECESS_SLOTS, ACTIVE_SLOTS } = require('../utils/constants');

function getDateForWeekday(dayName) {
  const DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetIndex = DAYS_ORDER.indexOf(dayName);
  if (targetIndex === -1) return new Date();
  
  const today = new Date();
  const todayIndex = today.getDay();
  
  const diff = targetIndex - todayIndex;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
}

const MAX_LECTURES_PER_DAY = 6;

function extractId(value) {
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return value._id.toString();
  }
  return value ? value.toString() : '';
}

/**
 * Check for room conflicts across divisions
 * A room conflict occurs when the same room is booked at the same day/timeSlot by different divisions
 */
async function checkRoomConflict(
  program,
  className,
  semester,
  division,
  day,
  timeSlot,
  excludeTimetableId = undefined
) {
  // Get the classroom for this entry
  const classroom = await Classroom.findOne({
    program,
    className,
    semester,
    division,
  });

  if (!classroom || !classroom.roomNumber) {
    return { hasConflict: false, conflictDetails: null };
  }

  const roomNumber = classroom.roomNumber;

  const query = { day, timeSlot };
  if (excludeTimetableId) query._id = { $ne: excludeTimetableId };
  const entriesAtSlot = await Timetable.find(query).populate({
    path: 'program',
  });

  // Check if any of these entries use the same room but different division
  for (const entry of entriesAtSlot) {
    if (entry.division === division) {
      // Same division, not a conflict
      continue;
    }

    // Get the classroom for this conflicting entry
    const conflictClassroom = await Classroom.findOne({
      program: entry.program,
      className: entry.className,
      semester: entry.semester,
      division: entry.division,
    });

    if (conflictClassroom && conflictClassroom.roomNumber === roomNumber) {
      // Same room, different division = CONFLICT
      return {
        hasConflict: true,
        conflictDetails: {
          roomNumber,
          conflictingDivision: entry.division,
          conflictingClass: `${entry.program} ${entry.className} Sem-${entry.semester}`,
          day,
          timeSlot,
        },
      };
    }
  }

  return { hasConflict: false, conflictDetails: null };
}

async function validateTimetableEntry(
  program,
  className,
  semester,
  division,
  day,
  timeSlot,
  subjectId,
  teacherId,
  excludeTimetableId = undefined,
  slotsToAdd = 1,
  isLab = false
) {
  const errors = [];
  const warnings = [];

  if (RECESS_SLOTS.includes(timeSlot)) {
    errors.push(`Cannot schedule during break time slot: ${timeSlot}`);
    return { isValid: false, errors };
  }

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

  // A faculty member may only be scheduled through an explicit subject mapping
  // for this curriculum context. This is the authoritative many-to-many check.
  const qualified = await TeacherAssignment.exists({
    teacherId,
    subjectId,
    program,
    semester,
    $or: [{ division }, { division: null }],
  });
  if (!qualified) {
    errors.push(`Teacher ${teacher.faculty_name} is not assigned to teach ${subject.subject_name} for ${program} semester ${semester}`);
  }

  // Check room conflict
  const roomConflict = await checkRoomConflict(program, className, semester, division, day, timeSlot, excludeTimetableId);
  if (roomConflict.hasConflict) {
    errors.push(
      `Room conflict: Room ${roomConflict.conflictDetails.roomNumber} is already occupied at this time by Division ${roomConflict.conflictDetails.conflictingDivision} in ${roomConflict.conflictDetails.conflictingClass}`
    );
  }

  // Check if teacher is already assigned in same time slot
  const teacherQuery = { teacherId, day, timeSlot };
  if (excludeTimetableId) teacherQuery._id = { $ne: excludeTimetableId };
  const teacherConflict = await Timetable.findOne(teacherQuery).populate('subjectId', 'subject_name');

  if (teacherConflict) {
    errors.push(
      `Teacher ${teacher.faculty_name} is already assigned to ${teacherConflict.subjectId.subject_name} at ${day} ${timeSlot}`
    );
  }

  // Check if teacher is on leave
  const targetDate = getDateForWeekday(day);
  const teacherLeave = await TeacherLeave.findOne({
    teacherId,
    status: 'Approved',
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  });
  if (teacherLeave) {
    errors.push(
      `Teacher ${teacher.faculty_name} is on leave on ${day} (${targetDate.toISOString().slice(0, 10)}) - Reason: ${teacherLeave.reason || 'Not specified'}`
    );
  }

  // Check if class time slot is already occupied
  const classQuery = { program, className, semester, division, day, timeSlot };
  if (excludeTimetableId) classQuery._id = { $ne: excludeTimetableId };
  const classConflicts = await Timetable.find(classQuery).populate('subjectId', 'subject_name');

  if (classConflicts.length > 0) {
    if (isLab) {
      const hasNormalLecture = classConflicts.some(c => !c.isLab);
      if (hasNormalLecture) {
        errors.push(`Class Sem-${semester} ${division} already has a normal lecture scheduled at ${day} ${timeSlot}, cannot schedule lab.`);
      } else if (classConflicts.length >= 3) {
        errors.push(`Class Sem-${semester} ${division} already has 3 lab batches scheduled at ${day} ${timeSlot}.`);
      }
    } else {
      errors.push(
        `Class ${program} ${className} Sem-${semester} ${division} already has ${classConflicts.map(c => c.subjectId.subject_name).join(', ')} scheduled at ${day} ${timeSlot}`
      );
    }
  }

  // Check consecutive slot validation if isLab is true
  if (isLab) {
    const currentIndex = TIME_SLOTS.indexOf(timeSlot);
    if (currentIndex === -1 || currentIndex >= TIME_SLOTS.length - 1) {
      errors.push('No consecutive slot available for lab subject');
    } else {
      const nextSlot = TIME_SLOTS[currentIndex + 1];
      if (RECESS_SLOTS.includes(nextSlot)) {
        errors.push('Labs must be scheduled in consecutive slots without breaks');
      } else {
        // Room conflict for consecutive slot
        const nextRoomConflict = await checkRoomConflict(program, className, semester, division, day, nextSlot, excludeTimetableId);
        if (nextRoomConflict.hasConflict) {
          errors.push(
            `Room conflict (consecutive slot): Room ${nextRoomConflict.conflictDetails.roomNumber} is already occupied at ${nextSlot} by Division ${nextRoomConflict.conflictDetails.conflictingDivision} in ${nextRoomConflict.conflictDetails.conflictingClass}`
          );
        }

        // Teacher conflict for consecutive slot (exclude the same subject if it's already there)
        const teacherNextQuery = { teacherId, day, timeSlot: nextSlot, subjectId: { $ne: subjectId } };
        if (excludeTimetableId) teacherNextQuery._id = { $ne: excludeTimetableId };
        const teacherConflictNext = await Timetable.findOne(teacherNextQuery).populate('subjectId', 'subject_name');
        if (teacherConflictNext) {
          errors.push(`Teacher ${teacher.faculty_name} is already assigned to ${teacherConflictNext.subjectId.subject_name} at ${day} ${nextSlot}`);
        }

        // Class conflict for consecutive slot
        const classNextQuery = { program, className, semester, division, day, timeSlot: nextSlot, subjectId: { $ne: subjectId } };
        if (excludeTimetableId) classNextQuery._id = { $ne: excludeTimetableId };
        const classConflictNext = await Timetable.find(classNextQuery).populate('subjectId', 'subject_name');
        if (classConflictNext.length > 0) {
          const hasNormal = classConflictNext.some(c => !c.isLab);
          if (hasNormal) {
            errors.push(`Class Sem-${semester} ${division} already has a normal lecture scheduled at ${day} ${nextSlot}, cannot schedule lab.`);
          } else if (classConflictNext.length >= 3) {
            errors.push(`Class Sem-${semester} ${division} already has 3 lab batches scheduled at ${day} ${nextSlot}.`);
          }
        }
      }
    }
  }

  // Check teacher workload (division-scoped)
  const currentWorkload = await computeTeacherWorkload(teacherId, program, className, semester, division);
  const currentAssignedHours = currentWorkload.assignedHours;
  const newAssignedHours = currentAssignedHours + slotsToAdd;
  const newRemainingHours = currentWorkload.teaching_hours - newAssignedHours;

  if (newRemainingHours < 0) {
    errors.push(
      `Teacher ${teacher.faculty_name} workload exceeded for ${program} ${className} Sem-${semester} ${division} — slot cannot be assigned. Current: ${currentAssignedHours}/${currentWorkload.teaching_hours}, Adding: +${slotsToAdd} would exceed limit.`
    );
  }

  // Check subject allotted periods (division-scoped)
  const currentSubjectPeriods = await computeSubjectPeriods(subjectId, program, className, semester, division);
  const currentAllottedPeriods = currentSubjectPeriods.allottedPeriods;
  const newAllottedPeriods = currentAllottedPeriods + slotsToAdd;
  const newRemainingPeriods = currentSubjectPeriods.requiredPeriods - newAllottedPeriods;

  if (newRemainingPeriods < 0) {
    errors.push(
      `Subject ${subject.subject_name} periods exceeded for ${program} ${className} Sem-${semester} ${division} — slot cannot be assigned. Current: ${currentAllottedPeriods}/${currentSubjectPeriods.requiredPeriods}, Adding: +${slotsToAdd} would exceed limit.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

async function validateExistingTimetableEntry(entry) {
  const errors = [];
  const warnings = [];

  if (RECESS_SLOTS.includes(entry.timeSlot)) {
    return { isValid: true, errors: [], warnings: undefined };
  }

  const subjectIdStr = extractId(entry.subjectId);
  const teacherIdStr = extractId(entry.teacherId);

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

  // Check room conflict
  const roomConflict = await checkRoomConflict(
    entry.program,
    entry.className,
    entry.semester,
    entry.division,
    entry.day,
    entry.timeSlot,
    entry._id
  );
  if (roomConflict.hasConflict) {
    errors.push(
      `Room conflict: Room ${roomConflict.conflictDetails.roomNumber} is already occupied at this time by Division ${roomConflict.conflictDetails.conflictingDivision} in ${roomConflict.conflictDetails.conflictingClass}`
    );
  }

  const teacherConflicts = await Timetable.find({
    teacherId: teacherIdStr,
    day: entry.day,
    timeSlot: entry.timeSlot,
    _id: { $ne: entry._id },
  }).populate('subjectId', 'subject_name');

  if (teacherConflicts.length > 0) {
    const conflictSubjects = teacherConflicts.map(c => c.subjectId.subject_name).join(', ');
    errors.push(
      `Teacher ${teacher.faculty_name} has multiple assignments at ${entry.day} ${entry.timeSlot}: ${conflictSubjects}`
    );
  }

  // Check if teacher is on leave
  const targetDate = getDateForWeekday(entry.day);
  const teacherLeave = await TeacherLeave.findOne({
    teacherId: teacherIdStr,
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate }
  });
  if (teacherLeave) {
    errors.push(
      `Teacher ${teacher.faculty_name} is on leave on ${entry.day} (${targetDate.toISOString().slice(0, 10)}) - Reason: ${teacherLeave.reason || 'Not specified'}`
    );
  }

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
    if (entry.isLab) {
      const hasNormalLecture = classConflicts.some(c => !c.isLab);
      if (hasNormalLecture) {
        errors.push(`Class Sem-${entry.semester} ${entry.division} already has a normal lecture at ${entry.day} ${entry.timeSlot}, conflicting with lab.`);
      } else if (classConflicts.length >= 3) {
        errors.push(`Class Sem-${entry.semester} ${entry.division} has multiple lab batches (limit 3) at ${entry.day} ${entry.timeSlot}.`);
      }
    } else {
      const conflictSubjects = classConflicts.map(c => c.subjectId.subject_name).join(', ');
      errors.push(
        `Class ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division} has multiple subjects at ${entry.day} ${entry.timeSlot}: ${conflictSubjects}`
      );
    }
  }

  const currentWorkload = await computeTeacherWorkload(
    teacherIdStr,
    entry.program,
    entry.className,
    entry.semester,
    entry.division
  );

  if (currentWorkload.remainingHours < 0) {
    errors.push(
      `Teacher ${teacher.faculty_name} workload exceeded for ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division}. Current: ${currentWorkload.assignedHours}/${currentWorkload.teaching_hours} (exceeds limit).`
    );
  }

  const currentSubjectPeriods = await computeSubjectPeriods(
    subjectIdStr,
    entry.program,
    entry.className,
    entry.semester,
    entry.division
  );

  if (currentSubjectPeriods.remainingPeriods < 0) {
    errors.push(
      `Subject ${subject.subject_name} periods exceeded for ${entry.program} ${entry.className} Sem-${entry.semester} ${entry.division}. Current: ${currentSubjectPeriods.allottedPeriods}/${currentSubjectPeriods.requiredPeriods} (exceeds limit).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

async function validateTimetable(program, className, semester, division, classroomId) {
  const errors = [];
  const warnings = [];

  const query = {};
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

async function validateWeeklyTimetable(program, className, semester, division, holidays = []) {
  const errors = [];
  const warnings = [];

  const query = {
    program,
    className,
    semester,
    division,
  };

  const timetableEntries = await Timetable.find(query)
    .populate('teacherId')
    .populate('subjectId');

  const entriesByDay = {};
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  DAYS.forEach((day) => {
    entriesByDay[day] = [];
  });

  timetableEntries.forEach((entry) => {
    if (entriesByDay[entry.day]) {
      entriesByDay[entry.day].push(entry);
    }
  });

  for (const day of DAYS) {
    const dayEntries = entriesByDay[day];
    const isHoliday = holidays.includes(day);

    if (isHoliday && dayEntries.length > 0) {
      errors.push(`Holiday day ${day} cannot have any timetable allocations`);
      continue;
    }

    if (isHoliday) {
      continue;
    }

    const activeLectures = dayEntries.filter(
      (entry) => ACTIVE_SLOTS.includes(entry.timeSlot)
    );

    if (activeLectures.length > MAX_LECTURES_PER_DAY) {
      errors.push(
        `${day} has ${activeLectures.length} lectures. Maximum allowed is ${MAX_LECTURES_PER_DAY} lectures per day.`
      );
    }

    const breakSlotEntries = dayEntries.filter((entry) =>
      RECESS_SLOTS.includes(entry.timeSlot)
    );
    if (breakSlotEntries.length > 0) {
      errors.push(
        `${day} has ${breakSlotEntries.length} entry(ies) in break slots. Break slots must remain empty.`
      );
    }
  }

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

module.exports = {
  validateTimetableEntry,
  validateExistingTimetableEntry,
  validateTimetable,
  validateWeeklyTimetable,
  RECESS_SLOTS,
  ACTIVE_SLOTS
};
