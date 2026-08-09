const fs = require('fs');
const path = require('path');

// 1. Rewrite backend/config/env.js
const envJsPath = path.join(__dirname, '../backend/config/env.js');
const envJsContent = `const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const configureMongoDns = () => {}; // Disabled for local DB

const getMongoUri = () => {
  // Enforce local database
  return 'mongodb://127.0.0.1:27017/timetable-scheduler';
};

const validateRuntimeConfig = () => {
  if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET environment variable is not defined.');
  }
};

module.exports = { configureMongoDns, getMongoUri, validateRuntimeConfig };
`;
fs.writeFileSync(envJsPath, envJsContent);

// 2. Fix the UI dropdown values
function fixComponent(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace value={subject_name} with value={_id} in specific selectors
  // This is a broad replacement to ensure any value mapped to subject_name gets _id instead
  content = content.replace(/value=\{([a-zA-Z0-9_]+)\.subject_name\}/g, 'value={$1._id}');
  
  // Fix the comparisons
  content = content.replace(/=== ([a-zA-Z0-9_]+)\.subject_name/g, '=== $1._id');
  
  fs.writeFileSync(filePath, content);
}

fixComponent(path.join(__dirname, '../frontend/src/components/TimetableBuilder.jsx'));
fixComponent(path.join(__dirname, '../frontend/src/components/SmartGenerateModal.jsx'));
fixComponent(path.join(__dirname, '../frontend/src/components/SubjectManagement.jsx'));
fixComponent(path.join(__dirname, '../frontend/src/components/TeacherManagement.jsx'));

console.log('Local DB strictly enforced in env.js and UI components patched for CastErrors.');
