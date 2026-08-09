const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('every API route module loads', () => {
  const routesDirectory = path.join(__dirname, '..', 'routes');
  const routeFiles = fs.readdirSync(routesDirectory)
    .filter((file) => file.endsWith('.js'));

  for (const file of routeFiles) {
    assert.doesNotThrow(() => require(path.join(routesDirectory, file)), file);
  }
});
