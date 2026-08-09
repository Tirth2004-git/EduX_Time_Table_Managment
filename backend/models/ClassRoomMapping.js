const mongoose = require('mongoose');

const ClassRoomMappingSchema = new mongoose.Schema({
  department: { type: String, ref: 'Department', required: true },
  semester: { type: mongoose.Schema.Types.Mixed, required: true },
  division_id: { type: String, ref: 'Division', required: true },
  classroom_id: { type: String, ref: 'Classroom', required: true },
  academic_year: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure unique mapping for a specific division and academic year
ClassRoomMappingSchema.index({ department: 1, semester: 1, division_id: 1, academic_year: 1 }, { unique: true });

module.exports = mongoose.models.ClassRoomMapping || mongoose.model('ClassRoomMapping', ClassRoomMappingSchema);
