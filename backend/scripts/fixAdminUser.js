const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

async function fixAdminUser() {
  try {
    await connectDB();
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Update or ensure admin@example.com and admin@edux.com
    await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      {
        $set: {
          name: 'System Administrator',
          password: hashedPassword,
          role: 'admin',
          isVerified: true
        }
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { email: 'admin@edux.com' },
      {
        $set: {
          name: 'Demo Admin',
          password: hashedPassword,
          role: 'admin',
          isVerified: true
        }
      },
      { upsert: true, new: true }
    );

    const user = await User.findOne({ email: 'admin@example.com' }).select('+password');
    const isMatch = await bcrypt.compare(adminPassword, user.password);

    console.log('==============================================');
    console.log('✅ ADMIN CREDENTIALS CONFIGURED SUCCESSFULLY');
    console.log('----------------------------------------------');
    console.log('Email:    admin@example.com (or admin@edux.com)');
    console.log(`Password: ${adminPassword}`);
    console.log(`Role:     ${user.role}`);
    console.log(`Verified: ${isMatch ? 'YES (Bcrypt match OK)' : 'NO'}`);
    console.log('==============================================');

  } catch (err) {
    console.error('Error configuring admin user:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixAdminUser();
