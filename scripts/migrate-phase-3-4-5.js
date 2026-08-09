const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const modelsDir = path.join(__dirname, '../backend/models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
const models = {};

files.forEach(file => {
  const modelName = file.replace('.js', '');
  models[modelName] = require(path.join(modelsDir, file));
});

const getMongoUri = () => {
  return process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
};

const idMap = {
  department: {},
  semester: {},
  division: {},
  subject: {},
  teacher: {},
  classroom: {},
  laboratory: {}
};

function getObjectId(type, stringId) {
  if (!stringId) return null;
  if (!idMap[type]) idMap[type] = {};
  if (!idMap[type][stringId]) {
    idMap[type][stringId] = new mongoose.Types.ObjectId();
  }
  return idMap[type][stringId];
}

async function runMigration() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(getMongoUri());
    console.log('Connected successfully.');

    console.log('--- PHASE 3: REMOVING EXISTING DATA ---');
    for (const modelName of Object.keys(models)) {
      if (models[modelName].deleteMany) {
        await models[modelName].deleteMany({});
        console.log(`Cleared ${modelName}`);
      }
    }
    console.log('Phase 3 complete.');

    console.log('--- PHASE 4 & 5: IMPORT DATASET & OBJECTID MAPPING ---');
    const dataPath = path.join(__dirname, '../backend/seeder/Dataset.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error('Dataset.json not found at ' + dataPath);
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    const subjectTeachers = {}; 
    const teacherSubjects = {}; 
    
    (data.teacher_subject_mapping || []).forEach(m => {
      const sId = getObjectId('subject', m.subject_id);
      const tId = getObjectId('teacher', m.teacher_id);
      
      if (!subjectTeachers[m.subject_id]) subjectTeachers[m.subject_id] = new Set();
      subjectTeachers[m.subject_id].add(tId);
      
      if (!teacherSubjects[m.teacher_id]) teacherSubjects[m.teacher_id] = new Set();
      teacherSubjects[m.teacher_id].add(sId);
    });

    if (data.departments) {
      const depts = data.departments.map(d => ({
        _id: getObjectId('department', d.department_id),
        department_name: d.department_name,
        short_name: d.short_name,
        total_semesters: d.total_semesters
      }));
      await models.Department.insertMany(depts);
      console.log(`Inserted ${depts.length} departments.`);
    }

    const sems = [];
    const divs = [];
    if (data.semesters) {
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
      await models.Semester.insertMany(sems);
      await models.Division.insertMany(divs);
      console.log(`Inserted ${sems.length} semesters and ${divs.length} divisions.`);
    }

    if (data.teachers) {
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
      await models.Teacher.insertMany(teachers);
      console.log(`Inserted ${teachers.length} teachers.`);
    }

    if (data.subjects) {
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
      await models.Subject.insertMany(subjects);
      console.log(`Inserted ${subjects.length} subjects.`);
    }

    if (data.classrooms) {
      const classrooms = data.classrooms.map((c, i) => {
        const div = divs[i % Math.max(divs.length, 1)];
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
          class_level: div ? 'Level' : null,
          academic_year: '2026-27',
          available: true
        };
      });
      if (classrooms.length > 0) {
        await models.Classroom.insertMany(classrooms);
        console.log(`Inserted ${classrooms.length} classrooms.`);
      }
    }

    if (data.laboratories) {
      const labs = data.laboratories.map(l => ({
        _id: getObjectId('laboratory', l.lab_id),
        lab_id: l.lab_id,
        lab_name: l.lab_name,
        capacity: l.capacity,
        department_id: getObjectId('department', l.department),
        available: true
      }));
      await models.Laboratory.insertMany(labs);
      console.log(`Inserted ${labs.length} laboratories.`);
    }

    if (data.teacher_subject_mapping) {
      const facultyAssignments = data.teacher_subject_mapping.map(m => {
        const divObjectIds = (m.allowed_divisions || []).map(d => getObjectId('division', `${m.semester}_${d}`));
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
        await models.FacultySubjectAssignment.insertMany(facultyAssignments);
        console.log(`Inserted ${facultyAssignments.length} FacultySubjectAssignments.`);
      }
    }

    if (data.timetable_rules) {
      await models.TimetableRule.insertMany(data.timetable_rules);
      console.log(`Inserted ${data.timetable_rules.length} timetable rules.`);
    }
    
    if (data.scheduling_constraints) {
      await models.SchedulingConstraint.insertMany(data.scheduling_constraints);
      console.log(`Inserted ${data.scheduling_constraints.length} scheduling constraints.`);
    }
    
    if (data.timetable_generation_config) {
      await models.TimetableGenerationConfig.insertMany([data.timetable_generation_config]);
      console.log(`Inserted timetable generation config.`);
    }

    // Users
    const adminUser = new models.User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    });
    await adminUser.save();

    if (data.teachers && data.teachers.length > 0) {
      const testTeacher = new models.User({
        name: 'Test Teacher',
        email: 'teacher@example.com',
        password: 'teacher123',
        role: 'teacher',
        teacher_id: getObjectId('teacher', data.teachers[0].teacher_id),
        isVerified: true
      });
      await testTeacher.save();

      for (const t of data.teachers) {
        if (t.email !== 'teacher@example.com') {
          const user = new models.User({
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
    }

    const testStudent = new models.User({
      name: 'Test Student',
      email: 'student@example.com',
      password: 'student123',
      role: 'student',
      student_id: 'STU00001',
      isVerified: true
    });
    await testStudent.save();
    console.log(`Inserted initial users.`);

    console.log('Phases 3, 4 & 5 finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
