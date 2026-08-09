const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Load environment variables from backend/.env
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

const { getMongoUri } = require('../config/env');

const User = require('../models/User');

async function seedUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(getMongoUri());
    console.log('Connected successfully.');

    // 1. Remove old demo users
    console.log('Clearing old users...');
    await User.deleteMany({});
    console.log('Old users deleted.');

    // 2. Create fresh users with correct roles and passwords
    // Note: User.create triggers the 'pre-save' hook in User.js which uses bcrypt.hash
    const freshUsers = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
      },
      {
        name: 'Teacher User',
        email: 'teacher@example.com',
        password: 'teacher123',
        role: 'teacher',
      },
      {
        name: 'Student User',
        email: 'student@example.com',
        password: 'student123',
        role: 'student',
      }
    ];

    // 3. Insert into database
    console.log('Inserting fresh users...');
    const createdUsers = [];
    for (const userData of freshUsers) {
      // Create saves the user, which runs bcrypt.hash() under the hood
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`Inserted: ${user.email} as ${user.role}`);
    }

    console.log('All fresh users inserted successfully.');
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
