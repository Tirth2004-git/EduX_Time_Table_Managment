const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const User = require('../models/User');
const Teacher = require('../models/Teacher');

async function fixUsers() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
    await mongoose.connect(uri);
    console.log("Connected to MongoDB:", uri);
    const db = mongoose.connection.db;

    // Clear existing users
    await db.collection('users').deleteMany({});
    console.log("Cleared old users.");

    // Create Admin
    const admin = new User({
      name: 'Super Admin',
      email: 'admin@edux.com',
      password: 'Admin@123', // Passed as plaintext; Mongoose pre-save hook will hash it exactly once
      role: 'admin',
      isVerified: true
    });
    await admin.save();

    // Create default Teacher
    const dummyTeacher = new User({
      name: 'Demo Teacher',
      email: 'teacher@edux.com',
      password: 'Teacher@123', // Plaintext
      role: 'teacher',
      isVerified: true
    });
    await dummyTeacher.save();

    // Create Teachers from DB
    const allTeachers = await Teacher.find();
    for (const t of allTeachers) {
      if (!t.email) continue;
      const tUser = new User({
        name: t.name,
        email: t.email,
        password: 'Teacher@123', // Plaintext
        role: 'teacher',
        teacher_id: t._id,
        isVerified: true
      });
      await tUser.save();
    }
    
    // Create Student
    const stu = new User({
      name: 'Demo Student',
      email: 'student@edux.com',
      password: 'Student@123', // Plaintext
      role: 'student',
      isVerified: true
    });
    await stu.save();

    console.log(`Successfully created users with correctly single-hashed passwords: Admin, Student, and ${allTeachers.length} teachers.`);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

fixUsers();
