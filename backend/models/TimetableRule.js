const mongoose = require('mongoose');
const ruleSchema = new mongoose.Schema({
  working_days: [{ type: String }],
  periods_per_day: { type: Number },
  period_slots: [{ type: mongoose.Schema.Types.Mixed }],
  breaks: [{ type: mongoose.Schema.Types.Mixed }],
  lab_requires_consecutive_slots: { type: Boolean }
});
module.exports = mongoose.model('TimetableRule', ruleSchema);