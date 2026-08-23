const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const TimetableRule = require('../models/TimetableRule');
const SchedulingConstraint = require('../models/SchedulingConstraint');
const Classroom = require('../models/Classroom');
const Laboratory = require('../models/Laboratory');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');

function hashShuffle(array, seed) {
  let m = array.length,
    t,
    i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

const slotKey = (day, ts) => `${day}||${ts}`;

async function isSlotOccupied(department, semester, division, day, timeSlot) {
  return !!(await Timetable.exists({ department, semester, division, day, timeSlot }));
}

async function isTeacherBusy(teacher, day, timeSlot) {
  if (!teacher) return false;
  const isAssigned = await Timetable.exists({ teacher, day, timeSlot });
  if (isAssigned) return true;

  const tDoc = await Teacher.findById(teacher);
  if (tDoc && tDoc.blocked_slots) {
    const isBlocked = tDoc.blocked_slots.some(
      (slot) => slot.day === day && slot.periods.includes(parseInt(timeSlot))
    );
    if (isBlocked) return true;
  }
  return false;
}

async function isRoomOccupied(classroom, laboratory, day, timeSlot) {
  if (classroom) {
    return !!(await Timetable.exists({ classroom, day, timeSlot }));
  }
  if (laboratory) {
    return !!(await Timetable.exists({ laboratory, day, timeSlot }));
  }
  return false;
}

async function findAvailableRoom(type, day, timeSlot, departmentId, semesterId, divisionId) {
  const isLab = type === 'Laboratory' || type === 'Lab' || type === 'Computer Lab';

  if (isLab) {
    // 1. Try finding available Laboratory classroom
    const busyClassrooms = await Timetable.find({ day, timeSlot, classroom: { $ne: null } })
      .select('classroom')
      .lean();
    const busyIds = busyClassrooms.map((t) => t.classroom.toString());

    const labRoom = await Classroom.findOne({
      _id: { $nin: busyIds },
      isActive: { $ne: false },
      available: true,
      status: 'Available',
      type: { $in: ['Laboratory', 'Computer Lab'] },
    }).lean();

    if (labRoom) return { roomId: labRoom._id, isClassroomModel: true };

    // 2. Fallback to Laboratory collection
    const busyLabs = await Timetable.find({ day, timeSlot, laboratory: { $ne: null } })
      .select('laboratory')
      .lean();
    const busyLabIds = busyLabs.map((t) => t.laboratory.toString());

    const labDoc = await Laboratory.findOne({
      _id: { $nin: busyLabIds },
      available: { $ne: false },
    }).lean();

    if (labDoc) return { roomId: labDoc._id, isClassroomModel: false };
    return null;
  } else {
    // Theory classroom
    const busyClassrooms = await Timetable.find({ day, timeSlot, classroom: { $ne: null } })
      .select('classroom')
      .lean();
    const busyIds = busyClassrooms.map((t) => t.classroom.toString());

    // 1. Check if division has an explicitly assigned room
    if (departmentId && semesterId && divisionId) {
      const dedicated = await Classroom.findOne({
        _id: { $nin: busyIds },
        departmentId,
        semesterId,
        divisionId,
        isActive: { $ne: false },
        available: true,
        status: 'Available',
      }).lean();

      if (dedicated) return { roomId: dedicated._id, isClassroomModel: true };
    }

    // 2. Find any active, available general theory classroom
    const room = await Classroom.findOne({
      _id: { $nin: busyIds },
      isActive: { $ne: false },
      available: true,
      status: 'Available',
      type: { $in: ['Classroom', 'Theory', 'Lecture Hall', 'Seminar Hall', 'Tutorial Room'] },
    }).lean();

    if (room) return { roomId: room._id, isClassroomModel: true };
    return null;
  }
}

async function smartAutoGenerate(opts) {
  const { department, semester, division, mode } = opts;
  const createdBy = opts.createdBy;

  const result = {
    success: true,
    generated: 0,
    labs: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    summary: { teachersReachedFullLoad: [], subjectsFullyAllocated: [], unassignedSubjects: [] },
  };

  try {
    const rule = await TimetableRule.findOne();
    if (!rule) throw new Error('Timetable rules not found in DB');

    const activeDays = rule.working_days || [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const periods = rule.period_slots.map((p) => p.period.toString());

    if (mode === 'Full Rebuild' || mode === 'full') {
      await Timetable.deleteMany({ department, semester, division });
    }

    const reserved = new Set();
    if (mode === 'Fill Remaining' || mode === 'fill') {
      const existing = await Timetable.find({ department, semester, division });
      for (const e of existing) {
        reserved.add(slotKey(e.day, e.timeSlot));
      }
    }

    // 1. Get Subjects
    const subjects = await Subject.find({ department, semester });
    const theorySubjects = subjects.filter((s) => !s.requires_lab && s.type === 'Theory');
    const labSubjects = subjects.filter((s) => s.requires_lab || s.type === 'Lab');

    // Mappings
    const mappings = await TeacherSubjectMapping.find({ department, semester })
      .populate('teacher_id')
      .populate('subject_id');

    // 2. Schedule Labs First (consecutive slots)
    for (const lab of labSubjects) {
      const mapping = mappings.find((m) => m.subject_id._id.toString() === lab._id.toString());
      if (!mapping || !mapping.teacher_id) {
        result.warnings.push(`No teacher mapping for lab ${lab.subject_name}`);
        continue;
      }

      const teacher = mapping.teacher_id._id;
      const sessionsNeeded = lab.lab_sessions_per_week || 1;
      const duration = lab.lab_duration_slots || 2;

      for (let sessionIdx = 0; sessionIdx < sessionsNeeded; sessionIdx++) {
        let sessionScheduled = false;

        // Try to find consecutive slots
        for (const day of activeDays) {
          if (sessionScheduled) break;
          for (let i = 0; i <= periods.length - duration; i++) {
            let isValid = true;
            const seq = [];
            for (let j = 0; j < duration; j++) {
              seq.push(periods[i + j]);
            }

            let candidateLab = null;
            for (const ts of seq) {
              const k = slotKey(day, ts);
              if (reserved.has(k)) {
                isValid = false;
                break;
              }
              if (await isTeacherBusy(teacher, day, ts)) {
                isValid = false;
                break;
              }

              // Check room availability
              const freeRoom = await findAvailableRoom('Laboratory', day, ts, department, semester, division);
              if (!freeRoom) {
                isValid = false;
                break;
              }
              if (!candidateLab) candidateLab = freeRoom;
            }

            if (isValid && candidateLab) {
              for (const ts of seq) {
                const doc = {
                  department,
                  semester,
                  division,
                  day,
                  timeSlot: ts,
                  subject: lab._id,
                  teacher,
                  isLab: true,
                  duration,
                  createdBy,
                  status: 'valid',
                };
                if (candidateLab.isClassroomModel) {
                  doc.classroom = candidateLab.roomId;
                } else {
                  doc.laboratory = candidateLab.roomId;
                }
                await Timetable.create(doc);
                reserved.add(slotKey(day, ts));
              }
              result.labs += duration;
              sessionScheduled = true;
              break;
            }
          }
        }
        if (!sessionScheduled) {
          result.skipped++;
          result.summary.unassignedSubjects.push(
            `${lab.subject_name} (Lab): Could not find ${duration} consecutive free slots (Teacher busy, or room occupied)`
          );
        }
      }
    }

    // 3. Schedule Theory
    for (const theory of theorySubjects) {
      const mapping = mappings.find((m) => m.subject_id._id.toString() === theory._id.toString());
      if (!mapping || !mapping.teacher_id) {
        result.warnings.push(`No teacher mapping for theory ${theory.subject_name}`);
        continue;
      }
      const teacher = mapping.teacher_id._id;
      const periodsNeeded = theory.weekly_periods || 3;

      let scheduled = 0;
      for (const day of activeDays) {
        if (scheduled >= periodsNeeded) break;

        // Soft constraint: 1 period per day max for the same subject
        let dayHasSubject = false;
        for (const p of periods) {
          if (reserved.has(slotKey(day, p))) {
            const existing = await Timetable.findOne({
              department,
              semester,
              division,
              day,
              timeSlot: p,
              subject: theory._id,
            });
            if (existing) {
              dayHasSubject = true;
              break;
            }
          }
        }
        if (dayHasSubject) continue;

        for (const ts of periods) {
          if (scheduled >= periodsNeeded) break;
          const k = slotKey(day, ts);
          if (reserved.has(k)) continue;

          if (await isTeacherBusy(teacher, day, ts)) continue;

          const assignedRoom = await findAvailableRoom('Classroom', day, ts, department, semester, division);
          if (!assignedRoom) continue;

          await Timetable.create({
            department,
            semester,
            division,
            day,
            timeSlot: ts,
            subject: theory._id,
            teacher,
            classroom: assignedRoom.roomId,
            isLab: false,
            duration: 1,
            createdBy,
            status: 'valid',
          });
          reserved.add(k);
          scheduled++;
          result.generated++;
          break; // move to next day to spread subjects
        }
      }
      if (scheduled < periodsNeeded) {
        result.summary.unassignedSubjects.push(
          `${theory.subject_name}: Scheduled ${scheduled}/${periodsNeeded} (Teacher/Room busy, or daily limits reached)`
        );
        result.skipped += periodsNeeded - scheduled;
      } else {
        result.summary.subjectsFullyAllocated.push(theory.subject_name);
      }
    }

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
}

module.exports = { smartAutoGenerate };
