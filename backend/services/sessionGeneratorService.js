const ScheduledSession = require('../models/ScheduledSession');
const { startOfDay, endOfDay } = require('../utils/dateUtils');

async function findAffectedSessions(teacherId, startDate, endDate) {
  return ScheduledSession.find({
    originalTeacherId: teacherId,
    date: { $gte: startOfDay(startDate), $lte: endOfDay(endDate) },
    status: { $in: ['scheduled', 'substituted'] },
    isLocked: false,
  })
    .populate('subjectId', 'subject_name subject_code')
    .populate('classroomId', 'roomNumber program className division')
    .sort({ date: 1, timeSlot: 1 });
}

module.exports = { findAffectedSessions };
