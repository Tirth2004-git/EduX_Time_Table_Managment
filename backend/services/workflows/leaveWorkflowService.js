const TeacherLeave = require('../../models/TeacherLeave');
const Teacher = require('../../models/Teacher');
const ScheduledSession = require('../../models/ScheduledSession');
const { findAffectedSessions } = require('../sessionGeneratorService');
const { generateCorrelationId, logAudit } = require('../auditService');
const {
  sendLeaveSubmitted,
  sendLeaveReviewed,
} = require('../notificationService');
const { startOfDay, endOfDay } = require('../../utils/dateUtils');

async function calculateLeaveImpact(leaveId) {
  const leave = await TeacherLeave.findById(leaveId).populate('teacherId');
  if (!leave) throw new Error('Leave not found');

  if (!leave.teacherId) {
    return { leave, sessions: [], impact: { affectedDates: [], affectedSessionIds: [], sessionCount: 0, subjects: [], divisions: [] } };
  }
  const sessions = await findAffectedSessions(leave.teacherId._id, leave.startDate, leave.endDate);
  const affectedDates = [...new Set(sessions.map((s) => startOfDay(s.date).toISOString()))].map(
    (d) => new Date(d)
  );

  return {
    leave,
    sessions,
    impact: {
      affectedDates,
      affectedSessionIds: sessions.map((s) => s._id),
      sessionCount: sessions.length,
      subjects: [...new Set(sessions.map((s) => s.subjectId?.subject_name).filter(Boolean))],
      divisions: [
        ...new Set(sessions.map((s) => `${s.program} ${s.className}-${s.division}`)),
      ],
    },
  };
}

async function submitLeave({ teacherId, startDate, endDate, reason, leaveType, halfDayPeriod }) {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) throw new Error('Teacher not found');

  let type = leaveType || 'multiple_day';
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (start.getTime() === end.getTime()) type = 'single_day';

  const leave = await TeacherLeave.create({
    teacherId,
    startDate: start,
    endDate: end,
    reason: reason || '',
    leaveType: type,
    halfDayPeriod: halfDayPeriod || null,
    status: 'Pending',
    workflowState: 'submitted',
  });

  await sendLeaveSubmitted(leave, teacher);
  return leave;
}

async function approveLeave(leaveId, adminUserId, comments = '') {
  const correlationId = generateCorrelationId();

  try {
    const leave = await TeacherLeave.findById(leaveId).populate('teacherId');
    if (!leave) throw new Error('Leave not found');
    if (leave.status !== 'Pending') throw new Error('Only pending leaves can be approved');

    const originalTeacher = leave.teacherId;
    if (!originalTeacher) throw new Error('This leave request has no linked faculty record and cannot be approved.');
    const impactedSessions = await ScheduledSession.find({
      originalTeacherId: originalTeacher._id,
      date: { $gte: startOfDay(leave.startDate), $lte: endOfDay(leave.endDate) },
    }).lean();

    const affectedDates = [
      ...new Set(impactedSessions.map((s) => startOfDay(s.date).toISOString())),
    ].map((d) => new Date(d));

    leave.status = 'Approved';
    leave.comments = comments;
    leave.reviewedBy = adminUserId;
    leave.reviewedAt = new Date();
    leave.workflowState = 'completed';
    leave.impactSummary = {
      affectedDates,
      affectedSessionIds: impactedSessions.map((s) => s._id),
      sessionCount: impactedSessions.length,
    };
    await leave.save();

    await sendLeaveReviewed(leave, originalTeacher, 'Approved', comments);

    await logAudit({
      userId: adminUserId,
      actionType: 'APPROVE',
      entityType: 'TeacherLeave',
      entityId: leave._id,
      correlationId,
      details: {
        impactedSessions: impactedSessions.length,
        substitutionsCreated: 0,
      },
    });

    return { leave, impactedSessions };
  } catch (err) { throw err; }
}

async function rejectLeave(leaveId, adminUserId, comments = '') {
  const leave = await TeacherLeave.findById(leaveId).populate('teacherId');
  if (!leave) throw new Error('Leave not found');
  if (leave.status !== 'Pending') throw new Error('Only pending leaves can be rejected');

  leave.status = 'Rejected';
  leave.comments = comments;
  leave.reviewedBy = adminUserId;
  leave.reviewedAt = new Date();
  await leave.save();

  await sendLeaveReviewed(leave, leave.teacherId, 'Rejected', comments);

  await logAudit({
    userId: adminUserId,
    actionType: 'REJECT',
    entityType: 'TeacherLeave',
    entityId: leave._id,
    details: { comments },
  });

  return leave;
}

async function cancelLeave(leaveId, teacherId) {
  const leave = await TeacherLeave.findOne({ _id: leaveId, teacherId });
  if (!leave) throw new Error('Leave not found');
  if (leave.status !== 'Pending') throw new Error('Only pending leaves can be cancelled');

  leave.status = 'Cancelled';
  await leave.save();
  return leave;
}

module.exports = {
  calculateLeaveImpact,
  submitLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
};
