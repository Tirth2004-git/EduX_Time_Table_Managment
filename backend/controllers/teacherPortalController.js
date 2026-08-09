const Teacher = require('../models/Teacher');
const Timetable = require('../models/Timetable');
const ScheduledSession = require('../models/ScheduledSession');
const TeacherLeave = require('../models/TeacherLeave');
const Subject = require('../models/Subject');
const SubstitutionRequest = require('../models/SubstitutionRequest');
const Notification = require('../models/Notification');
const { submitLeave, cancelLeave } = require('../services/workflows/leaveWorkflowService');
const { startOfDay, endOfDay, getWeekRange, getDayName } = require('../utils/dateUtils');

const getTeacherId = (req, res) => {
  const teacherId = req.user.teacherId;
  if (!teacherId) {
    res.status(400).json({ error: 'User is not linked to any Teacher record.' });
    return null;
  }
  return teacherId;
};

const timeSlotToMinutes = (slot) => {
  if (!slot || !slot.includes('-')) return 0;
  const startStr = slot.split('-')[0].trim();
  const [hours, minutes] = startStr.split(':').map(Number);
  return hours * 60 + minutes;
};

function enrichSessionForTeacher(session, teacherId) {
  const isSubstitute =
    session.effectiveTeacherId?._id?.toString() === teacherId &&
    session.originalTeacherId?._id?.toString() !== teacherId;
  const isOriginalOnLeave =
    session.originalTeacherId?._id?.toString() === teacherId &&
    session.status === 'leave_impacted';
  const isSubstituted =
    session.originalTeacherId?._id?.toString() === teacherId &&
    session.status === 'substituted';

  let displayLabel = session.subjectId?.subject_name || 'Class';
  let displayType = 'regular';

  if (isSubstitute) {
    displayLabel = `Cover: ${session.subjectId?.subject_name}`;
    displayType = 'cover';
  } else if (isSubstituted) {
    displayLabel = session.subjectId?.subject_name;
    displayType = 'substituted';
  } else if (isOriginalOnLeave) {
    displayLabel = 'Leave Approved — Awaiting Substitute';
    displayType = 'leave_impacted';
  }

  return {
    ...session.toObject(),
    displayLabel,
    displayType,
    substituteName: isSubstituted ? session.effectiveTeacherId?.faculty_name : null,
    isCover: isSubstitute,
  };
}

function enrichTemplateForTeacher(template) {
  const item = template.toObject();
  return {
    ...item,
    // Preserve the response contract used by the timetable grid. Recurring
    // template slots are the source of truth until date-specific sessions are
    // generated for a week.
    originalTeacherId: item.teacher,
    effectiveTeacherId: item.teacher,
    subjectId: item.subject,
    classroomId: item.classroom,
    displayLabel: item.subject?.subject_name || 'Class',
    displayType: 'regular',
    isCover: false,
    program: item.department?.short_name || item.department?.department_name || '',
    semester: item.semester?.semester_number || '',
    division: item.division?.division_name || '',
  };
}

async function getRecurringTeacherSlots(teacherId, day) {
  const query = { teacher: teacherId };
  if (day) query.day = day;
  const templates = await Timetable.find(query)
    .populate('subject', 'subject_name subject_code type')
    .populate('teacher', 'faculty_name')
    .populate('classroom', 'roomNumber program className division')
    .populate('department', 'short_name department_name')
    .populate('semester', 'semester_number')
    .populate('division', 'division_name')
    .sort({ day: 1, timeSlot: 1 });
  return templates.map(enrichTemplateForTeacher);
}
exports.getTimetable = async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req, res);
    if (!teacherId) return;

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

    const timetable = sessions.length
      ? sessions.map((s) => enrichSessionForTeacher(s, teacherId))
      : await getRecurringTeacherSlots(teacherId);

    res.json({
      success: true,
      timetable,
      sessions: timetable,
      source: sessions.length ? 'scheduled_sessions' : 'recurring_timetable',
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeaves = async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req, res);
    if (!teacherId) return;
    const leaves = await TeacherLeave.find({ teacherId }).sort({ startDate: -1 });
    res.json({ success: true, leaves });
  } catch (error) {
    next(error);
  }
};

exports.applyLeave = async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req, res);
    if (!teacherId) return;

    const { startDate, endDate, reason, leaveType, halfDayPeriod } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and End date are required.' });
    }

    const leave = await submitLeave({
      teacherId,
      startDate,
      endDate,
      reason,
      leaveType,
      halfDayPeriod,
    });

    res.status(201).json({
      success: true,
      message: 'Leave submitted. Admin notified for review.',
      leave,
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelLeave = async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req, res);
    if (!teacherId) return;
    await cancelLeave(req.params.id, teacherId);
    res.json({ success: true, message: 'Leave cancelled.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
exports.getNotifications = async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req, res);
    if (!teacherId) return;
    const notifications = await Notification.find({
      $or: [{ teacherId }, { recipientId: teacherId }],
    }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req, res);
    if (!teacherId) return;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ teacherId }, { recipientId: teacherId }] },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req, res);
    if (!teacherId) return;
    const teacher = await Teacher.findById(teacherId).populate('department');
    if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
    
    const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
    const assignments = await TeacherSubjectMapping.find({ teacher_id: teacherId })
      .populate('semester', 'semester_number')
      .populate('department', 'department_name short_name')
      .lean();
    const subjectIds = [...new Set(assignments.map(a => a.subject_id?.toString()).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();

    const assignedHours = await Timetable.countDocuments({ teacher: teacherId });
    const weeklyLimit = Number(teacher.preferences?.maxWorkload) || Number(teacher.teaching_hours) || Number(teacher.max_hours_per_week) || 40;
    const remainingHours = Math.max(0, weeklyLimit - assignedHours);
    const divisions = [...new Set(assignments.flatMap((assignment) =>
      (assignment.allowed_divisions || []).map((division) => ({
        name: division,
        semester: assignment.semester?.semester_number ?? null,
        department: assignment.department?.department_name || assignment.department?.short_name || null,
      }))
    ).map((division) => JSON.stringify(division)))].map(JSON.parse);

    res.json({
      success: true,
      profile: {
        id: teacher._id,
        teacher_id: teacher.teacher_id || teacher.teacherID,
        name: teacher.faculty_name || teacher.name,
        email: req.user?.email || teacher.email, // email usually from user or teacher
        designation: teacher.designation || null,
        department: teacher.department?.department_name || teacher.department?.short_name || null,
        mobile: teacher.mobile || teacher.teacher_number || null,
        classroom: teacher.classroom || null,
        experience: Number(teacher.experience_years) || null,
        teaching_hours: weeklyLimit,
        assignedHours,
        remainingHours,
        divisions,
        subjects: subjects.map((s) => ({
          id: s._id.toString(),
          name: s.subject_name,
          code: s.subject_code,
          requiredPeriods: s.weekly_periods || 0,
          type: s.type,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
