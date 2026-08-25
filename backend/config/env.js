const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const configureMongoDns = () => {}; // Disabled for local DB

const getMongoUri = () => {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
};

const validateRuntimeConfig = () => {
  if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET environment variable is not defined.');
  }
};

module.exports = { configureMongoDns, getMongoUri, validateRuntimeConfig };
