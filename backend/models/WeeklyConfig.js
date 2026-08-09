const mongoose = require('mongoose');

const WeeklyConfigSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

WeeklyConfigSchema.index({ program: 1, className: 1, semester: 1, division: 1 }, { unique: true });

module.exports = mongoose.models.WeeklyConfig || mongoose.model('WeeklyConfig', WeeklyConfigSchema);
