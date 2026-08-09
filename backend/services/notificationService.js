const Notification = require('../models/Notification');
const User = require('../models/User');

async function notifyTeacher(teacherId, payload) {
  return Notification.create({
    recipientType: 'teacher',
    recipientId: teacherId,
    teacherId,
    ...payload,
  });
}

async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'admin', isVerified: true }).select('_id');
  const docs = admins.map((admin) => ({
    recipientType: 'admin',
    recipientId: admin._id,
    userId: admin._id,
    ...payload,
  }));
  if (docs.length === 0) return [];
  return Notification.insertMany(docs);
}

async function notifyUser(userId, payload) {
  return Notification.create({
    recipientType: 'user',
    recipientId: userId,
    userId,
    ...payload,
  });
}

async function sendLeaveSubmitted(leave, teacher) {
  await notifyAdmins({
    title: 'New Leave Request',
    message: `${teacher.faculty_name} submitted leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}.`,
    type: 'leave_submitted',
    entityType: 'TeacherLeave',
    entityId: leave._id,
  });
}

async function sendLeaveReviewed(leave, teacher, status, comments) {
  await notifyTeacher(teacher._id, {
    title: `Leave Request ${status}`,
    message: `Your leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} was ${status.toLowerCase()}. Notes: ${comments || 'None'}.`,
    type: status === 'Approved' ? 'leave_approved' : 'leave_rejected',
    entityType: 'TeacherLeave',
    entityId: leave._id,
  });
}

async function sendSubstituteRequested(substitution, session) {
  await notifyAdmins({
    title: 'Substitute Required',
    message: `Leave impact: ${session.program} ${session.className}-${session.division} on ${new Date(session.date).toLocaleDateString()} at ${session.timeSlot}.`,
    type: 'substitute_requested',
    entityType: 'SubstitutionRequest',
    entityId: substitution._id,
  });
}

async function sendSubstituteAssigned(substitution, originalTeacher, substituteTeacher, session) {
  const dateStr = new Date(session.date).toLocaleDateString();
  await notifyTeacher(originalTeacher._id, {
    title: 'Substitute Assigned',
    message: `Your class on ${dateStr} at ${session.timeSlot} will be covered by ${substituteTeacher.faculty_name}.`,
    type: 'substitute_assigned',
    entityType: 'SubstitutionRequest',
    entityId: substitution._id,
  });
  await notifyTeacher(substituteTeacher._id, {
    title: 'Cover Lecture Assigned',
    message: `You are assigned to cover ${session.program} ${session.className}-${session.division} on ${dateStr} at ${session.timeSlot}.`,
    type: 'substitute_assigned',
    entityType: 'SubstitutionRequest',
    entityId: substitution._id,
  });
}

module.exports = {
  notifyTeacher,
  notifyAdmins,
  notifyUser,
  sendLeaveSubmitted,
  sendLeaveReviewed,
  sendSubstituteRequested,
  sendSubstituteAssigned,
};
