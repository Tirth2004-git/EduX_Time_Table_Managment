const TeacherLeave = require('../models/TeacherLeave');
const Teacher = require('../models/Teacher');
const {
  calculateLeaveImpact,
  approveLeave,
  rejectLeave,
  submitLeave,
} = require('../services/workflows/leaveWorkflowService');

exports.getLeaves = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const leaves = await TeacherLeave.find(filter)
      .populate('teacherId', 'faculty_name department teacherID')
      .populate('reviewedBy', 'name email')
      .sort({ startDate: -1 });
    res.json({ success: true, leaves });
  } catch (error) {
    next(error);
  }
};

exports.createLeave = async (req, res, next) => {
  try {
    const { teacherId, startDate, endDate, reason, leaveType, halfDayPeriod } = req.body;
    if (!teacherId || !startDate || !endDate) {
      return res.status(400).json({ error: 'teacherId, startDate, and endDate are required' });
    }

    const leave = await submitLeave({
      teacherId,
      startDate,
      endDate,
      reason,
      leaveType,
      halfDayPeriod,
    });

    const populatedLeave = await TeacherLeave.findById(leave._id).populate(
      'teacherId',
      'faculty_name department teacherID'
    );

    res.status(201).json({
      success: true,
      message: 'Leave submitted. Admin notified.',
      leave: populatedLeave,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeaveImpact = async (req, res, next) => {
  try {
    const result = await calculateLeaveImpact(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLeave = async (req, res, next) => {
  try {
    const leave = await TeacherLeave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave record not found' });
    res.json({ success: true, message: 'Leave record deleted', deletedId: req.params.id });
  } catch (error) {
    next(error);
  }
};

exports.reviewLeave = async (req, res, next) => {
  try {
    const { status, comments } = req.body;
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (Approved or Rejected) is required.' });
    }

    let result;
    if (status === 'Approved') {
      result = await approveLeave(req.params.id, req.user.userId, comments || '');
      res.json({
        success: true,
        message: `Leave approved. ${result.substitutionRequests.length} substitute requests created.`,
        leave: result.leave,
        impactedSessions: result.impactedSessions,
        substitutionRequests: result.substitutionRequests,
      });
    } else {
      const leave = await rejectLeave(req.params.id, req.user.userId, comments || '');
      res.json({ success: true, message: 'Leave rejected.', leave });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
