const mongoose = require('mongoose');
const classroomSchema = new mongoose.Schema({
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division' },
  className: { type: String },
  roomNumber: { type: String },
  academicYearId: { type: String },
  capacity: { type: Number, required: true },
  building: { type: String },
  floor: { type: String },
  type: { type: String, required: true },
  available: { type: Boolean, default: true },
  room_id: { type: String },
  room_name: { type: String }
});
module.exports = mongoose.model('Classroom', classroomSchema);