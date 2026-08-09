const mongoose = require('mongoose');
const semesterSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester_number: { type: Number, required: true },
  academic_year: { type: String, required: true },
  divisions: [{ type: String }]
});
module.exports = mongoose.model('Semester', semesterSchema);