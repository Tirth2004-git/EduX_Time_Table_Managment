const ScheduledSession = require('../models/ScheduledSession');
const { startOfDay, endOfDay, getWeekRange } = require('../utils/dateUtils');

exports.getSessions = async (req, res, next) => {
  try {
    const { date, from, to, teacherId, division, program, className, semester, status } = req.query;
    const filter = {};

    if (date) {
      filter.date = startOfDay(date);
    } else if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(from);
      if (to) filter.date.$lte = endOfDay(to);
    }

    if (teacherId) {
      filter.$or = [
        { originalTeacherId: teacherId },
        { effectiveTeacherId: teacherId },
      ];
    }
    if (division) filter.division = division;
    if (program) filter.program = program;
    if (className) filter.className = className;
    if (semester) filter.semester = Number(semester);
    if (status) filter.status = status;

    const sessions = await ScheduledSession.find(filter)
      .populate('subjectId', 'subject_name subject_code type')
      .populate('originalTeacherId', 'faculty_name department teacherID')
      .populate('effectiveTeacherId', 'faculty_name department teacherID')
      .populate('classroomId', 'roomNumber program className division')
      .populate('leaveId', 'status reason')
      .sort({ date: 1, timeSlot: 1 });

    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherSessions = async (req, res, next) => {
  try {
    const teacherId = req.params.teacherId || req.user.teacherId;
    const { from, to } = req.query;
    const range = from && to ? { start: startOfDay(from), end: endOfDay(to) } : getWeekRange();

    const sessions = await ScheduledSession.find({
      $or: [{ originalTeacherId: teacherId }, { effectiveTeacherId: teacherId }],
      date: { $gte: range.start, $lte: range.end },
    })
      .populate('subjectId', 'subject_name subject_code type')
      .populate('originalTeacherId', 'faculty_name')
      .populate('effectiveTeacherId', 'faculty_name')
      .populate('classroomId', 'roomNumber program className division')
      .sort({ date: 1, timeSlot: 1 });

    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
};

exports.getSessionById = async (req, res, next) => {
  try {
    const session = await ScheduledSession.findById(req.params.id)
      .populate('subjectId')
      .populate('originalTeacherId')
      .populate('effectiveTeacherId')
      .populate('classroomId')
      .populate('substitutionId');

    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

exports.cancelSession = async (req, res, next) => {
  try {
    const session = await ScheduledSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isLocked) {
      return res.status(400).json({ error: 'Cannot cancel a locked session' });
    }

    session.status = 'cancelled';
    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};
