const mongoose = require('mongoose');
const { getMongoUri } = require('./backend/config/env');
mongoose.connect(getMongoUri()).then(() => {
  return mongoose.connection.db.collection('users').updateMany({}, { $set: { isVerified: true } });
}).then((res) => {
  console.log('Updated users:', res.modifiedCount);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
