const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, '../models');

const models = {
  'Department.js': `const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  department_name: { type: String, required: true },
  short_name: { type: String, required: true },
  total_semesters: { type: Number, required: true }
});
module.exports = mongoose.model('Department', departmentSchema);`,

  'Semester.js': `const mongoose = require('mongoose');
const semesterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  department_id: { type: String, ref: 'Department', required: true },
  semester_number: { type: Number, required: true },
  academic_year: { type: String, required: true },
  divisions: [{ type: String }]
});
module.exports = mongoose.model('Semester', semesterSchema);`,

  'Division.js': `const mongoose = require('mongoose');
const divisionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  department: { type: String, ref: 'Department', required: true },
  semester: { type: Number, required: true },
  division_name: { type: String, required: true },
  student_strength: { type: Number, required: true }
});
module.exports = mongoose.model('Division', divisionSchema);`,

  'Teacher.js': `const mongoose = require('mongoose');
const teacherSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, ref: 'Department', required: true },
  availability: [{ type: String }],
  blocked_slots: [{ type: String }],
  preferred_slots: [{ type: String }],
  max_hours_per_week: { type: Number, required: true },
  min_hours_per_week: { type: Number, required: true }
});
module.exports = mongoose.model('Teacher', teacherSchema);`,

  'Subject.js': `const mongoose = require('mongoose');
const subjectSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  subject_code: { type: String, required: true },
  subject_name: { type: String, required: true },
  semester: { type: String, ref: 'Semester', required: true },
  department: { type: String, ref: 'Department', required: true },
  type: { type: String, required: true },
  credits: { type: Number, required: true },
  weekly_periods: { type: Number, required: true },
  requires_lab: { type: Boolean, required: true },
  required_room_type: { type: String, required: true }
});
module.exports = mongoose.model('Subject', subjectSchema);`,

  'TeacherSubjectMapping.js': `const mongoose = require('mongoose');
const mappingSchema = new mongoose.Schema({
  teacher_id: { type: String, ref: 'Teacher', required: true },
  subject_id: { type: String, ref: 'Subject', required: true },
  allowed_divisions: [{ type: String }],
  is_primary_teacher: { type: Boolean, required: true },
  expertise_level: { type: Number, required: true },
  replacement_priority: { type: Number, required: true }
});
module.exports = mongoose.model('TeacherSubjectMapping', mappingSchema);`,

  'Classroom.js': `const mongoose = require('mongoose');
const classroomSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  capacity: { type: Number, required: true },
  type: { type: String, required: true }
});
module.exports = mongoose.model('Classroom', classroomSchema);`,

  'Laboratory.js': `const mongoose = require('mongoose');
const laboratorySchema = new mongoose.Schema({
  _id: { type: String, required: true },
  lab_name: { type: String, required: true },
  capacity: { type: Number, required: true },
  equipment: [{ type: String }]
});
module.exports = mongoose.model('Laboratory', laboratorySchema);`,

  'TimetableRule.js': `const mongoose = require('mongoose');
const ruleSchema = new mongoose.Schema({
  rule_id: { type: String, required: true },
  rule_type: { type: String, required: true },
  parameters: { type: mongoose.Schema.Types.Mixed },
  is_active: { type: Boolean, required: true },
  severity: { type: String, required: true }
});
module.exports = mongoose.model('TimetableRule', ruleSchema);`,

  'SchedulingConstraint.js': `const mongoose = require('mongoose');
const constraintSchema = new mongoose.Schema({
  constraint_id: { type: String, required: true },
  entity_type: { type: String, required: true },
  entity_id: { type: String, required: true },
  constraint_type: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  priority: { type: String, required: true }
});
module.exports = mongoose.model('SchedulingConstraint', constraintSchema);`,

  'TimetableGenerationConfig.js': `const mongoose = require('mongoose');
const configSchema = new mongoose.Schema({
  config_id: { type: String, required: true },
  academic_year: { type: String, required: true },
  working_days: [{ type: String }],
  daily_periods: { type: Number, required: true },
  period_duration_minutes: { type: Number, required: true },
  breaks: { type: mongoose.Schema.Types.Mixed }
});
module.exports = mongoose.model('TimetableGenerationConfig', configSchema);`,

  'TimetableEntry.js': `const mongoose = require('mongoose');
const entrySchema = new mongoose.Schema({
  entry_id: { type: String },
  department: { type: String, ref: 'Department', required: true },
  semester: { type: String, ref: 'Semester', required: true },
  division_id: { type: String, ref: 'Division', required: true },
  subject_id: { type: String, ref: 'Subject', required: true },
  teacher_id: { type: String, ref: 'Teacher', required: true },
  room_id: { type: String, ref: 'Classroom' },
  lab_id: { type: String, ref: 'Laboratory' },
  day: { type: String, required: true },
  period: { type: Number, required: true },
  is_lab_block: { type: Boolean, default: false },
  status: { type: String, default: 'valid' },
  generated_by: { type: String, default: 'AI' },
  version: { type: Number, default: 1 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

entrySchema.index({ division_id: 1, day: 1, period: 1 });
entrySchema.index({ teacher_id: 1, day: 1, period: 1 });
entrySchema.index({ room_id: 1, day: 1, period: 1 });
entrySchema.index({ lab_id: 1, day: 1, period: 1 });

module.exports = mongoose.model('TimetableEntry', entrySchema);`,

  'User.js': `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  teacher_id: { type: String, ref: 'Teacher', default: null },
  student_id: { type: String, default: null },
  division_id: { type: String, ref: 'Division', default: null }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);`,
};

for (const [filename, content] of Object.entries(models)) {
  fs.writeFileSync(path.join(modelsDir, filename), content);
}
console.log('Successfully updated models.');
