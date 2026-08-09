const ScheduledSession = require('../models/ScheduledSession');
const { startOfDay, endOfDay, getWeekRange } = require('../utils/dateUtils');

const COUNTABLE_STATUSES = ['scheduled', 'substituted'];

async function getTeacherWorkload(teacherId, fromDate, toDate) {
  const from = fromDate ? startOfDay(fromDate) : getWeekRange().start;
  const to = toDate ? endOfDay(toDate) : getWeekRange().end;

  const sessions = await ScheduledSession.find({
    effectiveTeacherId: teacherId,
    date: { $gte: from, $lte: to },
    status: { $in: COUNTABLE_STATUSES },
  }).populate('subjectId', 'subject_name subject_code');

  const subjectDistribution = {};
  sessions.forEach((s) => {
    if (s.subjectId) {
      const code = s.subjectId.subject_code;
      if (!subjectDistribution[code]) {
        subjectDistribution[code] = {
          code,
          name: s.subjectId.subject_name,
          hours: 0,
        };
      }
      subjectDistribution[code].hours += s.duration || 1;
    }
  });

  return {
    totalAssigned: sessions.length,
    sessions,
    subjectDistribution: Object.values(subjectDistribution),
  };
}

async function getAllTeachersWorkload(fromDate, toDate) {
  const from = fromDate ? startOfDay(fromDate) : getWeekRange().start;
  const to = toDate ? endOfDay(toDate) : getWeekRange().end;

  return ScheduledSession.aggregate([
    {
      $match: {
        date: { $gte: from, $lte: to },
        status: { $in: COUNTABLE_STATUSES },
      },
    },
    {
      $group: {
        _id: '$effectiveTeacherId',
        sessionCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'teachers',
        localField: '_id',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    { $unwind: '$teacher' },
    {
      $project: {
        teacherId: '$_id',
        name: '$teacher.faculty_name',
        department: '$teacher.department',
        maxWorkload: '$teacher.preferences.maxWorkload',
        teaching_hours: '$teacher.teaching_hours',
        sessionCount: 1,
      },
    },
    { $sort: { sessionCount: -1 } },
  ]);
}

async function getRoomUtilization(fromDate, toDate) {
  const from = fromDate ? startOfDay(fromDate) : getWeekRange().start;
  const to = toDate ? endOfDay(toDate) : getWeekRange().end;

  return ScheduledSession.aggregate([
    {
      $match: {
        date: { $gte: from, $lte: to },
        status: { $ne: 'cancelled' },
        classroomId: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$classroomId',
        sessionCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'classrooms',
        localField: '_id',
        foreignField: '_id',
        as: 'classroom',
      },
    },
    { $unwind: '$classroom' },
    {
      $project: {
        roomNumber: '$classroom.roomNumber',
        program: '$classroom.program',
        division: '$classroom.division',
        sessionCount: 1,
      },
    },
    { $sort: { sessionCount: -1 } },
  ]);
}

module.exports = {
  getTeacherWorkload,
  getAllTeachersWorkload,
  getRoomUtilization,
  COUNTABLE_STATUSES,
};
