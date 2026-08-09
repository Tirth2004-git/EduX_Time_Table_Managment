const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const { getMongoUri } = require('../backend/config/env');

const User = require('../backend/models/User');
const Teacher = require('../backend/models/Teacher');

const defaultUsers = [
  {
    username: 'admin',
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    isVerified: true
  },
  {
    username: 'teacher',
    name: 'Teacher User',
    email: 'teacher@example.com',
    password: 'password123',
    role: 'teacher',
    isVerified: true
  },
  {
    username: 'student',
    name: 'Student User',
    email: 'student@example.com',
    password: 'password123',
    role: 'user',
    isVerified: true
  }
];

async function seedUsers() {
  try {
    await mongoose.connect(getMongoUri());
    console.log('Connected to MongoDB');

    // Find a teacher to link to the 'teacher' user
    const teacherDoc = await Teacher.findOne({ teacherID: 'T001' });
    if (teacherDoc) {
      console.log(`Found teacher Dr. R. Sharma (ID: ${teacherDoc._id}). Linking to teacher user account.`);
      const tUser = defaultUsers.find(u => u.username === 'teacher');
      if (tUser) {
        tUser.teacherId = teacherDoc._id;
        tUser.name = teacherDoc.faculty_name;
      }
    }

    for (const userData of defaultUsers) {
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, { username: userData.username }]
      });
      if (existingUser) {
        console.log(`User already exists (email: ${existingUser.email}, username: ${existingUser.username})`);
        existingUser.name = userData.name;
        existingUser.username = userData.username;
        existingUser.email = userData.email;
        existingUser.role = userData.role;
        existingUser.isVerified = userData.isVerified;
        existingUser.password = userData.password;
        if (userData.teacherId) {
          existingUser.teacherId = userData.teacherId;
        }
        await existingUser.save();
        console.log(`Updated user: ${userData.email}`);
      } else {
        await User.create(userData);
        console.log(`Created user: ${userData.email}`);
      }
    }

    console.log('User seeding completed successfully!');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
