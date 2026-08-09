const fs = require('fs');
const path = require('path');

function processControllers() {
  const dir = path.join(__dirname, '../backend/controllers');
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      let content = fs.readFileSync(path.join(dir, file), 'utf8');
      
      // Fix subject CastError (string to ObjectId)
      // Usually caused when req.body.subject or req.query.subject is used directly
      content = content.replace(/Subject\.find\(\{ _id: \{ \$in: \[([^\]]+)\] \} \}\)/g, 'Subject.find({ _id: { $in: $1.filter(id => mongoose.Types.ObjectId.isValid(id)) } })');
      content = content.replace(/Subject\.findById\(([^)]+)\)/g, 'Subject.findById(mongoose.Types.ObjectId.isValid($1) ? $1 : null)');

      // Fix Subject populate
      if (file === 'subjectController.js') {
        if (!content.includes(".populate('department')")) {
          content = content.replace(/Subject\.find\(\)/g, "Subject.find().populate('department').populate('semester').populate('assignedTeachers')");
        }
      }

      // Fix Classroom populate
      if (file === 'classroomController.js') {
        if (!content.includes(".populate('department_id')")) {
          content = content.replace(/Classroom\.find\(\)/g, "Classroom.find().populate('department_id').populate('semester').populate('division_id')");
        }
      }

      fs.writeFileSync(path.join(dir, file), content);
    }
  }
}

function processFrontend() {
  const compDir = path.join(__dirname, '../frontend/src/components');
  const files = fs.readdirSync(compDir);
  for (const file of files) {
    if (file.endsWith('.jsx')) {
      let content = fs.readFileSync(path.join(compDir, file), 'utf8');
      
      // Fix classroom mapping N/A
      if (file === 'ClassroomManagement.jsx') {
        content = content.replace(/room\.department/g, 'room.department_id?.department_name || room.department_id?.short_name');
        content = content.replace(/room\.semester_number/g, 'room.semester?.semester_number');
        content = content.replace(/room\.division/g, 'room.division_id?.division_name');
      }

      fs.writeFileSync(path.join(compDir, file), content);
    }
  }
}

processControllers();
processFrontend();
console.log('Fixes applied successfully.');
