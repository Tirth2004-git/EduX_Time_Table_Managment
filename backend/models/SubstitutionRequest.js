const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema(
  {
    teacherId: { type: String, ref: 'Teacher', required: true },
    score: { type: Number, default: 0 },
    breakdown: {
      subjectMatch: { type: Number, default: 0 },
      departmentMatch: { type: Number, default: 0 },
      availability: { type: Number, default: 0 },
      workloadBalance: { type: Number, default: 0 },
      preferenceMatch: { type: Number, default: 0 },
    },
    reasons: { type: [String], default: [] },
    disqualifiers: { type: [String], default: [] },
  },
  { _id: false }
);

const SubstitutionRequestSchema = new mongoose.Schema(
  {
    scheduledSessionId: {
      type: String,
      ref: 'ScheduledSession',
      default: null,
    },
    leaveId: {
      type: String,
      ref: 'TeacherLeave',
      default: null,
    },
    teacherId: {
      type: String, ref: 'Teacher',
      required: true,
    },
    timetableId: {
      type: String,
      ref: 'Timetable',
      default: null,
    },
    date: { type: Date, required: true },
    timeSlot: { type: String, trim: true, default: '' },
    subjectId: { type: String, ref: 'Subject', default: null },
    program: { type: String, trim: true, default: '' },
    className: { type: String, trim: true, default: '' },
    semester: { type: Number, default: null },
    division: { type: String, trim: true, default: '' },
    aiCandidates: { type: [CandidateSchema], default: [] },
    substituteTeacherId: {
      type: String, ref: 'Teacher',
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Assigned', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    reason: { type: String, trim: true, default: '' },
    adminNotes: { type: String, trim: true, default: '' },
    assignedBy: { type: String, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SubstitutionRequestSchema.index({ scheduledSessionId: 1 });
SubstitutionRequestSchema.index({ status: 1, date: 1 });
SubstitutionRequestSchema.index({ leaveId: 1 });

module.exports =
  mongoose.models.SubstitutionRequest ||
  mongoose.model('SubstitutionRequest', SubstitutionRequestSchema);
