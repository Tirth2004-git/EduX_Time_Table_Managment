const mongoose = require('mongoose');
const TeacherLeave = require('../../models/TeacherLeave');
const Teacher = require('../../models/Teacher');
const SubstitutionRequest = require('../../models/SubstitutionRequest');
const ScheduledSession = require('../../models/ScheduledSession');
const { findAffectedSessions } = require('../sessionGeneratorService');
const { rankCandidates } = require('../substituteEngineService');
const { generateCorrelationId, logAudit } = require('../auditService');
const {
  sendLeaveSubmitted,
  sendLeaveReviewed,
  sendSubstituteRequested,
} = require('../notificationService');
const { startOfDay, endOfDay } = require('../../utils/dateUtils');

async function calculateLeaveImpact(leaveId) {
  const leave = await TeacherLeave.findById(leaveId).populate('teacherId');
  if (!leave) throw new Error('Leave not found');

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
  const session = await mongoose.startSession();
  session.startTransaction();
  const correlationId = generateCorrelationId();

  try {
    const leave = await TeacherLeave.findById(leaveId).populate('teacherId').session(session);
    if (!leave) throw new Error('Leave not found');
    if (leave.status !== 'Pending') throw new Error('Only pending leaves can be approved');

    const originalTeacher = leave.teacherId;
    const impactedSessions = await ScheduledSession.find({
      originalTeacherId: originalTeacher._id,
      date: { $gte: startOfDay(leave.startDate), $lte: endOfDay(leave.endDate) },
      status: { $in: ['scheduled', 'substituted'] },
      isLocked: false,
    }).session(session);

    const affectedDates = [
      ...new Set(impactedSessions.map((s) => startOfDay(s.date).toISOString())),
    ].map((d) => new Date(d));

    await ScheduledSession.updateMany(
      { _id: { $in: impactedSessions.map((s) => s._id) } },
      { $set: { status: 'leave_impacted', leaveId: leave._id } },
      { session }
    );

    const substitutionRequests = [];

    for (const schedSession of impactedSessions) {
      const candidates = await rankCandidates(schedSession, originalTeacher);
      const existing = await SubstitutionRequest.findOne({
        scheduledSessionId: schedSession._id,
        status: 'Pending',
      }).session(session);

      if (existing) {
        existing.aiCandidates = candidates.map((c) => ({
          teacherId: c.teacherId,
          score: c.score,
          breakdown: c.breakdown,
          reasons: c.reasons,
          disqualifiers: c.disqualifiers,
        }));
        await existing.save({ session });
        substitutionRequests.push(existing);
      } else {
        const subReq = await SubstitutionRequest.create(
          [
            {
              scheduledSessionId: schedSession._id,
              leaveId: leave._id,
              teacherId: originalTeacher._id,
              timetableId: schedSession.templateSlotId,
              date: schedSession.date,
              timeSlot: schedSession.timeSlot,
              subjectId: schedSession.subjectId,
              program: schedSession.program,
              className: schedSession.className,
              semester: schedSession.semester,
              division: schedSession.division,
              aiCandidates: candidates.map((c) => ({
                teacherId: c.teacherId,
                score: c.score,
                breakdown: c.breakdown,
                reasons: c.reasons,
                disqualifiers: c.disqualifiers,
              })),
              status: 'Pending',
              reason: leave.reason,
            },
          ],
          { session }
        );
        substitutionRequests.push(subReq[0]);
        await sendSubstituteRequested(subReq[0], schedSession);
      }
    }

    leave.status = 'Approved';
    leave.comments = comments;
    leave.reviewedBy = adminUserId;
    leave.reviewedAt = new Date();
    leave.workflowState = 'substitutes_generated';
    leave.impactSummary = {
      affectedDates,
      affectedSessionIds: impactedSessions.map((s) => s._id),
      sessionCount: impactedSessions.length,
    };
    await leave.save({ session });

    await sendLeaveReviewed(leave, originalTeacher, 'Approved', comments);

    await logAudit({
      userId: adminUserId,
      actionType: 'APPROVE',
      entityType: 'TeacherLeave',
      entityId: leave._id,
      correlationId,
      details: {
        impactedSessions: impactedSessions.length,
        substitutionsCreated: substitutionRequests.length,
      },
    });

    await session.commitTransaction();
    return { leave, impactedSessions, substitutionRequests };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
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
