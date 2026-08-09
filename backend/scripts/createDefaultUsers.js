const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: __dirname + '/../.env' });

async function createDefaultUsers() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
    await mongoose.connect(uri);
    console.log("Connected to MongoDB:", uri);

    const defaultUsers = [
      {
        name: 'Admin User',
        email: 'admin@edux.com',
        password: 'Admin@123',
        role: 'admin',
        isVerified: true
      },
      {
        name: 'Teacher User',
        email: 'teacher@edux.com',
        password: 'Teacher@123',
        role: 'teacher',
        isVerified: true
      },
      {
        name: 'Student User',
        email: 'student@edux.com',
        password: 'Student@123',
        role: 'student',
        isVerified: true
      }
    ];

    for (const userData of defaultUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists. Updating password and role...`);
        existingUser.password = userData.password;
        existingUser.role = userData.role;
        existingUser.isVerified = true;
        // User.js has a pre-save hook that hashes the password if it's modified.
        await existingUser.save();
        console.log(`Updated user: ${userData.email}`);
      } else {
        const newUser = new User(userData);
        await newUser.save();
        console.log(`Created user: ${userData.email}`);
      }
    }

  } catch (err) {
    console.error("Error creating default users:", err);
  } finally {
    mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

createDefaultUsers();
