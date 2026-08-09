const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

async function audit() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
    await mongoose.connect(uri);
    
    const collections = ['departments', 'semesters', 'divisions', 'subjects', 'teachers', 'classrooms', 'academicYears'];
    for (const collName of collections) {
      console.log(`\n--- ${collName} ---`);
      const docs = await mongoose.connection.collection(collName).find({}).limit(2).toArray();
      console.log(JSON.stringify(docs, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
audit();
