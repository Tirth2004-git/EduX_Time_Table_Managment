const ScheduledSession = require('../models/ScheduledSession');
const Teacher = require('../models/Teacher');
const TeacherLeave = require('../models/TeacherLeave');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const { startOfDay, endOfDay, getDayName } = require('../utils/dateUtils');

const ACTIVE_STATUSES = ['scheduled', 'substituted', 'leave_impacted'];

async function countTeacherWorkload(teacherId, fromDate, toDate) {
  return ScheduledSession.countDocuments({
    effectiveTeacherId: teacherId,
    date: { $gte: startOfDay(fromDate), $lte: endOfDay(toDate) },
    status: { $in: ['scheduled', 'substituted'] },
  });
}

async function hasTimetableClash(teacherId, date, timeSlot, excludeSessionId = null) {
  const query = {
    effectiveTeacherId: teacherId,
    date: startOfDay(date),
    timeSlot,
    status: { $in: ACTIVE_STATUSES },
  };
  if (excludeSessionId) query._id = { $ne: excludeSessionId };
  const clash = await ScheduledSession.findOne(query);
  return !!clash;
}

async function hasLeaveConflict(teacherId, date) {
  const d = startOfDay(date);
  const leave = await TeacherLeave.findOne({
    teacherId,
    status: 'Approved',
    startDate: { $lte: endOfDay(d) },
    endDate: { $gte: startOfDay(d) },
  });
  return !!leave;
}

function scoreSubjectMatch(teacher, subjectId, subject) {
  return 0; // Legacy sync method, use async instead
}

async function scoreSubjectMatchAsync(teacher, subjectId, subject) {
  if (!subjectId) return 0;
  
  const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
  const mapping = await TeacherSubjectMapping.findOne({ teacher_id: teacher._id, subject_id: subjectId });
  
  if (mapping) {
    if (mapping.is_primary_teacher) return 40;
    return 35;
  }
  
  if (subject && teacher.department && subject.department && teacher.department.toString() === subject.department.toString()) {
    return 20; // Fallback to same department score
  }
  
  return 0;
}

function scoreDepartmentMatch(teacher, originalTeacher) {
  if (!originalTeacher) return 0;
  return teacher.department === originalTeacher.department ? 15 : 0;
}

function scoreAvailability(teacher, day, timeSlot) {
  const unavailable = teacher.preferences?.unavailableSlots?.some(
    (s) => s.day === day && s.timeSlot === timeSlot
  );
  if (unavailable) return 0;
  const preferred = teacher.preferences?.preferredSlots?.some(
    (s) => s.day === day && s.timeSlot === timeSlot
  );
  return preferred ? 20 : 15;
}

function scoreWorkloadBalance(currentLoad, maxWorkload) {
  if (!maxWorkload || maxWorkload <= 0) return 10;
  const ratio = Math.min(currentLoad / maxWorkload, 1);
  return Math.round(15 * (1 - ratio));
}

function scorePreferenceMatch(teacher, subjectId) {
  const preferredSubjects = teacher.preferences?.preferredSubjects || [];
  if (preferredSubjects.some((id) => id.toString() === subjectId?.toString())) return 10;
  return 5;
}

async function rankCandidates(session, originalTeacher) {
  const teachers = await Teacher.find({ _id: { $ne: session.originalTeacherId } });
  const subject = await Subject.findById(session.subjectId);
  const day = session.day || getDayName(session.date);
  const weekStart = startOfDay(session.date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const candidates = [];

  for (const teacher of teachers) {
    const disqualifiers = [];

    if (session.isLocked) {
      disqualifiers.push('Session is locked');
    }

    const clash = await hasTimetableClash(teacher._id, session.date, session.timeSlot, session._id);
    if (clash) disqualifiers.push('Timetable clash at same slot');

    const onLeave = await hasLeaveConflict(teacher._id, session.date);
    if (onLeave) disqualifiers.push('Teacher on approved leave');

    const currentLoad = await countTeacherWorkload(teacher._id, weekStart, weekEnd);
    const maxWorkload = teacher.preferences?.maxWorkload || teacher.teaching_hours || 40;
    if (currentLoad >= maxWorkload) disqualifiers.push('Workload limit exceeded');

    if (disqualifiers.length > 0) {
      candidates.push({
        teacherId: teacher._id,
        teacher,
        score: 0,
        breakdown: { subjectMatch: 0, departmentMatch: 0, availability: 0, workloadBalance: 0, preferenceMatch: 0 },
        reasons: [],
        disqualifiers,
      });
      continue;
    }

    const subjectMatch = await scoreSubjectMatchAsync(teacher, session.subjectId, subject);
    const departmentMatch = scoreDepartmentMatch(teacher, originalTeacher);
    const availability = scoreAvailability(teacher, day, session.timeSlot);
    const workloadBalance = scoreWorkloadBalance(currentLoad, maxWorkload);
    const preferenceMatch = scorePreferenceMatch(teacher, session.subjectId);
    const score = subjectMatch + departmentMatch + availability + workloadBalance + preferenceMatch;

    const reasons = [];
    if (subjectMatch >= 35) reasons.push('Strong subject expertise match');
    if (departmentMatch > 0) reasons.push('Same department');
    if (availability >= 18) reasons.push('Available and preferred slot');
    if (workloadBalance >= 10) reasons.push('Balanced workload');
    if (preferenceMatch >= 8) reasons.push('Matches teaching preferences');

    candidates.push({
      teacherId: teacher._id,
      teacher,
      score,
      breakdown: { subjectMatch, departmentMatch, availability, workloadBalance, preferenceMatch },
      reasons,
      disqualifiers: [],
    });
  }

  return candidates
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ teacherId, score, breakdown, reasons, disqualifiers, teacher }) => ({
      teacherId,
      faculty_name: teacher.faculty_name,
      department: teacher.department,
      score,
      breakdown,
      reasons,
      disqualifiers,
    }));
}

module.exports = {
  rankCandidates,
  countTeacherWorkload,
  hasTimetableClash,
  hasLeaveConflict,
};
