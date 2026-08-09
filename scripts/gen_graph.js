const fs = require('fs');
const path = require('path');
const modelsDir = path.join(__dirname, '..', 'backend', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
const deps = {};
files.forEach(f => {
  const content = fs.readFileSync(path.join(modelsDir, f), 'utf8');
  const model = f.replace('.js', '');
  deps[model] = [];
  const regex = /ref:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!deps[model].includes(match[1])) {
      deps[model].push(match[1]);
    }
  }
});
console.log('```mermaid');
console.log('graph TD;');
for (const [m, d] of Object.entries(deps)) {
  d.forEach(dep => console.log(`  ${m} --> ${dep};`));
}
console.log('```');
