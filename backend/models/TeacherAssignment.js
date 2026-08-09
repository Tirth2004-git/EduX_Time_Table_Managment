const mongoose = require('mongoose');

const TeacherAssignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String, ref: 'Teacher',
      required: true,
    },
    subjectId: {
      type: String, ref: 'Subject',
      default: null,
    },
    program: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
    },
    division: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

TeacherAssignmentSchema.index({ program: 1, semester: 1, division: 1 });
TeacherAssignmentSchema.index(
  { teacherId: 1, subjectId: 1, program: 1, semester: 1, division: 1 },
  { unique: true, partialFilterExpression: { subjectId: { $type: 'objectId' } } }
);

module.exports = mongoose.models.TeacherAssignment || mongoose.model('TeacherAssignment', TeacherAssignmentSchema);
