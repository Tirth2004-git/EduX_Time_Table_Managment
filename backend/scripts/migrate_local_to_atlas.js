/**
 * migrate_local_to_atlas.js
 * Migrates ALL collections from local MongoDB → MongoDB Atlas
 * Run from: backend/
 *   node scripts/migrate_local_to_atlas.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: __dirname + '/../.env' });

const LOCAL_URI  = 'mongodb://127.0.0.1:27017/timetable-scheduler';
const ATLAS_URI  = process.env.MONGODB_URI;
const DB_NAME    = 'timetable-scheduler';

if (!ATLAS_URI) {
  console.error('❌ MONGODB_URI not set in .env');
  process.exit(1);
}

async function migrate() {
  console.log('🔌 Connecting to local MongoDB...');
  const localClient = new MongoClient(LOCAL_URI);
  await localClient.connect();
  const localDb = localClient.db(DB_NAME);

  console.log('🔌 Connecting to Atlas...');
  const atlasClient = new MongoClient(ATLAS_URI);
  await atlasClient.connect();
  const atlasDb = atlasClient.db(DB_NAME);

  const collections = await localDb.listCollections().toArray();
  console.log(`\n📋 Found ${collections.length} collection(s): ${collections.map(c => c.name).join(', ')}\n`);

  let totalMigrated = 0;

  for (const col of collections) {
    const name = col.name;
    console.log(`⏳ Migrating collection: ${name}`);

    const docs = await localDb.collection(name).find({}).toArray();

    if (docs.length === 0) {
      console.log(`   ⚠️  Empty — skipping\n`);
      continue;
    }

    const atlasCol = atlasDb.collection(name);

    // Drop existing data in Atlas for this collection so we get a clean import
    await atlasCol.deleteMany({});

    const result = await atlasCol.insertMany(docs, { ordered: false });
    console.log(`   ✅ Inserted ${result.insertedCount}/${docs.length} documents\n`);
    totalMigrated += result.insertedCount;
  }

  // Re-create indexes from local to Atlas
  console.log('🔧 Syncing indexes...');
  for (const col of collections) {
    const name = col.name;
    try {
      const indexes = await localDb.collection(name).indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue; // skip default _id index
        const { key, name: idxName, unique, sparse, expireAfterSeconds } = idx;
        const opts = { name: idxName };
        if (unique) opts.unique = true;
        if (sparse) opts.sparse = true;
        if (expireAfterSeconds !== undefined) opts.expireAfterSeconds = expireAfterSeconds;
        try {
          await atlasDb.collection(name).createIndex(key, opts);
        } catch (e) {
          console.warn(`   ⚠️  Index "${idxName}" on "${name}": ${e.message}`);
        }
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not sync indexes for "${name}": ${e.message}`);
    }
  }

  await localClient.close();
  await atlasClient.close();

  console.log(`\n🎉 Migration complete! Total documents migrated: ${totalMigrated}`);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
