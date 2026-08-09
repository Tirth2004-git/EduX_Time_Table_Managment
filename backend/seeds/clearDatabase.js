require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoUri } = require('../config/env');

// Import all models
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
const Classroom = require('../models/Classroom');
const Laboratory = require('../models/Laboratory');
const TimetableRule = require('../models/TimetableRule');
const SchedulingConstraint = require('../models/SchedulingConstraint');
const TimetableGenerationConfig = require('../models/TimetableGenerationConfig');
const Timetable = require('../models/Timetable'); // Also clear timetables just in case

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(getMongoUri());
    console.log('Connected.');

    console.log('Clearing old collections...');
    
    const dropIfExists = async (Model) => {
      try {
        await Model.collection.drop();
      } catch (err) {
        if (err.code !== 26) { // 26 is NamespaceNotFound
          throw err;
        }
      }
    };
    
    await dropIfExists(Department);
    await dropIfExists(Semester);
    await dropIfExists(Division);
    await dropIfExists(Teacher);
    await dropIfExists(Subject);
    await dropIfExists(TeacherSubjectMapping);
    await dropIfExists(Classroom);
    await dropIfExists(Laboratory);
    await dropIfExists(TimetableRule);
    await dropIfExists(SchedulingConstraint);
    await dropIfExists(TimetableGenerationConfig);
    await dropIfExists(Timetable);
    
    // Also might want to clear any Users that were connected to old schema
    const User = require('../models/User');
    await dropIfExists(User);

    console.log('Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

clearDatabase();
