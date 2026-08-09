const mongoose = require('mongoose');

const AcademicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    semesters: [
      {
        name: { type: String, trim: true },
        termNumber: { type: Number, min: 1, max: 6 },
        startDate: { type: Date },
        endDate: { type: Date },
      },
    ],
    examPeriods: [
      {
        name: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        blocksScheduling: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true }
);

AcademicYearSchema.index({ isCurrent: 1 });
AcademicYearSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.models.AcademicYear || mongoose.model('AcademicYear', AcademicYearSchema);
