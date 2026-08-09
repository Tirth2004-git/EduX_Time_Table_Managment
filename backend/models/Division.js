const mongoose = require('mongoose');
const divisionSchema = new mongoose.Schema({
  division_id: { type: String }, // Legacy string ID
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  division_name: { type: String, required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  student_strength: { type: Number, required: true }
});
module.exports = mongoose.model('Division', divisionSchema);