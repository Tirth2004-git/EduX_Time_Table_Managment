const mongoose = require('mongoose');
const { getMongoUri } = require('../config/env');

const Subject = require('../models/Subject');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
const Teacher = require('../models/Teacher');

async function checkMappings() {
  try {
    await mongoose.connect(getMongoUri());
    
    const subjects = await Subject.find();
    const mappings = await TeacherSubjectMapping.find();
    const teachers = await Teacher.find();
    
    const teacherIds = new Set(teachers.map(t => t._id.toString()));
    const mappedSubjectIds = new Set(mappings.map(m => m.subject.toString()));
    
    const unmappedSubjects = subjects.filter(s => !mappedSubjectIds.has(s._id.toString()));
    
    const invalidTeachers = new Set();
    mappings.forEach(m => {
      if (m.teacher && !teacherIds.has(m.teacher.toString())) {
        invalidTeachers.add(m.teacher.toString());
      }
      if (m.replacement_priority && m.replacement_priority.length > 0) {
        m.replacement_priority.forEach(r => {
          if (r.teacher && !teacherIds.has(r.teacher.toString())) {
            invalidTeachers.add(r.teacher.toString());
          }
        });
      }
    });

    console.log('Total Subjects:', subjects.length);
    console.log('Mapped Subjects:', mappedSubjectIds.size);
    console.log('Unmapped Subjects:', unmappedSubjects.length);
    console.log('Subjects without teachers:', unmappedSubjects.map(s => s.subject_code));
    console.log('Invalid teacher ids:', Array.from(invalidTeachers));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkMappings();
