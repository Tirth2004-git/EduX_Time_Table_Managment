// Atlas connection diagnostic. The application itself starts at backend/server.js.
const mongoose = require('mongoose');
const { getMongoUri } = require('./backend/config/env');

mongoose.connect(getMongoUri())
  .then(() => console.log('MongoDB Atlas connected successfully'))
  .finally(() => mongoose.disconnect())
  .catch((err) => {
    console.error('MongoDB Atlas connection failed:', err.message);
    process.exitCode = 1;
  });
