const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../.env' });

const Classroom = require('../models/Classroom');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const AcademicYear = require('../models/AcademicYear');

async function fixClassrooms() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
    await mongoose.connect(uri);
    console.log("Connected to MongoDB:", uri);
    const db = mongoose.connection.db;

    // Drop old classrooms
    await Classroom.deleteMany({});
    console.log("Cleared existing classrooms.");

    const departments = await Department.find();
    const semesters = await Semester.find();
    const divisions = await Division.find();
    
    // Fallback if no academic year exists
    let academicYear = await AcademicYear.findOne();
    if (!academicYear) {
      academicYear = new AcademicYear({
        name: '2026-27',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2027-05-31'),
        isCurrent: true,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      });
      await academicYear.save();
    }
    const yearId = academicYear.name || '2026-27';

    let count = 0;

    for (const dept of departments) {
      const progShort = dept.short_name; // e.g. IT
      
      const deptSems = semesters.filter(s => s.department_id.toString() === dept._id.toString());
      
      for (const sem of deptSems) {
        const semNum = sem.semester_number;
        let yearPrefix = 'FY';
        if (semNum > 2 && semNum <= 4) yearPrefix = 'SY';
        else if (semNum > 4 && semNum <= 6) yearPrefix = 'TY';
        else if (semNum > 6) yearPrefix = 'BE';

        const semDivs = divisions.filter(d => d.semester.toString() === sem._id.toString());
        
        let roomCounter = 1;

        for (const div of semDivs) {
          const divName = div.division_name; // A, B, C...
          const className = `${yearPrefix}${progShort}-${divName}`; // FYIT-A
          const roomNumber = `${semNum}0${roomCounter}`; // 101, 102... 201, 202

          const cls = new Classroom({
            departmentId: dept._id,
            semesterId: sem._id,
            divisionId: div._id,
            className: className,
            roomNumber: roomNumber,
            academicYearId: yearId,
            capacity: 60,
            building: 'Main Campus',
            floor: `Floor ${semNum}`,
            type: 'Lecture Hall',
            available: true
          });
          
          await cls.save();
          count++;
          roomCounter++;
        }
      }
    }

    console.log(`Successfully created ${count} clean classroom records.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

fixClassrooms();
