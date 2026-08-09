const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const WeeklyConfig = require('../models/WeeklyConfig');
const { computeTeacherWorkload, computeSubjectPeriods } = require('./workloadCompute');
const { validateTimetableEntry } = require('./validationEngine');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];
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

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function hashShuffle(array, seed) {
  const shuffled = [...array];
  const hashSeed = simpleHash(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (hashSeed + i) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

async function autoGenerateTimetable(
  program,
  className,
  semester,
  division,
  mode,
  createdBy
) {
  let userId = typeof createdBy === 'string' && mongoose.Types.ObjectId.isValid(createdBy)
    ? new mongoose.Types.ObjectId(createdBy)
    : createdBy;

  if (!userId) {
    throw new Error('Invalid createdBy user id');
  }

  const result = {
    success: true,
    generated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    summary: {
      teachersReachedFullLoad: [],
      subjectsFullyAllocated: [],
      unassignedSubjects: [],
    },
  };

  try {
    const weeklyConfig = await WeeklyConfig.findOne({
      program,
      className,
      semester,
      division,
    });
    const holidays = weeklyConfig?.holidays || [];

    if (holidays.length > 0) {
      await Timetable.deleteMany({
        program,
        className,
        semester,
        division,
        day: { $in: holidays },
      });
    }

    const existingEntries = await Timetable.find({
      program,
      className,
      semester,
      division,
    });

    if (mode === 'full') {
      await Timetable.deleteMany({
        program,
        className,
        semester,
        division,
      });
    }

    const subjects = await Subject.find({}).populate('teacherId');
    const teachers = await Teacher.find({});
    const validSubjects = subjects.filter((s) => s.teacherId);

    if (validSubjects.length === 0) {
      result.errors.push('No subjects with assigned teachers found');
      result.success = false;
      return result;
    }

    const allSlots = [];

    for (const day of DAYS) {
      if (holidays.includes(day)) {
        continue;
      }

      for (const timeSlot of TIME_SLOTS) {
        if (BREAK_SLOTS.includes(timeSlot)) {
          continue;
        }

        const existing = existingEntries.find(
          (e) => e.day === day && e.timeSlot === timeSlot
        );

        if (mode === 'fill' && existing) {
          continue;
        }

        allSlots.push({ day, timeSlot });
      }
    }

    const seed = `${program}-${className}-${semester}-${division}`;
    const shuffledSlots = hashShuffle(allSlots, seed);

    const subjectPriorities = [];
    const teacherAvailability = new Map();

    for (const subject of validSubjects) {
      const periods = await computeSubjectPeriods(
        subject._id.toString(),
        program,
        className,
        semester,
        division
      );

      const scheduledCount = await Timetable.countDocuments({
        program,
        className,
        semester,
        division,
        subjectId: subject._id,
      });

      subjectPriorities.push({
        subject,
        remainingPeriods: periods.remainingPeriods,
        scheduledCount,
        priority: periods.remainingPeriods * 1000 - scheduledCount,
      });
    }

    subjectPriorities.sort((a, b) => b.priority - a.priority);

    for (const teacher of teachers) {
      const workload = await computeTeacherWorkload(
        teacher._id.toString(),
        program,
        className,
        semester,
        division
      );

      const scheduledCount = await Timetable.countDocuments({
        program,
        className,
        semester,
        division,
        teacherId: teacher._id,
      });

      teacherAvailability.set(teacher._id.toString(), {
        teacher,
        remainingHours: workload.remainingHours,
        scheduledCount,
      });
    }

    const daySubjectCount = new Map();

    for (const slot of shuffledSlots) {
      let allocated = false;

      if (!daySubjectCount.has(slot.day)) {
        daySubjectCount.set(slot.day, new Map());
      }
      const dayMap = daySubjectCount.get(slot.day);

      for (const subjectPriority of subjectPriorities) {
        if (subjectPriority.remainingPeriods <= 0) continue;

        const subject = subjectPriority.subject;
        const teacher = subject.teacherId;
        if (!teacher) continue;

        const teacherId = teacher._id.toString();
        const teacherInfo = teacherAvailability.get(teacherId);
        if (!teacherInfo || teacherInfo.remainingHours <= 0) continue;

        const subjectCountToday = dayMap.get(subject._id.toString()) || 0;
        if (subjectCountToday >= 2) continue;

        const timeIndex = TIME_SLOTS.indexOf(slot.timeSlot);
        let consecutiveCount = 1;
        
        for (let i = timeIndex - 1; i >= 0; i--) {
          if (BREAK_SLOTS.includes(TIME_SLOTS[i])) break;
          const prevEntry = await Timetable.findOne({
            program,
            className,
            semester,
            division,
            day: slot.day,
            timeSlot: TIME_SLOTS[i],
            subjectId: subject._id,
          });
          if (prevEntry) consecutiveCount++;
          else break;
        }
        
        for (let i = timeIndex + 1; i < TIME_SLOTS.length; i++) {
          if (BREAK_SLOTS.includes(TIME_SLOTS[i])) break;
          const nextEntry = await Timetable.findOne({
            program,
            className,
            semester,
            division,
            day: slot.day,
            timeSlot: TIME_SLOTS[i],
            subjectId: subject._id,
          });
          if (nextEntry) consecutiveCount++;
          else break;
        }
        
        if (consecutiveCount >= 3) continue;

        const teacherConflict = await Timetable.findOne({
          teacherId: teacher._id,
          day: slot.day,
          timeSlot: slot.timeSlot,
        });
        if (teacherConflict) continue;

        const classConflict = await Timetable.findOne({
          program,
          className,
          semester,
          division,
          day: slot.day,
          timeSlot: slot.timeSlot,
        });
        if (classConflict) continue;

        const validation = await validateTimetableEntry(
          program,
          className,
          semester,
          division,
          slot.day,
          slot.timeSlot,
          subject._id.toString(),
          teacherId
        );
        if (!validation.isValid) continue;

        try {
          await Timetable.create({
            program,
            className,
            semester,
            division,
            day: slot.day,
            timeSlot: slot.timeSlot,
            subjectId: subject._id,
            teacherId: teacher._id,
            status: 'valid',
            createdBy: userId,
          });

          dayMap.set(subject._id.toString(), subjectCountToday + 1);
          
          const updatedTeacherWorkload = await computeTeacherWorkload(
            teacherId,
            program,
            className,
            semester,
            division
          );
          const updatedSubjectPeriods = await computeSubjectPeriods(
            subject._id.toString(),
            program,
            className,
            semester,
            division
          );

          subjectPriority.remainingPeriods = updatedSubjectPeriods.remainingPeriods;
          teacherInfo.remainingHours = updatedTeacherWorkload.remainingHours;
          teacherInfo.scheduledCount++;
          subjectPriority.scheduledCount++;

          result.generated++;
          allocated = true;
          break;
        } catch (error) {
          result.warnings.push(
            `Failed to allocate ${subject.subject_name} at ${slot.day} ${slot.timeSlot}: ${error.message}`
          );
        }
      }

      if (!allocated) {
        result.skipped++;
      }
    }

    for (const subjectPriority of subjectPriorities) {
      if (subjectPriority.remainingPeriods <= 0) {
        result.summary.subjectsFullyAllocated.push(subjectPriority.subject.subject_name);
      } else if (subjectPriority.scheduledCount === 0) {
        result.summary.unassignedSubjects.push(subjectPriority.subject.subject_name);
      }
    }

    teacherAvailability.forEach((teacherInfo) => {
      if (teacherInfo.remainingHours <= 0 && teacherInfo.scheduledCount > 0) {
        result.summary.teachersReachedFullLoad.push(teacherInfo.teacher.faculty_name);
      }
    });

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(error.message || 'Auto-generation failed');
    return result;
  }
}

module.exports = { autoGenerateTimetable };
