const mongoose = require('mongoose');
const { getMongoUri } = require('./config/env');

async function check() {
  await mongoose.connect(getMongoUri());
  
  const Classroom = require('./models/Classroom');
  const classes = await Classroom.find({}).lean();
  console.log(JSON.stringify(classes.slice(0, 3), null, 2));
  mongoose.disconnect();
}
check().catch(console.error);
