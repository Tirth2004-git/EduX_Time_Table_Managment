const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Classroom = require('../models/Classroom');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
const FacultySubjectAssignment = require('../models/FacultySubjectAssignment');
const Timetable = require('../models/Timetable');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const depts = await Department.find();
  console.log('Departments:', depts.map(d => ({ id: d._id, name: d.department_name, short: d.short_name })));

  const itDept = depts.find(d => d.short_name === 'IT' || d.department_name.includes('Information Technology'));
  if (itDept) {
    const sem4 = await Semester.findOne({ department: itDept._id, semester_number: 4 });
    console.log('\nIT Sem 4:', sem4 ? { id: sem4._id, semNum: sem4.semester_number, year: sem4.academic_year } : 'None');
    if (sem4) {
      const divs = await Division.find({ department: itDept._id, semester: sem4._id });
      console.log('Divisions in IT Sem 4:', divs.map(d => ({ id: d._id, name: d.division_name })));

      const subs = await Subject.find({ department: itDept._id, semester: sem4._id }).populate('assignedTeachers');
      console.log(`\nSubjects in IT Sem 4 (Total ${subs.length}):`);
      subs.forEach(s => {
        console.log(`  - [${s.type}] ${s.subject_code}: ${s.subject_name} (${s.weekly_periods} periods/wk, requires_lab: ${s.requires_lab}, teachers: ${s.assignedTeachers?.map(t => t.name).join(', ') || 'None'})`);
      });

      const tsm = await TeacherSubjectMapping.find({ department: itDept._id, semester: sem4._id }).populate('teacher_id').populate('subject_id');
      console.log(`\nTeacherSubjectMappings in IT Sem 4 (Total ${tsm.length}):`);
      tsm.forEach(m => {
        console.log(`  - ${m.subject_id?.subject_name} -> ${m.teacher_id?.name} (primary: ${m.is_primary_teacher}, div: ${m.allowed_divisions})`);
      });

      const existingEntries = await Timetable.find({ department: itDept._id, semester: sem4._id });
      console.log(`\nExisting Timetable entries in IT Sem 4: ${existingEntries.length}`);
    }
  }

  const rooms = await Classroom.find();
  console.log(`\nTotal Classrooms in DB: ${rooms.length}`);
  const roomTypes = {};
  rooms.forEach(r => { roomTypes[r.type] = (roomTypes[r.type] || 0) + 1; });
  console.log('Classroom types breakdown:', roomTypes);

  await mongoose.disconnect();
}
check();
