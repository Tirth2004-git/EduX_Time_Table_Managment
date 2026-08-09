const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' });

const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const TeacherAssignment = require('../models/TeacherAssignment');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');

async function repair() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable-scheduler';
    await mongoose.connect(uri);
    console.log("Connected to MongoDB:", uri);
    const db = mongoose.connection.db;

    // 1. Clear relational data and indexes
    const collectionsToClear = ['departments', 'semesters', 'divisions', 'classrooms', 'academicyears', 'teacherassignments', 'teachersubjectmappings', 'users'];
    for (const coll of collectionsToClear) {
      try {
        await db.collection(coll).deleteMany({});
        await db.collection(coll).dropIndexes();
      } catch (e) {
        // ignore drop index errors if they don't exist
      }
    }
    try { await db.collection('teachers').dropIndexes(); } catch(e){}
    try { await db.collection('subjects').dropIndexes(); } catch(e){}

    console.log("Cleared old relational collections.");

    // 2. Create Academic Year
    const year = new AcademicYear({
      name: '2026-27',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    });
    await year.save();

    // 3. Recreate Departments & Semesters & Divisions
    const deptsData = [
      { name: 'Information Technology', short: 'IT', sems: 8 },
      { name: 'Computer Science Engineering', short: 'CSE', sems: 8 },
      { name: 'Mechanical Engineering', short: 'ME', sems: 8 },
      { name: 'Civil Engineering', short: 'CE', sems: 8 },
      { name: 'Electrical Engineering', short: 'EE', sems: 8 }
    ];

    const deptMap = {}; // short_name -> ObjectId
    const semMap = {}; // short_name -> [ObjectId]
    const divMap = {}; // short_name -> [ObjectId]

    for (const d of deptsData) {
      const dept = new Department({
        department_name: d.name,
        short_name: d.short,
        total_semesters: d.sems
      });
      await dept.save();
      deptMap[d.short] = dept._id;
      semMap[d.short] = [];
      divMap[d.short] = [];

      for (let s = 1; s <= d.sems; s++) {
        const sem = new Semester({
          department_id: dept._id,
          semester_number: s,
          academic_year: year.name,
          divisions: ['A', 'B', 'C', 'D'] // Simplified for default
        });
        await sem.save();
        semMap[d.short].push(sem._id);

        for (const divName of sem.divisions) {
          const div = new Division({
            division_id: `${d.short}_SEM${s}_${divName}`,
            department: dept._id,
            semester: sem._id,
            division_name: divName,
            student_strength: 60
          });
          await div.save();
          divMap[d.short].push(div._id);

          // Create Classroom mapping
          const room = new Classroom({
            room_id: `ROOM_${d.short}_S${s}_${divName}`,
            room_name: `Semester ${s} Division ${divName} Room 10${s}${divName.charCodeAt(0) - 64}`,
            capacity: 60,
            type: 'Lecture Hall',
            department_id: dept._id,
            semester: sem._id,
            division_id: div._id,
            academic_year: year.name,
            available: true
          });
          await room.save();
        }
      }
    }
    console.log("Recreated Departments, Semesters, Divisions, and Classrooms.");

    // 4. Migrate Teachers
    const rawTeachers = await db.collection('teachers').find({}).toArray();
    for (const rawT of rawTeachers) {
      const deptShort = rawT.department || 'IT'; // fallback
      const deptId = deptMap[deptShort] || deptMap['IT'];
      
      const fallbackId = 'T' + Math.floor(Math.random()*10000);
      await db.collection('teachers').updateOne(
        { _id: rawT._id },
        {
          $set: {
            teacher_id: rawT.teacherID || rawT.teacher_id || fallbackId,
            name: rawT.faculty_name || rawT.name || 'Unknown',
            department: deptId,
            email: `${rawT.teacherID || rawT.teacher_id || fallbackId}@edux.com`.toLowerCase(),
            max_hours_per_week: rawT.teaching_hours || 40,
            min_hours_per_week: 10,
            subjects: []
          },
          $unset: { faculty_name: "", teaching_hours: "", teacherID: "" }
        }
      );
    }
    console.log("Migrated Teachers.");

    // 5. Migrate Subjects
    const rawSubjects = await db.collection('subjects').find({}).toArray();
    for (const rawS of rawSubjects) {
      // Find a random sem for this dept
      // The old DB might not even have department, let's fallback to IT
      const deptShort = rawS.department || 'IT';
      const deptId = deptMap[deptShort] || deptMap['IT'];
      const sems = semMap[deptShort] || semMap['IT'];
      const randomSem = sems[Math.floor(Math.random() * sems.length)];
      
      await db.collection('subjects').updateOne(
        { _id: rawS._id },
        {
          $set: {
            department: deptId,
            semester: randomSem,
            credits: rawS.credits || 3,
            weekly_periods: rawS.requiredPeriods || 3,
            requires_lab: rawS.type === 'lab',
            required_room_type: rawS.type === 'lab' ? 'Computer Lab' : 'Lecture Hall',
            assignedTeachers: []
          },
          $unset: { requiredPeriods: "" }
        }
      );
    }
    console.log("Migrated Subjects.");

    // 6. Map Teachers to Subjects (Distribute)
    const allTeachers = await Teacher.find();
    const allSubjects = await Subject.find();

    // Group subjects by department
    const subsByDept = {};
    for (const s of allSubjects) {
      const dId = s.department.toString();
      if (!subsByDept[dId]) subsByDept[dId] = [];
      subsByDept[dId].push(s);
    }

    let assignedCount = 0;
    for (const t of allTeachers) {
      const tDeptId = t.department.toString();
      const availableSubs = subsByDept[tDeptId] || [];
      if (availableSubs.length === 0) continue;

      // Assign 3-6 random subjects
      const numToAssign = Math.floor(Math.random() * 4) + 3;
      const assigned = [];
      for (let i = 0; i < numToAssign; i++) {
        const sub = availableSubs[Math.floor(Math.random() * availableSubs.length)];
        if (!assigned.includes(sub._id)) {
          assigned.push(sub._id);
          sub.assignedTeachers.push(t._id);
          await sub.save();
          
          const mapping = new TeacherSubjectMapping({
            _id: new mongoose.Types.ObjectId().toString(),
            teacher_id: t._id.toString(),
            subject_id: sub._id.toString(),
            allowed_divisions: ['A', 'B', 'C', 'D'],
            is_primary: i === 0,
            is_primary_teacher: i === 0,
            expertise_level: 5,
            replacement_priority: 1
          });
          await mapping.save();
          assignedCount++;
        }
      }
      t.subjects = assigned;
      await t.save();
    }
    console.log(`Assigned teachers to subjects. Mappings created: ${assignedCount}`);

    // 7. Create Users
    // Admin
    const adminPass = await bcrypt.hash('Admin@123', 10);
    const admin = new User({
      name: 'Super Admin',
      email: 'admin@edux.com',
      password: adminPass,
      role: 'admin',
      isVerified: true
    });
    await admin.save();

    // Teachers
    const teacherPass = await bcrypt.hash('Teacher@123', 10);
    for (const t of allTeachers) {
      if (!t.email) continue;
      const tUser = new User({
        name: t.name,
        email: t.email,
        password: teacherPass,
        role: 'teacher',
        teacher_id: t._id,
        isVerified: true
      });
      await tUser.save();
    }
    
    // Students (Create 1 default student)
    const studentPass = await bcrypt.hash('Student@123', 10);
    const stu = new User({
      name: 'Demo Student',
      email: 'student@edux.com',
      password: studentPass,
      role: 'student',
      isVerified: true
    });
    await stu.save();

    console.log(`Created users. Admin, Student, and ${allTeachers.length} teachers.`);
    console.log("Database repair complete.");

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

repair();
