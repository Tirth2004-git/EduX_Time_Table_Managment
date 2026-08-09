const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const { getMongoUri } = require('../backend/config/env');

const Department = require('../backend/models/Department');
const Semester = require('../backend/models/Semester');
const Division = require('../backend/models/Division');
const Subject = require('../backend/models/Subject');
const Teacher = require('../backend/models/Teacher');
const Classroom = require('../backend/models/Classroom');
const TeacherSubjectMapping = require('../backend/models/TeacherSubjectMapping');
const TeacherAssignment = require('../backend/models/TeacherAssignment');
const FacultySubjectAssignment = require('../backend/models/FacultySubjectAssignment');
const User = require('../backend/models/User');
const Timetable = require('../backend/models/Timetable');
const ScheduledSession = require('../backend/models/ScheduledSession');

const idMap = {
  department: {},
  semester: {},
  division: {},
  subject: {},
  teacher: {},
  classroom: {}
};

function getObjectId(type, stringId) {
  if (!stringId) return null;
  if (!idMap[type][stringId]) {
    idMap[type][stringId] = new mongoose.Types.ObjectId();
  }
  return idMap[type][stringId];
}

async function seedJson() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(getMongoUri());
    console.log('Connected successfully.');

    // 1. Clear Data
    console.log('Clearing existing data...');
    await Department.deleteMany({});
    await Semester.deleteMany({});
    await Division.deleteMany({});
    await Subject.deleteMany({});
    await Teacher.deleteMany({});
    await Classroom.deleteMany({});
    await TeacherSubjectMapping.deleteMany({});
    await TeacherAssignment.deleteMany({});
    await FacultySubjectAssignment.deleteMany({});
    await User.deleteMany({});
    await Timetable.deleteMany({});
    await ScheduledSession.deleteMany({});
    console.log('Cleared successfully.');

    // 2. Load JSON
    const dataPath = path.join(__dirname, '../backend/seeder/Dataset.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error('Dataset.json not found at ' + dataPath);
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Prepare relationships based on teacher_subject_mapping
    const subjectTeachers = {}; // subjectId -> set of teacher ObjectIds
    const teacherSubjects = {}; // teacherId -> set of subject ObjectIds
    
    (data.teacher_subject_mapping || []).forEach(m => {
      const sId = getObjectId('subject', m.subject_id);
      const tId = getObjectId('teacher', m.teacher_id);
      
      if (!subjectTeachers[m.subject_id]) subjectTeachers[m.subject_id] = new Set();
      subjectTeachers[m.subject_id].add(tId);
      
      if (!teacherSubjects[m.teacher_id]) teacherSubjects[m.teacher_id] = new Set();
      teacherSubjects[m.teacher_id].add(sId);
    });

    // 3. Departments
    const depts = data.departments.map(d => ({
      _id: getObjectId('department', d.department_id),
      department_name: d.department_name,
      short_name: d.short_name,
      total_semesters: d.total_semesters
    }));
    await Department.insertMany(depts);
    console.log(`Inserted ${depts.length} departments.`);

    // 4. Semesters & Divisions
    const sems = [];
    const divs = [];
    data.semesters.forEach(s => {
      sems.push({
        _id: getObjectId('semester', s.semester_id),
        department_id: getObjectId('department', s.department_id),
        semester_number: s.semester_number,
        academic_year: s.academic_year,
        divisions: s.divisions
      });

      s.divisions.forEach(d => {
        const divId = `${s.semester_id}_${d}`;
        divs.push({
          _id: getObjectId('division', divId),
          division_id: divId,
          department: getObjectId('department', s.department_id),
          semester: getObjectId('semester', s.semester_id),
          division_name: d,
          student_strength: 60,
          students: []
        });
      });
    });
    await Semester.insertMany(sems);
    await Division.insertMany(divs);
    console.log(`Inserted ${sems.length} semesters and ${divs.length} divisions.`);

    // 5. Teachers
    const teachers = data.teachers.map(t => ({
      _id: getObjectId('teacher', t.teacher_id),
      teacher_id: t.teacher_id,
      name: t.name,
      email: t.email,
      department: getObjectId('department', t.department),
      subjects: Array.from(teacherSubjects[t.teacher_id] || []),
      availability: [t.availability],
      blocked_slots: t.blocked_slots,
      preferred_slots: t.preferred_slots,
      max_hours_per_week: t.max_hours_per_week,
      min_hours_per_week: t.min_hours_per_week
    }));
    await Teacher.insertMany(teachers);
    console.log(`Inserted ${teachers.length} teachers.`);

    // 6. Subjects
    const subjects = data.subjects.map(s => {
      const semStrId = `${s.department}_SEM${s.semester}`;
      return {
        _id: getObjectId('subject', s.subject_id),
        subject_id: s.subject_id,
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        semester: getObjectId('semester', semStrId),
        department: getObjectId('department', s.department),
        assignedTeachers: Array.from(subjectTeachers[s.subject_id] || []),
        type: s.type,
        credits: s.credits,
        weekly_periods: s.weekly_periods,
        requires_lab: s.requires_lab,
        required_room_type: s.required_room_type
      };
    });
    await Subject.insertMany(subjects);
    console.log(`Inserted ${subjects.length} subjects.`);

    // 7. Classrooms
    const classrooms = (data.classrooms || []).map((c, i) => {
      const div = divs[i % divs.length];
      return {
        _id: getObjectId('classroom', c.room_id),
        room_id: c.room_id,
        capacity: c.capacity,
        type: c.type,
        room_name: c.room_name || c.room_id,
        building: c.building || 'Main Block',
        department_id: div ? div.department : null,
        semester: div ? div.semester : null,
        division_id: div ? div._id : null,
        class_level: div ? `Level` : null,
        academic_year: '2026-27',
        available: true
      };
    });
    if (classrooms.length > 0) {
      await Classroom.insertMany(classrooms);
      console.log(`Inserted ${classrooms.length} classrooms.`);
    }

    // 8. FacultySubjectAssignment
    const facultyAssignments = (data.teacher_subject_mapping || []).map(m => {
      const divObjectIds = m.allowed_divisions.map(d => getObjectId('division', `${m.semester}_${d}`));
      return {
        teacherId: getObjectId('teacher', m.teacher_id),
        subjectId: getObjectId('subject', m.subject_id),
        departmentId: getObjectId('department', m.department),
        semester: getObjectId('semester', m.semester),
        divisions: divObjectIds,
        workloadHours: 0
      };
    });
    
    if (facultyAssignments.length > 0) {
      await FacultySubjectAssignment.insertMany(facultyAssignments);
      console.log(`Inserted ${facultyAssignments.length} FacultySubjectAssignments.`);
    }

    // 9. Users
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    });
    await adminUser.save();

    const testTeacher = new User({
      name: 'Test Teacher',
      email: 'teacher@example.com',
      password: 'teacher123',
      role: 'teacher',
      teacher_id: data.teachers[0] ? getObjectId('teacher', data.teachers[0].teacher_id) : null,
      isVerified: true
    });
    await testTeacher.save();

    const testStudent = new User({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'student123',
      role: 'student',
      student_id: 'STU00001',
      isVerified: true
    });
    await testStudent.save();
    
    for (const t of data.teachers) {
      if (t.email !== 'teacher@example.com') {
        const user = new User({
          name: t.name,
          email: t.email,
          password: 'password123',
          role: 'teacher',
          teacher_id: getObjectId('teacher', t.teacher_id),
          isVerified: true
        });
        await user.save();
      }
    }
    console.log(`Inserted users.`);

    console.log('Seeding finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedJson();
