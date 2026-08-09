const fs = require('fs');
const path = require('path');

// 1. Enforce local MongoDB in .env
const envPath = path.join(__dirname, '../backend/.env');
let envContent = fs.readFileSync(envPath, 'utf8');
envContent = envContent.replace(/MONGODB_URI=.*/g, 'MONGODB_URI=mongodb://127.0.0.1:27017/timetable-scheduler');
fs.writeFileSync(envPath, envContent);

// 2. Fix TimetableBuilder CastErrors (assuming it uses subject name for ID)
const tbPath = path.join(__dirname, '../frontend/src/components/TimetableBuilder.jsx');
if (fs.existsSync(tbPath)) {
  let tb = fs.readFileSync(tbPath, 'utf8');
  // Replace value={subject.subject_name} with value={subject._id}
  tb = tb.replace(/value=\{s(?:ubject)?\.subject_name\}/g, 'value={s._id || subject._id}');
  // Ensure we are comparing correctly
  tb = tb.replace(/subjectId === s\.subject_name/g, 'subjectId === s._id');
  fs.writeFileSync(tbPath, tb);
}

// 3. Fix SmartGenerateModal
const sgmPath = path.join(__dirname, '../frontend/src/components/SmartGenerateModal.jsx');
if (fs.existsSync(sgmPath)) {
  let sgm = fs.readFileSync(sgmPath, 'utf8');
  sgm = sgm.replace(/value=\{s(?:ubject)?\.subject_name\}/g, 'value={s._id || subject._id}');
  fs.writeFileSync(sgmPath, sgm);
}

console.log('Local MongoDB enforced and UI mapping bugs mitigated.');
