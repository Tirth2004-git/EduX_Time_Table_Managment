const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/models/User');
const { getMongoUri } = require('./backend/config/env');

const seedUsers = async () => {
  try {
    await mongoose.connect(getMongoUri());
    console.log('Connected to DB');

    const users = [
      {
        name: 'Admin',
        email: 'admin@example.com',
        role: 'admin',
        password: 'admin123',
        isVerified: true
      },
      {
        name: 'Teacher User',
        email: 'teacher@example.com',
        role: 'teacher',
        password: 'teacher123',
        isVerified: true
      },
      {
        name: 'Student User',
        email: 'student@example.com',
        role: 'student',
        password: 'student123',
        isVerified: true
      }
    ];

    for (const u of users) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        // Update password just to be sure
        existing.password = u.password;
        existing.role = u.role;
        await existing.save();
        console.log(`Updated existing user ${u.email}`);
      } else {
        const newUser = new User(u);
        await newUser.save();
        console.log(`Created new user ${u.email}`);
      }
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedUsers();
