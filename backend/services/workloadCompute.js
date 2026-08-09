const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');

async function computeTeacherWorkload(teacherId, program, className, semester, division) {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // Count timetable entries for this specific division context
  const assignedHours = await Timetable.countDocuments({
    teacherId,
    program,
    className,
    semester,
    division,
  });

  const teaching_hours = teacher.teaching_hours || 0;
  const remainingHours = Math.max(0, teaching_hours - assignedHours);

  return {
    assignedHours,
    remainingHours,
    teaching_hours,
  };
}

async function computeSubjectPeriods(subjectId, program, className, semester, division) {
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    throw new Error('Subject not found');
  }

  // Count timetable entries for this specific division context
  const allottedPeriods = await Timetable.countDocuments({
    subjectId,
    program,
    className,
    semester,
    division,
  });

  const requiredPeriods = subject.requiredPeriods || 0;
  const remainingPeriods = Math.max(0, requiredPeriods - allottedPeriods);

  return {
    allottedPeriods,
    remainingPeriods,
    requiredPeriods,
  };
}

module.exports = {
  computeTeacherWorkload,
  computeSubjectPeriods
};
