const mongoose = require('mongoose');
const { getMongoUri } = require('../config/env');

const Classroom = require('../models/Classroom');
const Department = require('../models/Department');
const Division = require('../models/Division');
const Semester = require('../models/Semester');

async function migrateClassrooms() {
  try {
    await mongoose.connect(getMongoUri());
    console.log('Connected to MongoDB.');

    const classrooms = await Classroom.find({ type: 'Classroom' }).sort({ room_id: 1 });
    console.log(`Found ${classrooms.length} classrooms to migrate.`);

    const divisions = await Division.find().populate('semester').populate('department');
    console.log(`Found ${divisions.length} divisions.`);

    if (divisions.length === 0) {
        console.log('No divisions found. Please seed academic data first.');
        process.exit(0);
    }

    let updatedCount = 0;
    
    for (let i = 0; i < classrooms.length; i++) {
      const classroom = classrooms[i];
      // Assign sequentially to divisions (cycling if there are fewer divisions than classrooms)
      const division = divisions[i % divisions.length];
      
      const departmentId = division.department ? division.department._id : null;
      const semesterObj = division.semester;
      const semesterNum = semesterObj ? semesterObj.semester_number : null;
      const classLevel = (semesterNum <= 2) ? 'FY' : (semesterNum <= 4) ? 'SY' : 'TY';
      
      await Classroom.findByIdAndUpdate(classroom._id, {
        department_id: departmentId,
        class_level: classLevel,
        semester: semesterNum,
        division_id: division._id,
        academic_year: '2026-27',
        is_active: true
      });
      
      console.log(`Updated Classroom ${classroom.room_id} -> Dept: ${division.department?.short_name || 'N/A'}, Sem: ${semesterNum}, Div: ${division.division_name}`);
      updatedCount++;
    }

    console.log(`Successfully migrated ${updatedCount} classrooms.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

migrateClassrooms();
