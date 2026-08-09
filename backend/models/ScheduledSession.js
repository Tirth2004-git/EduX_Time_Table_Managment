const mongoose = require('mongoose');

const ScheduledSessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    timeSlot: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    className: { type: String, enum: ['FY', 'SY', 'TY'], required: true },
    semester: { type: Number, enum: [1, 2, 3, 4, 5, 6], required: true },
    division: { type: String, enum: ['A', 'B', 'C', 'D', 'E', 'F'], required: true },
    subjectId: { type: String, ref: 'Subject', required: true },
    originalTeacherId: { type: String, ref: 'Teacher', required: true },
    effectiveTeacherId: { type: String, ref: 'Teacher', required: true },
    classroomId: { type: String, ref: 'Classroom', default: null },
    templateSlotId: {
      type: String,
      ref: 'Timetable',
      default: null,
    },
    status: {
      type: String,
      enum: ['scheduled', 'leave_impacted', 'substituted', 'cancelled'],
      default: 'scheduled',
    },
    leaveId: { type: String, ref: 'TeacherLeave', default: null },
    substitutionId: {
      type: String,
      ref: 'SubstitutionRequest',
      default: null,
    },
    isLocked: { type: Boolean, default: false },
    isLab: { type: Boolean, default: false },
    duration: { type: Number, default: 1 },
  },
  { timestamps: true }
);

ScheduledSessionSchema.index({ date: 1, effectiveTeacherId: 1 });
ScheduledSessionSchema.index({ date: 1, originalTeacherId: 1 });
ScheduledSessionSchema.index(
  { date: 1, program: 1, className: 1, semester: 1, division: 1, timeSlot: 1 },
  { unique: true }
);
ScheduledSessionSchema.index({ date: 1, classroomId: 1, timeSlot: 1 });
ScheduledSessionSchema.index({ effectiveTeacherId: 1, date: 1, timeSlot: 1 });
ScheduledSessionSchema.index({ status: 1, date: 1 });
ScheduledSessionSchema.index({ leaveId: 1 });
ScheduledSessionSchema.index({ substitutionId: 1 });

module.exports =
  mongoose.models.ScheduledSession || mongoose.model('ScheduledSession', ScheduledSessionSchema);
