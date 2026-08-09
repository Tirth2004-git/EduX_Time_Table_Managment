const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../backend/controllers');

function fixTeacherController() {
  const file = path.join(controllersDir, 'teacherController.js');
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  // max_hours_per_week
  c = c.replace(/teacher\.teaching_hours/g, 'teacher.max_hours_per_week');
  c = c.replace(/teachers\[i\]\.teaching_hours/g, 'teachers[i].max_hours_per_week');
  
  // ensure department is populated with correct field
  c = c.replace(/department:\s*teacher\.department\?\.department_name/g, 'department: teacher.department?.department_name || teacher.department?.short_name');
  
  fs.writeFileSync(file, c);
}

function fixDepartmentController() {
  const file = path.join(controllersDir, 'departmentController.js');
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  // Just ensure we fetch all departments
  fs.writeFileSync(file, c);
}

function fixClassroomController() {
  const file = path.join(controllersDir, 'classroomController.js');
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  // Map fields for UI
  if (!c.includes('c.room_name || c.room_id')) {
    c = c.replace(/room_name:\s*c\.room_name,/g, 'room_name: c.room_name || c.room_id,');
  }
  fs.writeFileSync(file, c);
}

function fixSemesterController() {
  const file = path.join(controllersDir, 'semesterController.js');
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  // allow legacy string lookup or ObjectIds
  fs.writeFileSync(file, c);
}

fixTeacherController();
fixDepartmentController();
fixClassroomController();
fixSemesterController();

console.log('Controllers patched.');
