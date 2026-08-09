const mongoose = require('mongoose');
const mappingSchema = new mongoose.Schema({
  mapping_id: { type: String, trim: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  allowed_divisions: [{ type: String }],
  is_primary_teacher: { type: Boolean, default: false },
  expertise_level: { type: String, default: 'Intermediate' },
  experience_with_subject: { type: Number, default: 0 },
  replacement_priority: [{
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    priority_score: { type: Number, default: 0 },
    reason: { type: String, default: '' }
  }]
}, {
  timestamps: true
});
module.exports = mongoose.model('TeacherSubjectMapping', mappingSchema);