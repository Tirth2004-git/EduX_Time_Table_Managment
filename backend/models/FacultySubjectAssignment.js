const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  divisions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Division' }],
  workloadHours: { type: Number, default: 0 }
});

module.exports = mongoose.model('FacultySubjectAssignment', assignmentSchema);
