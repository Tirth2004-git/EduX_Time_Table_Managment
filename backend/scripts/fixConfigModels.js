const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, '../models');

const models = {
  'TimetableRule.js': `const mongoose = require('mongoose');
const ruleSchema = new mongoose.Schema({
  working_days: [{ type: String }],
  periods_per_day: { type: Number },
  period_slots: [{ type: mongoose.Schema.Types.Mixed }],
  breaks: [{ type: mongoose.Schema.Types.Mixed }],
  lab_requires_consecutive_slots: { type: Boolean }
});
module.exports = mongoose.model('TimetableRule', ruleSchema);`,

  'SchedulingConstraint.js': `const mongoose = require('mongoose');
const constraintSchema = new mongoose.Schema({
  hard_constraints: [{ type: String }],
  soft_constraints: [{ type: String }]
});
module.exports = mongoose.model('SchedulingConstraint', constraintSchema);`,

  'TimetableGenerationConfig.js': `const mongoose = require('mongoose');
const configSchema = new mongoose.Schema({
  generation_modes: [{ type: String }],
  allow_subject_selection: { type: Boolean },
  allow_teacher_selection: { type: Boolean },
  allow_lab_selection: { type: Boolean },
  allow_manual_period_selection: { type: Boolean },
  allow_ai_generation: { type: Boolean },
  conflict_detection: { type: Boolean }
});
module.exports = mongoose.model('TimetableGenerationConfig', configSchema);`,
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, filename), content);
}
console.log('Successfully updated config models.');
