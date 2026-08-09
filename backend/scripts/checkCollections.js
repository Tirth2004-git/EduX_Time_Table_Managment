const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function checkCollections() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
    await mongoose.connect(uri);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Connected to:", uri);
    console.log("Collections in DB:");
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`- ${col.name} (Count: ${count})`);
    }
    
    // Check users explicitly
    const User = require('../models/User');
    const users = await User.find({}).select('+password');
    console.log(`\nFound ${users.length} users.`);
    for (const user of users) {
      console.log(`User: ${user.email}, Role: ${user.role}, isVerified: ${user.isVerified}, Name: ${user.name}`);
      console.log(`Password Hash: ${user.password}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
checkCollections();
