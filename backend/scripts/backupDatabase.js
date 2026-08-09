const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
const connectDB = require('../config/db');

const run = async () => {
  const backupDirectory = path.resolve(__dirname, '../../backups', `atlas-${new Date().toISOString().replace(/[:.]/g, '-')}`);

  try {
    await connectDB();
    fs.mkdirSync(backupDirectory, { recursive: true });

    const collections = await mongoose.connection.db.listCollections().toArray();
    const manifest = [];

    for (const { name } of collections) {
      const documents = await mongoose.connection.db.collection(name).find({}).toArray();
      fs.writeFileSync(path.join(backupDirectory, `${name}.json`), EJSON.stringify(documents, null, 2));
      manifest.push({ name, documents: documents.length });
    }

    fs.writeFileSync(path.join(backupDirectory, 'manifest.json'), JSON.stringify({
      createdAt: new Date().toISOString(),
      database: mongoose.connection.name,
      collections: manifest,
    }, null, 2));

    console.log(`Backup complete: ${backupDirectory}`);
    console.table(manifest);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
});
