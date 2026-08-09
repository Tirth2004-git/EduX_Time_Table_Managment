require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');

const ensureUser = async ({ name, email, password, role, teacher_id = null }) => {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ name, email, password, role, teacher_id, isVerified: true });
  } else {
    user.name = name;
    user.role = role;
    user.teacher_id = teacher_id;
    user.isVerified = true;
    // Set through the model so the existing pre-save hook hashes it.
    user.password = password;
  }
  await user.save();
  return user;
};

async function seedDemoUsers() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
  await mongoose.connect(uri);
  const adminEmail = process.env.DEMO_ADMIN_EMAIL || 'admin@edux.com';
  const studentEmail = process.env.DEMO_STUDENT_EMAIL || 'student@edux.com';
  await ensureUser({ name: 'Demo Admin', email: adminEmail, password: process.env.DEMO_ADMIN_PASSWORD || 'Admin@123', role: 'admin' });
  await ensureUser({ name: 'Demo Student', email: studentEmail, password: process.env.DEMO_STUDENT_PASSWORD || 'Student@123', role: 'student' });
  const teachers = await Teacher.find({ email: { $type: 'string', $ne: '' } });
  for (const teacher of teachers) {
    await ensureUser({
      name: teacher.faculty_name || teacher.name,
      email: teacher.email,
      password: process.env.DEMO_TEACHER_PASSWORD || 'Teacher@123',
      role: 'teacher',
      teacher_id: teacher._id,
    });
  }
  console.log(`Demo users ready: admin, student, and ${teachers.length} teacher portal account(s).`);
}

seedDemoUsers().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
