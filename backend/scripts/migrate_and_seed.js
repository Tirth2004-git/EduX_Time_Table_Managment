const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB for seeding');

    // Default Admin
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        isVerified: true
      });
      console.log('✅ Default Admin created');
    } else {
      console.log('ℹ️ Admin already exists');
    }

    // Default Teacher
    const teacherExists = await User.findOne({ email: 'teacher@example.com' });
    if (!teacherExists) {
      await User.create({
        name: 'Default Teacher',
        email: 'teacher@example.com',
        password: 'teacher123',
        role: 'teacher',
        isVerified: true
      });
      console.log('✅ Default Teacher created');
    } else {
      console.log('ℹ️ Teacher already exists');
    }

    // Default Student
    const studentExists = await User.findOne({ email: 'student@example.com' });
    if (!studentExists) {
      await User.create({
        name: 'Default Student',
        email: 'student@example.com',
        password: 'student123',
        role: 'student',
        isVerified: true
      });
      console.log('✅ Default Student created');
    } else {
      console.log('ℹ️ Student already exists');
    }

    console.log('✅ Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
