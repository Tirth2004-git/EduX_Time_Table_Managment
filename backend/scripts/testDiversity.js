const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const { generateTimetableSchedule } = require('../services/schedulingEngine');

async function testDiversity() {
  await mongoose.connect(process.env.MONGODB_URI);
  const itDept = await Department.findOne({ short_name: 'IT' });
  const sem4 = await Semester.findOne({ department: itDept._id, semester_number: 4 });
  const divA = await Division.findOne({ department: itDept._id, semester: sem4._id, division_name: 'A' });

  const subjects = await Subject.find().lean();
  const subMap = new Map(subjects.map(s => [String(s._id), s]));

  console.log('Testing 3 Consecutive Generations for Diversity & Uniqueness:');

  for (let run = 1; run <= 3; run++) {
    const res = await generateTimetableSchedule({
      departmentId: itDept._id,
      semesterId: sem4._id,
      divisionId: divA._id,
      options: { mode: 'full', includeTheory: true, includeLabs: true, candidatesCount: 8, randomSeed: true },
      userId: new mongoose.Types.ObjectId()
    });

    const mondaySlots = res.entries
      .filter(e => e.day === 'Monday')
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
      .map(e => `${e.timeSlot.slice(0, 5)}: ${subMap.get(String(e.subjectId))?.subject_code || 'SUB'} (${e.type})`)
      .join(' | ');

    console.log(`\nRun #${run} (Quality Score: ${res.qualityScore}%):`);
    console.log(`- Monday arrangement: ${mondaySlots}`);
    console.log(`- Metrics: DailyBalance=${res.metrics.dailyBalanceScore}%, Spread=${res.metrics.subjectSpreadScore}%, TeacherLoad=${res.metrics.teacherLoadScore}%, PatternDiversity=${res.metrics.patternDiversityScore}%`);
  }

  await mongoose.disconnect();
}
testDiversity();
