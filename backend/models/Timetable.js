const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema(
  {
    department: {
      type: String, ref: 'Department',
      required: [true, 'Department is required'],
    },
    semester: {
      type: String, ref: 'Semester',
      required: [true, 'Semester is required'],
    },
    division: {
      type: String, ref: 'Division',
      required: [true, 'Division is required'],
    },
    day: {
      type: String,
      required: [true, 'Day is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
      trim: true,
    },
    slot_type: {
      type: String,
      enum: ['LECTURE', 'LAB', 'LIBRARY', 'FREE'],
      default: 'LECTURE'
    },
    subject: {
      type: String, ref: 'Subject',
      required: function() { return !['FREE', 'LIBRARY'].includes(this.slot_type); },
    },
    teacher: {
      type: String, ref: 'Teacher',
      required: function() { return !['FREE', 'LIBRARY'].includes(this.slot_type); },
    },
    classroom: {
      type: String, ref: 'Classroom',
    },
    laboratory: {
      type: String, ref: 'Laboratory',
    },
    status: {
      type: String,
      enum: ['valid', 'conflict'],
      default: 'valid',
    },
    publicationStatus: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    isLab: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

TimetableSchema.index({ department: 1, semester: 1, division: 1, day: 1, timeSlot: 1 });
TimetableSchema.index({ teacher: 1, day: 1, timeSlot: 1 });
TimetableSchema.index({ classroom: 1, day: 1, timeSlot: 1 });
TimetableSchema.index({ laboratory: 1, day: 1, timeSlot: 1 });

module.exports = mongoose.models.Timetable || mongoose.model('Timetable', TimetableSchema);
