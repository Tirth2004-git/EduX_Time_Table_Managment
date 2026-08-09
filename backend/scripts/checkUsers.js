const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edux');
    const users = await User.find({}).select('+password');
    console.log(`Found ${users.length} users.`);
    for (const user of users) {
      console.log(`User: ${user.email}, Role: ${user.role}, isVerified: ${user.isVerified}`);
      console.log(`Password Hash: ${user.password}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
checkUsers();
