const mongoose = require('mongoose');
const { configureMongoDns, getMongoUri } = require('./env');

const connectDB = async (retries = 5, delay = 5000) => {
  configureMongoDns();
  const dbURI = getMongoUri();
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(dbURI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB connection error: ${error.message}`);
      retries -= 1;
      console.log(`Retrying MongoDB connection... (${retries} attempts left)`);
      if (retries === 0) {
        throw new Error('Could not connect to MongoDB Atlas after multiple attempts.');
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

module.exports = connectDB;
