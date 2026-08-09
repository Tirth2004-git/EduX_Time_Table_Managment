const mongoose = require('mongoose');
const subjectSchema = new mongoose.Schema({
  subject_id: { type: String }, // Legacy string ID
  subject_code: { type: String, required: true },
  subject_name: { type: String, required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  assignedTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  type: { type: String, required: true },
  credits: { type: Number, required: true },
  weekly_periods: { type: Number, required: true },
  requires_lab: { type: Boolean, required: true },
  required_room_type: { type: String, required: true }
});

subjectSchema.index({ department: 1, semester: 1, status: 1, subject_code: 1 });
module.exports = mongoose.model('Subject', subjectSchema);