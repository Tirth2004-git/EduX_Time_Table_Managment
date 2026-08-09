require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const { getMongoUri } = require('../config/env');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Import Models
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
const TimetableEntry = require('../models/TimetableEntry');
const User = require('../models/User');

const seedDatabase = async () => {
  try {
    await mongoose.connect(getMongoUri());
    console.log('✅ MongoDB Connected Successfully');

    const datasetPath = path.join(__dirname, '../seeds/Dataset.json');
    if (!fs.existsSync(datasetPath)) {
      throw new Error(`Dataset.json not found at ${datasetPath}`);
    }

    const data = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    console.log('✅ Dataset.json loaded successfully');

    // Clear existing database to wipe out old indexes
    console.log('Dropping database...');
    await mongoose.connection.db.dropDatabase();

    // 1. Departments
    if (data.departments) {
      const depts = data.departments.map(d => ({
        _id: d.department_id,
        department_name: d.department_name,
        short_name: d.short_name,
        total_semesters: d.total_semesters
      }));
      await Department.insertMany(depts);
      console.log(`✅ Seeded ${depts.length} departments`);
    }

    // 2. Semesters
    if (data.semesters) {
      const sems = data.semesters.map(s => ({
        _id: s.semester_id,
        department_id: s.department_id,
        semester_number: s.semester_number,
        academic_year: s.academic_year,
        divisions: s.divisions
      }));
      await Semester.insertMany(sems);
      console.log(`✅ Seeded ${sems.length} semesters`);
    }

    // 3. Divisions
    if (data.divisions) {
      const divs = data.divisions.map(d => ({
        _id: d.division_id,
        department: d.department,
        semester: d.semester,
        division_name: d.division_name,
        student_strength: d.student_strength
      }));
      await Division.insertMany(divs);
      console.log(`✅ Seeded ${divs.length} divisions`);
    }

    // 4. Teachers
    if (data.teachers) {
      const teachers = data.teachers.map(t => ({
        _id: t.teacher_id,
        name: t.name,
        department: t.department,
        availability: t.availability || [],
        blocked_slots: t.blocked_slots || [],
        preferred_slots: t.preferred_slots || [],
        max_hours_per_week: t.max_hours_per_week,
        min_hours_per_week: t.min_hours_per_week
      }));
      await Teacher.insertMany(teachers);
      console.log(`✅ Seeded ${teachers.length} teachers`);
    }

    // 5. Subjects
    if (data.subjects) {
      const subjects = data.subjects.map(s => ({
        _id: s.subject_id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        semester: s.semester,
        department: s.department,
        type: s.type,
        credits: s.credits,
        weekly_periods: s.weekly_periods,
        requires_lab: s.requires_lab,
        required_room_type: s.required_room_type
      }));
      await Subject.insertMany(subjects);
      console.log(`✅ Seeded ${subjects.length} subjects`);
    }

    // 6. TeacherSubjectMapping
    if (data.teacher_subject_mapping) {
      await TeacherSubjectMapping.insertMany(data.teacher_subject_mapping);
      console.log(`✅ Seeded ${data.teacher_subject_mapping.length} teacher_subject_mappings`);
    }

    // 7. Classrooms
    if (data.classrooms) {
      const rooms = data.classrooms.map(c => ({
        _id: c.room_id,
        capacity: c.capacity,
        type: c.type
      }));
      await Classroom.insertMany(rooms);
      console.log(`✅ Seeded ${rooms.length} classrooms`);
    }

    // 8. Laboratories
    if (data.laboratories) {
      const labs = data.laboratories.map(l => ({
        _id: l.lab_id,
        lab_name: l.lab_name,
        capacity: l.capacity,
        equipment: l.equipment || []
      }));
      await Laboratory.insertMany(labs);
      console.log(`✅ Seeded ${labs.length} laboratories`);
    }

    // 9. Timetable Rules
    if (data.timetable_rules) {
      await TimetableRule.create(data.timetable_rules);
      console.log(`✅ Seeded timetable rules`);
    }

    // 10. Scheduling Constraints
    if (data.scheduling_constraints) {
      await SchedulingConstraint.create(data.scheduling_constraints);
      console.log(`✅ Seeded scheduling constraints`);
    }

    // 11. Timetable Generation Config
    if (data.timetable_generation_config) {
      if (Array.isArray(data.timetable_generation_config)) {
        await TimetableGenerationConfig.insertMany(data.timetable_generation_config);
        console.log(`✅ Seeded ${data.timetable_generation_config.length} timetable configs`);
      } else {
        await TimetableGenerationConfig.create(data.timetable_generation_config);
        console.log(`✅ Seeded timetable config`);
      }
    }

    // Default Users
    console.log('Seeding default users...');
    const hashedAdminPass = await bcrypt.hash('admin123', 10);
    const hashedTeacherPass = await bcrypt.hash('teacher123', 10);
    const hashedStudentPass = await bcrypt.hash('student123', 10);
    
    // Pick first teacher/division to link for demo purposes
    const firstTeacher = await Teacher.findOne();
    const firstDivision = await Division.findOne();

    await User.create([
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedAdminPass,
        role: 'admin'
      },
      {
        name: 'Demo Teacher',
        email: 'teacher@example.com',
        password: hashedTeacherPass,
        role: 'teacher',
        teacher_id: firstTeacher ? firstTeacher._id : null
      },
      {
        name: 'Demo Student',
        email: 'student@example.com',
        password: hashedStudentPass,
        role: 'student',
        division_id: firstDivision ? firstDivision._id : null
      }
    ]);
    console.log(`✅ Seeded default users`);

    // Validation Report
    console.log('\\n=======================================');
    console.log('📊 DATA VALIDATION REPORT');
    console.log('=======================================');
    
    const countDepts = await Department.countDocuments();
    const countSems = await Semester.countDocuments();
    const countTeachers = await Teacher.countDocuments();
    const countSubjects = await Subject.countDocuments();
    const countClassrooms = await Classroom.countDocuments();
    const countLabs = await Laboratory.countDocuments();
    const countMappings = await TeacherSubjectMapping.countDocuments();

    console.log(`Departments: ${countDepts}`);
    console.log(`Semesters: ${countSems}`);
    console.log(`Teachers: ${countTeachers}`);
    console.log(`Subjects: ${countSubjects}`);
    console.log(`Classrooms: ${countClassrooms}`);
    console.log(`Labs: ${countLabs}`);
    console.log(`Mappings: ${countMappings}`);

    // Check invalid references in mappings
    const mappings = await TeacherSubjectMapping.find().lean();
    let invalidRefs = 0;
    for (const mapping of mappings) {
      const t = await Teacher.findById(mapping.teacher_id);
      const s = await Subject.findById(mapping.subject_id);
      if (!t || !s) {
        invalidRefs++;
      }
    }
    console.log(`Invalid References: ${invalidRefs}`);
    
    console.log('=======================================');
    console.log('✅ Seed Completed Successfully');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  }
};

seedDatabase();
