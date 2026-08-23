const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Classroom = require('../models/Classroom');
const { generateTimetableSchedule, DAYS_DEFAULT, WORKING_PERIODS_DEFAULT } = require('../services/schedulingEngine');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const itDept = await Department.findOne({ short_name: 'IT' });
  const sem4 = await Semester.findOne({ department: itDept._id, semester_number: 4 });
  const divA = await Division.findOne({ department: itDept._id, semester: sem4._id, division_name: 'A' });

  const [subjects, teachers, classrooms] = await Promise.all([
    Subject.find().lean(),
    Teacher.find().lean(),
    Classroom.find().lean()
  ]);
  const subMap = new Map(subjects.map(s => [String(s._id), s]));
  const teachMap = new Map(teachers.map(t => [String(t._id), t]));
  const roomMap = new Map(classrooms.map(r => [String(r._id), r]));

  console.log('Generating full timetable schedule for IT Sem 4 Div A...');
  const result = await generateTimetableSchedule({
    departmentId: itDept._id,
    semesterId: sem4._id,
    divisionId: divA._id,
    options: { mode: 'full', includeTheory: true, includeLabs: true },
    userId: new mongoose.Types.ObjectId()
  });

  console.log('\n================ ENGINE RESULT SUMMARY ================');
  console.log('Success:', result.success);
  console.log('Overall Quality Score:', `${result.qualityScore}%`);
  console.log('Detailed Metrics Breakdown:');
  console.log(' - Completion Score:      ', `${result.metrics.completionScore}%`);
  console.log(' - Conflict Score:        ', `${result.metrics.conflictScore}%`);
  console.log(' - Daily Balance Score:   ', `${result.metrics.dailyBalanceScore}%`);
  console.log(' - Subject Spread Score:  ', `${result.metrics.subjectSpreadScore}%`);
  console.log(' - Teacher Load Score:    ', `${result.metrics.teacherLoadScore}%`);
  console.log(' - Room Efficiency Score: ', `${result.metrics.roomEfficiencyScore}%`);
  console.log(' - Gap Efficiency Score:  ', `${result.metrics.gapScore}%`);
  console.log(' - Pattern Diversity:     ', `${result.metrics.patternDiversityScore}%`);
  console.log(' - Lab Distribution Score:', `${result.metrics.labDistributionScore}%`);

  console.log('\n================ WEEKLY SCHEDULE MATRIX ================');
  const matrix = {};
  DAYS_DEFAULT.forEach(d => { matrix[d] = {}; });
  result.entries.forEach(e => {
    const sub = subMap.get(String(e.subjectId));
    const teach = teachMap.get(String(e.teacherId));
    matrix[e.day][e.timeSlot] = `${sub?.subject_code || 'SUB'} (${e.type}) | ${teach?.faculty_name?.split(' ')[0] || 'Teacher'}`;
  });

  console.table(matrix);

  await mongoose.disconnect();
}
test();
