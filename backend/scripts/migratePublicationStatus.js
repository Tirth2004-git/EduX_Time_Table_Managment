const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
const { getMongoUri } = require('../config/env');

async function migratePublicationStatus() {
  await mongoose.connect(getMongoUri());
  // Timetables created before publicationStatus existed were already visible
  // to students. Preserve that established state explicitly; new drafts are
  // always written with publicationStatus: 'draft'.
  const result = await Timetable.updateMany(
    { publicationStatus: { $exists: false } },
    { $set: { publicationStatus: 'published' } },
  );
  console.log(`Marked ${result.modifiedCount} legacy timetable entries as published.`);
  await mongoose.disconnect();
}

migratePublicationStatus().catch(async (error) => {
  console.error('Publication-status migration failed:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
