const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ['teacher', 'admin', 'user'],
      default: 'teacher',
    },
    recipientId: {
      type: String,
      default: null,
    },
    teacherId: {
      type: String, ref: 'Teacher',
      default: null,
    },
    userId: {
      type: String,
      ref: 'User',
      default: null,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        'leave_submitted',
        'leave_approved',
        'leave_rejected',
        'leave_cancelled',
        'leave_status',
        'substitute_requested',
        'substitute_assigned',
        'substitution',
        'timetable_published',
        'timetable_updated',
        'timetable_change',
        'conflict_detected',
        'workload_exceeded',
        'announcement',
      ],
      required: true,
    },
    entityType: { type: String, trim: true, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ teacherId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
