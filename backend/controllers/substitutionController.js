const SubstitutionRequest = require('../models/SubstitutionRequest');
const Teacher = require('../models/Teacher');
const {
  assignSubstitute,
  rejectSubstitute,
  regenerateCandidates,
} = require('../services/workflows/substitutionWorkflowService');

exports.getSubstitutions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await SubstitutionRequest.find(filter)
      .populate('teacherId', 'faculty_name department teacherID')
      .populate('substituteTeacherId', 'faculty_name department')
      .populate('subjectId', 'subject_name subject_code')
      .populate({
        path: 'scheduledSessionId',
        populate: [
          { path: 'subjectId', select: 'subject_name subject_code' },
          { path: 'classroomId', select: 'roomNumber program className division' },
          { path: 'originalTeacherId', select: 'faculty_name' },
        ],
      })
      .populate({
        path: 'aiCandidates.teacherId',
        select: 'faculty_name department teacherID',
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

exports.getSubstitutionById = async (req, res, next) => {
  try {
    const request = await SubstitutionRequest.findById(req.params.id)
      .populate('teacherId')
      .populate('substituteTeacherId')
      .populate('scheduledSessionId')
      .populate({ path: 'aiCandidates.teacherId', select: 'faculty_name department' });

    if (!request) return res.status(404).json({ error: 'Substitution request not found' });
    res.json({ success: true, request });
  } catch (error) {
    next(error);
  }
};

exports.getCandidates = async (req, res, next) => {
  try {
    const { substitution, candidates } = await regenerateCandidates(req.params.id);
    res.json({ success: true, substitution, candidates });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.assignSubstitution = async (req, res, next) => {
  try {
    const { substituteTeacherId, status, adminNotes } = req.body;

    if (status === 'Rejected') {
      const request = await rejectSubstitute(req.params.id, req.user.userId, adminNotes || '');
      return res.json({ success: true, message: 'Substitution rejected.', request });
    }

    if (!substituteTeacherId) {
      return res.status(400).json({ error: 'Substitute teacher ID is required for assignment.' });
    }

    const result = await assignSubstitute(
      req.params.id,
      substituteTeacherId,
      req.user.userId,
      adminNotes || ''
    );

    res.json({
      success: true,
      message: 'Substitute assigned. Timetable updated automatically.',
      request: result.substitution,
      session: result.session,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.regenerateCandidates = async (req, res, next) => {
  try {
    const { substitution, candidates } = await regenerateCandidates(req.params.id);
    res.json({ success: true, substitution, candidates });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
