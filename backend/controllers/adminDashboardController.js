const TeacherLeave = require('../models/TeacherLeave');
const SubstitutionRequest = require('../models/SubstitutionRequest');
const ScheduledSession = require('../models/ScheduledSession');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Division = require('../models/Division');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');
const { getWeekRange } = require('../utils/dateUtils');
const eventAnalyticsService = require('../services/eventAnalyticsService');

exports.getAdminDashboard = async (req, res, next) => {
  try {
    // Parallel Live Database Aggregations
    const [
      totalTeachers,
      totalSubjects,
      totalClassrooms,
      totalDepartments,
      totalDivisions,
      scheduledPeriods,
      pendingLeaves,
      approvedLeaves,
      unreadNotifications,
      eventStats,
    ] = await Promise.all([
      Teacher.countDocuments(),
      Subject.countDocuments({ status: { $ne: 'inactive' } }),
      Classroom.countDocuments({ available: true }),
      Department.countDocuments(),
      Division.countDocuments(),
      Timetable.countDocuments({ status: { $ne: 'draft' } }),
      TeacherLeave.countDocuments({ status: 'Pending' }),
      TeacherLeave.countDocuments({ status: 'Approved' }),
      Notification.countDocuments({ recipientType: 'admin', isRead: false }),
      eventAnalyticsService.getGlobalEventStats(),
    ]);

    // Calculate realistic ERP utilization based on actual configured division capacity
    // 6 working days * 6 academic periods = 36 slots per division per week
    const slotsPerDivision = 36;
    const totalSlots = Math.max(scheduledPeriods, totalDivisions * slotsPerDivision);
    const utilization = totalSlots > 0
      ? Number(((scheduledPeriods / totalSlots) * 100).toFixed(1))
      : 0;

    const upcomingEvents = eventStats.upcomingEvents || 0;
    const eventRegistrations = eventStats.totalRegistrations || 0;
    const totalRevenue = eventStats.totalRevenue || 0;
    const timetableStatus = scheduledPeriods > 0 ? 'Active' : 'Pending Generation';

    res.json({
      success: true,
      data: {
        // Core Statistics with Aliases for full backward-compatibility
        activeFaculty: totalTeachers,
        totalTeachers,
        configuredSubjects: totalSubjects,
        totalSubjects,
        classrooms: totalClassrooms,
        totalClassrooms,
        activeDivisions: totalDivisions,
        totalDivisions,
        totalDepartments,
        scheduledPeriods,
        filledSlots: scheduledPeriods,
        totalSlots,
        utilization,
        utilizationRate: Math.round(utilization),
        timetableStatus,
        pendingLeaves,
        approvedLeaves,
        unreadNotifications,
        upcomingEvents,
        eventRegistrations,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error('Error fetching admin dashboard statistics:', error);
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
