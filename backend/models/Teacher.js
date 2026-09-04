const mongoose = require('mongoose');
require('./Department');
require('./Subject');
const teacherSchema = new mongoose.Schema({
  teacher_id: { type: String, required: true }, // Legacy string ID
  name: { type: String, required: true },
  email: { type: String },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  availability: [{ type: mongoose.Schema.Types.Mixed }],
  blocked_slots: [{ type: mongoose.Schema.Types.Mixed }],
  preferred_slots: [{ type: mongoose.Schema.Types.Mixed }],
  max_hours_per_week: { type: Number, required: true },
  min_hours_per_week: { type: Number, required: true }
});
teacherSchema.index({ teacher_id: 1 });
teacherSchema.index({ department: 1 });
teacherSchema.index({ status: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);