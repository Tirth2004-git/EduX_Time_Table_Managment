const mongoose = require('mongoose');
const SubstitutionRequest = require('../../models/SubstitutionRequest');
const ScheduledSession = require('../../models/ScheduledSession');
const Teacher = require('../../models/Teacher');
const { rankCandidates } = require('../substituteEngineService');
const { generateCorrelationId, logAudit } = require('../auditService');
const { sendSubstituteAssigned } = require('../notificationService');

async function assignSubstitute(substitutionId, substituteTeacherId, adminUserId, adminNotes = '') {
  const session = await mongoose.startSession();
  session.startTransaction();
  const correlationId = generateCorrelationId();

  try {
    const substitution = await SubstitutionRequest.findById(substitutionId)
      .populate('teacherId')
      .session(session);
    if (!substitution) throw new Error('Substitution request not found');
    if (substitution.status !== 'Pending') {
      throw new Error('Only pending substitution requests can be assigned');
    }

    const substitute = await Teacher.findById(substituteTeacherId).session(session);
    if (!substitute) throw new Error('Substitute teacher not found');

    const schedSession = await ScheduledSession.findById(substitution.scheduledSessionId).session(session);
    if (!schedSession) throw new Error('Scheduled session not found');
    if (schedSession.isLocked) {
      throw new Error('Cannot assign substitute on a locked session');
    }

    schedSession.effectiveTeacherId = substituteTeacherId;
    schedSession.status = 'substituted';
    schedSession.substitutionId = substitution._id;
    await schedSession.save({ session });

    substitution.substituteTeacherId = substituteTeacherId;
    substitution.status = 'Assigned';
    substitution.adminNotes = adminNotes;
    substitution.assignedBy = adminUserId;
    substitution.assignedAt = new Date();
    await substitution.save({ session });

    await logAudit({
      userId: adminUserId,
      actionType: 'ASSIGN',
      entityType: 'SubstitutionRequest',
      entityId: substitution._id,
      correlationId,
      details: {
        substituteTeacherId,
        scheduledSessionId: schedSession._id,
      },
    });

    await session.commitTransaction();

    await sendSubstituteAssigned(
      substitution,
      substitution.teacherId,
      substitute,
      schedSession
    );

    return { substitution, session: schedSession };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

async function rejectSubstitute(substitutionId, adminUserId, adminNotes = '') {
  const substitution = await SubstitutionRequest.findById(substitutionId);
  if (!substitution) throw new Error('Substitution request not found');

  substitution.status = 'Rejected';
  substitution.adminNotes = adminNotes;
  substitution.assignedBy = adminUserId;
  substitution.assignedAt = new Date();
  await substitution.save();

  await logAudit({
    userId: adminUserId,
    actionType: 'REJECT',
    entityType: 'SubstitutionRequest',
    entityId: substitution._id,
    details: { adminNotes },
  });

  return substitution;
}

async function regenerateCandidates(substitutionId) {
  const substitution = await SubstitutionRequest.findById(substitutionId).populate('teacherId');
  if (!substitution) throw new Error('Substitution request not found');

  const schedSession = await ScheduledSession.findById(substitution.scheduledSessionId);
  if (!schedSession) throw new Error('Scheduled session not found');

  const candidates = await rankCandidates(schedSession, substitution.teacherId);
  substitution.aiCandidates = candidates.map((c) => ({
    teacherId: c.teacherId,
    score: c.score,
    breakdown: c.breakdown,
    reasons: c.reasons,
    disqualifiers: c.disqualifiers,
  }));
  await substitution.save();

  return { substitution, candidates };
}

module.exports = {
  assignSubstitute,
  rejectSubstitute,
  regenerateCandidates,
};
