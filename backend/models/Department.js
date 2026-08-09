const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
  department_name: { type: String, required: true },
  short_name: { type: String, required: true },
  total_semesters: { type: Number, required: true }
});
module.exports = mongoose.model('Department', departmentSchema);