const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  student_id: { type: String, default: null },
  // A student's registered academic identity.  These are deliberately kept
  // separate from the timetable currently being viewed in the portal.
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  semester_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', default: null },
  division_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', default: null },
  isVerified: { type: Boolean, default: true },
  otpHash: { type: String, select: false, default: null },
  otpExpiresAt: { type: Date, select: false, default: null },
  otpAttempts: { type: Number, select: false, default: 0 },
  otpLastSentAt: { type: Date, select: false, default: null },
  resetPasswordToken: { type: String, select: false, default: null },
  resetPasswordExpiry: { type: Date, select: false, default: null }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.index({ teacher_id: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
