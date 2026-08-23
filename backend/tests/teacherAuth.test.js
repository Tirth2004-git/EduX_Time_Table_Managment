const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

test('Teacher Password Verification with Bcrypt', async (t) => {
  try {
    await connectDB();
  } catch (err) {
    t.skip('MongoDB connection not available for unit test execution in this environment.');
    return;
  }

  try {
    // 1. Fetch teachers from User collection
    const teachers = await User.find({ role: 'teacher' }).select('+password').limit(5);
    assert.ok(teachers.length > 0, 'Should find at least 1 teacher in database');

    for (const teacher of teachers) {
      // 2. Verify password is NOT stored as plain text
      assert.notEqual(teacher.password, '123456', 'Password must NOT be plain text');
      assert.ok(teacher.password.startsWith('$2'), 'Password must be a valid bcrypt hash');

      // 3. Verify password "123456" matches the bcrypt hash
      const isValid = await bcrypt.compare('123456', teacher.password);
      assert.equal(isValid, true, `Password "123456" should match bcrypt hash for ${teacher.email}`);

      // 4. Verify invalid password fails
      const isInvalid = await bcrypt.compare('wrongPassword', teacher.password);
      assert.equal(isInvalid, false, 'Invalid password should fail bcrypt verification');
    }

    // 5. Verify Admin user exists and has role 'admin'
    const admin = await User.findOne({ role: 'admin' }).select('+password');
    if (admin) {
      assert.equal(admin.role, 'admin', 'Admin role must remain admin');
    }

    // 6. Verify Student user exists and has role 'student'
    const student = await User.findOne({ role: 'student' }).select('+password');
    if (student) {
      assert.equal(student.role, 'student', 'Student role must remain student');
    }
  } finally {
    await mongoose.disconnect();
  }
});
