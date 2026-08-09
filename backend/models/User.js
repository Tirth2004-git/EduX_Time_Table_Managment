const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  student_id: { type: String, default: null },
  division_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', default: null },
  isVerified: { type: Boolean, default: true }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);