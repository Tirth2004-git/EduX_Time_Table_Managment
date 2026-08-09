const TeacherLeave = require('../models/TeacherLeave');
const SubstitutionRequest = require('../models/SubstitutionRequest');
const ScheduledSession = require('../models/ScheduledSession');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Division = require('../models/Division');
const Timetable = require('../models/Timetable');
const { getAllTeachersWorkload, getRoomUtilization } = require('../services/workloadEngine');
const { getWeekRange } = require('../utils/dateUtils');

exports.getAdminDashboard = async (req, res, next) => {
  try {
    const { start, end } = getWeekRange();
    
    // Aggregations requested by user
    const [
      totalTeachers,
      totalSubjects,
      totalDepartments,
      totalDivisions,
      timetablesGenerated,
      pendingLeaves,
      approvedLeaves,
      unreadNotifications,
    ] = await Promise.all([
      Teacher.countDocuments(),
      Subject.countDocuments(),
      Department.countDocuments(),
      Division.countDocuments(),
      Timetable.countDocuments(),
      TeacherLeave.countDocuments({ status: 'Pending' }),
      TeacherLeave.countDocuments({ status: 'Approved' }),
      Notification.countDocuments({ recipientType: 'admin', isRead: false }),
    ]);

    const timetableStatus = timetablesGenerated > 0 ? 'Active' : 'Pending Generation';

    res.json({
      success: true,
      data: {
        totalTeachers,
        totalSubjects,
        totalDepartments,
        totalDivisions,
        timetableStatus,
        pendingLeaves,
        approvedLeaves,
        unreadNotifications,
        timetablesGenerated,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      $or: [{ recipientType: 'admin' }, { userId: req.user.userId }],
    })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

exports.markAdminNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

exports.seedAcademicData = async (req, res, next) => {
  try {
    const seedAcademicData = require('../seeder/seedAcademicData');
    const result = await seedAcademicData(req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
