const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { getMongoUri } = require('../config/env');
const bcrypt = require('bcryptjs');
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
const User = require('../models/User');

async function importDataset() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(getMongoUri());
    console.log('Connected.');

    const datasetPath = path.join(__dirname, '../seeder/Dataset.json');
    console.log(`Reading dataset from ${datasetPath}...`);
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

    // Clear existing data
    console.log('Clearing existing data...');
    await Department.deleteMany({});
    await Semester.deleteMany({});
    await Division.deleteMany({});
    await Teacher.deleteMany({});
    await Subject.deleteMany({});
    await TeacherSubjectMapping.deleteMany({});
    await Classroom.deleteMany({});
    await Laboratory.deleteMany({});
    await TimetableRule.deleteMany({});
    await SchedulingConstraint.deleteMany({});
    await TimetableGenerationConfig.deleteMany({});
    await User.deleteMany({});
    console.log('Database cleared.');

    // ID Maps to replace string IDs with MongoDB ObjectIds
    const mapDept = {};
    const mapSem = {};
    const mapTeacher = {};
    const mapSubject = {};

    // 1. Department
    console.log(`Importing ${dataset.departments.length} Departments...`);
    for (const d of dataset.departments) {
      const doc = await Department.create({
        department_id: d.department_id,
        department_name: d.department_name,
        short_name: d.short_name,
        total_semesters: d.total_semesters
      });
      mapDept[d.department_id] = doc._id;
    }

    // 2. Semester
    console.log(`Importing ${dataset.semesters.length} Semesters...`);
    for (const s of dataset.semesters) {
      const doc = await Semester.create({
        semester_id: s.semester_id,
        department: mapDept[s.department_id],
        semester_number: s.semester_number,
        academic_year: s.academic_year,
        divisions: s.divisions
      });
      mapSem[s.semester_id] = doc._id;
    }

    // 3. Division
    console.log(`Importing ${dataset.divisions.length} Divisions...`);
    for (const d of dataset.divisions) {
      let semRef = mapSem[d.semester];
      if (!semRef && typeof d.semester === 'number') {
        const possibleSem = await Semester.findOne({ semester_number: d.semester, department: mapDept[d.department] });
        if (possibleSem) semRef = possibleSem._id;
      }
      await Division.create({
        division_id: d.division_id,
        department: mapDept[d.department],
        semester: semRef,
        division_name: d.division_name,
        student_strength: d.student_strength
      });
    }

    // 4. Teacher
    console.log(`Importing ${dataset.teachers.length} Teachers...`);
    for (const t of dataset.teachers) {
      const doc = await Teacher.create({
        teacher_id: t.teacher_id,
        name: t.name,
        email: t.email,
        mobile: t.mobile,
        password_hash: t.password_hash, // will be hashed by pre-save hook if not bcrypt
        gender: t.gender,
        department: mapDept[t.department],
        designation: t.designation,
        experience_years: t.experience_years,
        min_hours_per_week: t.min_hours_per_week,
        max_hours_per_week: t.max_hours_per_week,
        current_assigned_hours: t.current_assigned_hours,
        remaining_capacity: t.remaining_capacity,
        allowed_divisions: t.allowed_divisions,
        availability: t.availability,
        blocked_slots: t.blocked_slots,
        preferred_slots: t.preferred_slots,
        status: t.status || 'active',
        subjects: []
      });
      mapTeacher[t.teacher_id] = doc._id;
      
      // Also create a linked user for authentication
      await User.create({
        name: t.name,
        email: t.email,
        password: t.password_hash, // will be hashed by User schema pre-save hook
        role: 'teacher',
        isVerified: true,
        teacher_id: doc._id
      });
    }

    // 5. Subject
    console.log(`Importing ${dataset.subjects.length} Subjects...`);
    for (const s of dataset.subjects) {
      let semRef = mapSem[s.semester];
      if (!semRef) {
         // Some dataset items might just have semester: 1 instead of IT_SEM1. Attempt to find it.
         if (typeof s.semester === 'number') {
            const possibleSem = await Semester.findOne({ semester_number: s.semester, department: mapDept[s.department] });
            if (possibleSem) semRef = possibleSem._id;
         }
      }
      const doc = await Subject.create({
        subject_id: s.subject_id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        department: mapDept[s.department],
        semester: semRef,
        type: s.type,
        category: s.category,
        credits: s.credits,
        weekly_periods: s.weekly_periods,
        is_mandatory: s.is_mandatory,
        requires_lab: s.requires_lab,
        lab_sessions_per_week: s.lab_sessions_per_week,
        lab_duration_slots: s.lab_duration_slots,
        required_room_type: s.required_room_type,
        status: s.status || 'active',
        assignedTeachers: []
      });
      mapSubject[s.subject_id] = doc._id;
    }

    // 6. TeacherSubjectMapping
    console.log(`Importing ${dataset.teacher_subject_mapping.length} TeacherSubjectMappings...`);
    for (const m of dataset.teacher_subject_mapping) {
      let semRef = mapSem[m.semester];
      if (!semRef && typeof m.semester === 'number') {
          const possibleSem = await Semester.findOne({ semester_number: m.semester, department: mapDept[m.department] });
          if (possibleSem) semRef = possibleSem._id;
      }
      
      const priorityList = (m.replacement_priority || []).map(rp => ({
        teacher_id: mapTeacher[rp.teacher_id],
        priority_score: rp.priority_score,
        reason: rp.reason
      })).filter(rp => rp.teacher_id);

      const mapping = await TeacherSubjectMapping.create({
        mapping_id: m.mapping_id,
        teacher_id: mapTeacher[m.teacher_id],
        subject_id: mapSubject[m.subject_id],
        department: mapDept[m.department],
        semester: semRef,
        allowed_divisions: m.allowed_divisions,
        is_primary_teacher: m.is_primary_teacher,
        expertise_level: m.expertise_level,
        experience_with_subject: m.experience_with_subject,
        replacement_priority: priorityList
      });

      await Subject.updateOne(
        { _id: mapSubject[m.subject_id] },
        { $addToSet: { assignedTeachers: mapTeacher[m.teacher_id] } }
      );
      await Teacher.updateOne(
        { _id: mapTeacher[m.teacher_id] },
        { $addToSet: { subjects: mapSubject[m.subject_id] } }
      );
    }

    // 7. Classroom
    console.log(`Importing ${dataset.classrooms.length} Classrooms...`);
    for (const c of dataset.classrooms) {
      await Classroom.create({
        room_id: c.room_id,
        room_name: c.room_name,
        capacity: c.capacity,
        type: c.type,
        available: c.available
      });
    }

    // 8. Laboratory
    console.log(`Importing ${dataset.laboratories.length} Laboratories...`);
    for (const l of dataset.laboratories) {
      await Laboratory.create({
        lab_id: l.lab_id,
        lab_name: l.lab_name,
        capacity: l.capacity,
        equipment: l.equipment,
        available: l.available
      });
    }

    // 9. TimetableRule
    if (dataset.timetable_rules) {
      console.log('Importing Timetable Rules...');
      await TimetableRule.create(dataset.timetable_rules);
    }

    // 10. SchedulingConstraint
    if (dataset.scheduling_constraints) {
      console.log('Importing Scheduling Constraints...');
      await SchedulingConstraint.create(dataset.scheduling_constraints);
    }

    // 11. TimetableGenerationConfig
    if (dataset.timetable_generation_config) {
      console.log('Importing Generation Config...');
      await TimetableGenerationConfig.create(dataset.timetable_generation_config);
    }

    // 12. Create Demo Accounts
    console.log('Creating Demo Accounts...');
    const firstTeacherId = Object.values(mapTeacher)[0];
    
    await User.create([
      {
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
        isVerified: true
      },
      {
        name: 'Demo Teacher',
        email: 'teacher@example.com',
        password: 'password123',
        role: 'teacher',
        linkedTeacherId: firstTeacherId,
        isVerified: true
      },
      {
        name: 'Demo Student',
        email: 'student@example.com',
        password: 'password123',
        role: 'student',
        isVerified: true
      }
    ]);

    console.log('Dataset import completed successfully!');

    const [subjectsWithoutTeachers, teachersWithoutSubjects] = await Promise.all([
      Subject.countDocuments({ assignedTeachers: { $size: 0 } }),
      Teacher.countDocuments({ subjects: { $size: 0 } })
    ]);

    console.log(`Relationship verification: subjects without teachers = ${subjectsWithoutTeachers}, teachers without subjects = ${teachersWithoutSubjects}`);
  } catch (error) {
    console.error('Error importing dataset:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

importDataset();
