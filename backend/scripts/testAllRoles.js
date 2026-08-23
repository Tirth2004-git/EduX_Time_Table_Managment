const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function testRoles() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Testing Core System Roles & Accounts:');

  // 1. Admin
  const admin = await User.findOne({ role: 'admin' });
  console.log('- Admin account:', admin ? `${admin.email} (Found)` : 'Missing');

  // 2. Teachers
  const teachers = await User.find({ role: 'teacher' }).limit(3);
  console.log(`- Teachers registered (${teachers.length} sampled):`, teachers.map(t => `${t.email} (${t.username})`).join(', '));
  if (teachers.length > 0) {
    const isPassOk = await bcrypt.compare('123456', teachers[0].password);
    console.log(`- Teacher "${teachers[0].username}" password '123456' valid:`, isPassOk);
  }

  // 3. Students
  const students = await User.find({ role: 'student' }).limit(3);
  console.log(`- Students registered (${students.length} sampled):`, students.map(s => s.email).join(', '));

  await mongoose.disconnect();
}
testRoles();
