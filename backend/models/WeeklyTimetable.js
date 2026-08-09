const mongoose = require('mongoose');

const WeeklyTimetableSchema = new mongoose.Schema(
  {
    program: {
      type: String,
      required: [true, 'Program is required'],
      trim: true,
    },
    className: {
      type: String,
      required: [true, 'Class name is required'],
      enum: ['FY', 'SY', 'TY'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      enum: [1, 2, 3, 4, 5, 6],
    },
    division: {
      type: String,
      required: [true, 'Division is required'],
      enum: ['A', 'B', 'C', 'D', 'E', 'F'],
      trim: true,
    },
    holidays: {
      type: [String],
      default: [],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    timetableEntries: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

WeeklyTimetableSchema.index({ program: 1, className: 1, semester: 1, division: 1 }, { unique: true });

module.exports = mongoose.models.WeeklyTimetable || mongoose.model('WeeklyTimetable', WeeklyTimetableSchema);
