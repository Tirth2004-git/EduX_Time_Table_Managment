const mongoose = require('mongoose');
const configSchema = new mongoose.Schema({
  generation_modes: [{ type: String }],
  allow_subject_selection: { type: Boolean },
  allow_teacher_selection: { type: Boolean },
  allow_lab_selection: { type: Boolean },
  allow_manual_period_selection: { type: Boolean },
  allow_ai_generation: { type: Boolean },
  conflict_detection: { type: Boolean }
});
module.exports = mongoose.model('TimetableGenerationConfig', configSchema);