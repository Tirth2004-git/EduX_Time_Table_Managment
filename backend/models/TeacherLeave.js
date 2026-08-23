const mongoose = require('mongoose');

const TeacherLeaveSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String, ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    leaveType: {
      type: String,
      enum: ['single_day', 'multiple_day', 'half_day', 'emergency', 'Medical', 'Casual', 'Duty', 'Personal', 'Other', 'Sick', 'Earned', 'medical', 'casual', 'duty', 'personal'],
      default: 'multiple_day',
    },
    halfDayPeriod: {
      type: String,
      enum: ['morning', 'afternoon', null],
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    comments: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedBy: {
      type: String,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    impactSummary: {
      affectedDates: { type: [Date], default: [] },
      affectedSessionIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledSession' }],
        default: [],
      },
      sessionCount: { type: Number, default: 0 },
    },
    workflowState: {
      type: String,
      enum: ['submitted', 'impact_calculated', 'substitutes_generated', 'completed'],
      default: 'submitted',
    },
  },
  { timestamps: true }
);

TeacherLeaveSchema.index({ teacherId: 1, status: 1 });
TeacherLeaveSchema.index({ startDate: 1, endDate: 1 });
TeacherLeaveSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.TeacherLeave || mongoose.model('TeacherLeave', TeacherLeaveSchema);
