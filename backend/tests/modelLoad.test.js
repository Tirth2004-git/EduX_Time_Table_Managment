const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

test('all Mongoose models load and compile without a database connection', () => {
  const modelsDirectory = path.join(__dirname, '..', 'models');
  const modelFiles = fs.readdirSync(modelsDirectory)
    .filter((file) => file.endsWith('.js'));

  for (const file of modelFiles) {
    assert.doesNotThrow(() => require(path.join(modelsDirectory, file)), file);
  }

  assert.equal(mongoose.connection.readyState, 0);
  assert.ok(Object.keys(mongoose.models).length >= modelFiles.length - 1);
});
