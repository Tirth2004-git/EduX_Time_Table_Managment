const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local or .env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
} else {
  const envRootPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envRootPath)) {
    const envFile = fs.readFileSync(envRootPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim();
      }
    });
  }
}

const { getMongoUri } = require('../backend/config/env');

// Import official models
const Teacher = require('../backend/models/Teacher');
const Classroom = require('../backend/models/Classroom');
const Subject = require('../backend/models/Subject');
const TeacherAssignment = require('../backend/models/TeacherAssignment');
const User = require('../backend/models/User');
const Timetable = require('../backend/models/Timetable');
const ScheduledSession = require('../backend/models/ScheduledSession');

const programMap = {
  'IT': 'Information Technology',
  'CE': 'Computer Engineering',
  'ME': 'Mechanical Engineering',
  'EC': 'Electronics and Communication',
  'CS': 'Computer Science & Technology',
  'AIDS': 'Artificial Intelligence & Data Science',
  'CY': 'Cyber Security'
};

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(getMongoUri());
    console.log('Connected successfully.');

    // Clear existing data in all collections
    await User.deleteMany({});
    console.log('Cleared existing users.');

    await Teacher.deleteMany({});
    console.log('Cleared existing teachers.');

    await Classroom.deleteMany({});
    console.log('Cleared existing classrooms.');

    await Subject.deleteMany({});
    console.log('Cleared existing subjects.');

    await TeacherAssignment.deleteMany({});
    console.log('Cleared existing teacher assignments.');

    await Timetable.deleteMany({});
    console.log('Cleared existing timetable entries.');


    await ScheduledSession.deleteMany({});
    console.log('Cleared existing scheduled sessions.');

    // Drop old indexes on classrooms to prevent E11000 duplicate key error
    try {
      await Classroom.collection.dropIndexes();
      console.log('Dropped old indexes on classrooms collection.');
    } catch (e) {
      console.log('No classroom indexes to drop or already dropped.');
    }

    // Read and parse data.csv
    const csvPath = path.join(__dirname, '../data.csv');
    if (!fs.existsSync(csvPath)) {
      throw new Error(`data.csv not found at ${csvPath}`);
    }
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }

    // Append custom rows for Semester 6 Information Technology (Divisions A, B, C, D, E, F)
    const sem6Divs = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const div of sem6Divs) {
      rows.push(
        {
          Program: 'IT', ClassName: 'TY', Semester: '6', Division: div,
          Day: 'Monday', TimeSlot: '09:30-10:25',
          SubjectName: 'Information Security', SubjectShort: 'IS', SubjectCode: 'IT601',
          TeacherName: 'Dr. S. K. Gupta', FacultyShort: 'SKG', Email: 'skgupta@example.com',
          Department: 'Information Technology', TeachingHours: '6', RequiredPeriods: '6',
          AssignedHours: '1', Classroom: `A-${600 + div.charCodeAt(0)}`, Mode: 'Offline', Batch: ''
        },
        {
          Program: 'IT', ClassName: 'TY', Semester: '6', Division: div,
          Day: 'Monday', TimeSlot: '10:25-11:20',
          SubjectName: 'Data Mining & Business Intelligence', SubjectShort: 'DMBI', SubjectCode: 'IT602',
          TeacherName: 'Prof. Rajesh Mehta', FacultyShort: 'RM', Email: 'rajeshmehta@example.com',
          Department: 'Information Technology', TeachingHours: '6', RequiredPeriods: '6',
          AssignedHours: '1', Classroom: `A-${600 + div.charCodeAt(0)}`, Mode: 'Offline', Batch: ''
        },
        {
          Program: 'IT', ClassName: 'TY', Semester: '6', Division: div,
          Day: 'Tuesday', TimeSlot: '09:30-10:25',
          SubjectName: 'Software Project Management', SubjectShort: 'SPM', SubjectCode: 'IT603',
          TeacherName: 'Mrs. Anjali Sharma', FacultyShort: 'AS', Email: 'anjalisharma@example.com',
          Department: 'Information Technology', TeachingHours: '4', RequiredPeriods: '4',
          AssignedHours: '1', Classroom: `A-${600 + div.charCodeAt(0)}`, Mode: 'Offline', Batch: ''
        },
        {
          Program: 'IT', ClassName: 'TY', Semester: '6', Division: div,
          Day: 'Tuesday', TimeSlot: '10:25-11:20',
          SubjectName: 'Internet of Things', SubjectShort: 'IoT', SubjectCode: 'IT604',
          TeacherName: 'Dr. Vikram Sen', FacultyShort: 'VS', Email: 'vikramsen@example.com',
          Department: 'Information Technology', TeachingHours: '6', RequiredPeriods: '6',
          AssignedHours: '1', Classroom: `A-${600 + div.charCodeAt(0)}`, Mode: 'Offline', Batch: ''
        },
        {
          Program: 'IT', ClassName: 'TY', Semester: '6', Division: div,
          Day: 'Wednesday', TimeSlot: '09:30-10:25',
          SubjectName: 'Information Security Lab', SubjectShort: 'ISL', SubjectCode: 'IT601L',
          TeacherName: 'Dr. S. K. Gupta', FacultyShort: 'SKG', Email: 'skgupta@example.com',
          Department: 'Information Technology', TeachingHours: '6', RequiredPeriods: '6',
          AssignedHours: '2', Classroom: `A-${600 + div.charCodeAt(0)}`, Mode: 'Offline', Batch: 'A1'
        },
        {
          Program: 'IT', ClassName: 'TY', Semester: '6', Division: div,
          Day: 'Wednesday', TimeSlot: '10:25-11:20',
          SubjectName: 'Information Security Lab', SubjectShort: 'ISL', SubjectCode: 'IT601L',
          TeacherName: 'Dr. S. K. Gupta', FacultyShort: 'SKG', Email: 'skgupta@example.com',
          Department: 'Information Technology', TeachingHours: '6', RequiredPeriods: '6',
          AssignedHours: '2', Classroom: `A-${600 + div.charCodeAt(0)}`, Mode: 'Offline', Batch: 'A2'
        }
      );
    }

    console.log(`Parsed ${rows.length} rows from data.csv (including custom Sem-6 IT rows)`);

    // 1. Seed Teachers
    const teacherMap = new Map();
    let teacherCounter = 1;
    for (const row of rows) {
      if (!row.TeacherName) continue;
      if (!teacherMap.has(row.TeacherName)) {
        const teacherID = `T${String(teacherCounter++).padStart(3, '0')}`;
        teacherMap.set(row.TeacherName, {
          teacherID,
          faculty_name: row.TeacherName,
          subject_name: row.SubjectName,
          department: row.Department || 'Information Technology',
          teaching_hours: Number(row.TeachingHours) || 4,
          teacher_number: `8799246${String(teacherCounter).padStart(3, '0')}`,
          classroom: row.Classroom || 'N/A',
          assignedHours: 0,
          remainingHours: Number(row.TeachingHours) || 4,
          workload: [],
          allowedDivisions: ['A', 'B', 'C']
        });
      }
    }

    const seededTeachers = await Teacher.insertMany(Array.from(teacherMap.values()));
    console.log(`Seeded ${seededTeachers.length} teachers successfully.`);

    // Map teacher name to database ObjectId
    const teacherIdMap = new Map();
    seededTeachers.forEach(t => {
      teacherIdMap.set(t.faculty_name, t._id);
    });

    // 2. Seed Subjects
    const subjectMap = new Map();
    for (const row of rows) {
      if (!row.SubjectCode) continue;
      const normProgram = programMap[row.Program?.toUpperCase()] || row.Program;
      const semesterNum = Number(row.Semester);
      if (!normProgram || !semesterNum) continue;
      const subjectKey = `${normProgram}_${semesterNum}_${row.SubjectCode}`;
      if (!subjectMap.has(subjectKey)) {
        const teacherId = teacherIdMap.get(row.TeacherName) || null;
        const requiredPeriods = Number(row.RequiredPeriods) || 4;
        subjectMap.set(subjectKey, {
          subject_name: row.SubjectName,
          subject_code: row.SubjectCode,
          teacherId: teacherId,
          teacherIds: teacherId ? [teacherId] : [],
          program: normProgram,
          department: row.Department || normProgram,
          semester: semesterNum,
          requiredPeriods: requiredPeriods,
          allottedPeriods: 0,
          remainingPeriods: requiredPeriods,
          type: row.SubjectName.toLowerCase().includes('lab') ? 'lab' : 'theory'
        });
      }
    }

    const seededSubjects = await Subject.insertMany(Array.from(subjectMap.values()));
    console.log(`Seeded ${seededSubjects.length} subjects successfully.`);

    // 3. Seed Teacher Assignments
    const assignmentSet = new Set();
    const assignmentsToInsert = [];
    for (const row of rows) {
      if (!row.TeacherName || !row.Program || !row.Semester || !row.Division) continue;
      const teacherId = teacherIdMap.get(row.TeacherName);
      if (!teacherId) continue;
      const normProgram = programMap[row.Program.toUpperCase()] || row.Program;
      const semesterNum = Number(row.Semester);

      const subject = seededSubjects.find((item) =>
        item.subject_code === row.SubjectCode && item.program === normProgram && item.semester === semesterNum
      );
      if (!subject) continue;
      const key = `${teacherId}_${subject._id}_${normProgram}_${semesterNum}`;
      if (!assignmentSet.has(key)) {
        assignmentSet.add(key);
        assignmentsToInsert.push({
          teacherId,
          subjectId: subject._id,
          program: normProgram,
          semester: semesterNum,
          division: null
        });
      }
    }

    const seededAssignments = await TeacherAssignment.insertMany(assignmentsToInsert);
    console.log(`Seeded ${seededAssignments.length} teacher assignments successfully.`);

    // 4. Seed Classrooms (FY, SY, TY for all programs and divisions A, B, C)
    const programs = [
      'Information Technology',
      'Cyber Security',
      'Computer Science & Technology',
      'Computer Engineering',
      'Artificial Intelligence & Data Science',
    ];
    const classMapping = [
      { className: 'FY', semesters: [1, 2] },
      { className: 'SY', semesters: [3, 4] },
      { className: 'TY', semesters: [5, 6] },
    ];
    const divisions = ['A', 'B', 'C', 'D', 'E', 'F'];
    const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const classroomData = [];
    let roomCounter = 101;

    for (const program of programs) {
      for (const item of classMapping) {
        for (const semester of item.semesters) {
          for (const division of divisions) {
            classroomData.push({
              program,
              className: item.className,
              semester,
              division,
              year: currentYear,
              roomNumber: `${roomCounter++}`,
            });
          }
        }
      }
    }

    const seededClassrooms = await Classroom.insertMany(classroomData);
    console.log(`Seeded ${seededClassrooms.length} classrooms successfully.`);

    // 5. Seed default users
    const defaultUsers = [
      {
        username: 'admin',
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        isVerified: true
      },
      {
        username: 'teacher',
        name: 'Teacher User',
        email: 'teacher@example.com',
        password: 'teacher123',
        role: 'teacher',
        isVerified: true
      },
      {
        username: 'student',
        name: 'Student User',
        email: 'student@example.com',
        password: 'student123',
        role: 'student',
        isVerified: true
      },
      {
        username: 'skgupta',
        name: 'Dr. S. K. Gupta',
        email: 'skgupta@example.com',
        password: 'password123',
        role: 'teacher',
        isVerified: true
      },
      {
        username: 'rajeshmehta',
        name: 'Prof. Rajesh Mehta',
        email: 'rajeshmehta@example.com',
        password: 'password123',
        role: 'teacher',
        isVerified: true
      },
      {
        username: 'anjalisharma',
        name: 'Mrs. Anjali Sharma',
        email: 'anjalisharma@example.com',
        password: 'password123',
        role: 'teacher',
        isVerified: true
      },
      {
        username: 'vikramsen',
        name: 'Dr. Vikram Sen',
        email: 'vikramsen@example.com',
        password: 'password123',
        role: 'teacher',
        isVerified: true
      }
    ];

    // Find first teacher (Dr. R. Sharma) to link to teacher user account
    const drSharma = seededTeachers.find(t => t.teacherID === 'T001');
    if (drSharma) {
      console.log(`Found teacher Dr. R. Sharma (${drSharma._id}). Linking to teacher user account.`);
      const tUser = defaultUsers.find(u => u.username === 'teacher');
      if (tUser) {
        tUser.teacherId = drSharma._id;
        tUser.name = drSharma.faculty_name;
      }
    }

    // Link other new teachers as well
    const otherTeachers = [
      { username: 'skgupta', name: 'Dr. S. K. Gupta' },
      { username: 'rajeshmehta', name: 'Prof. Rajesh Mehta' },
      { username: 'anjalisharma', name: 'Mrs. Anjali Sharma' },
      { username: 'vikramsen', name: 'Dr. Vikram Sen' }
    ];
    otherTeachers.forEach(ot => {
      const match = seededTeachers.find(t => t.faculty_name === ot.name);
      if (match) {
        const uObj = defaultUsers.find(u => u.username === ot.username);
        if (uObj) {
          uObj.teacherId = match._id;
          console.log(`Linked user ${uObj.username} to teacher document ID: ${match._id}`);
        }
      }
    });

    const seededUsers = [];
    for (const userData of defaultUsers) {
      const user = await User.create(userData);
      seededUsers.push(user);
    }
    console.log(`Seeded ${seededUsers.length} default users successfully.`);

    const adminUser = seededUsers.find(u => u.role === 'admin');

    // 6. Seed Timetable Template Entries from data.csv
    const timetableData = [];
    for (const row of rows) {
      if (!row.Day || !row.TimeSlot || !row.SubjectCode || !row.TeacherName || !row.Program || !row.ClassName || !row.Semester || !row.Division) {
        continue;
      }

      const teacherId = teacherIdMap.get(row.TeacherName);
      const normProgram = programMap[row.Program.toUpperCase()] || row.Program;
      const semesterNum = Number(row.Semester);
      const subject = seededSubjects.find((item) =>
        item.subject_code === row.SubjectCode && item.program === normProgram && item.semester === semesterNum
      );
      const subjectId = subject ? subject._id : null;

      const classroom = seededClassrooms.find(c => 
        c.program === normProgram && 
        c.className === row.ClassName && 
        c.semester === semesterNum && 
        c.division === row.Division
      );
      const classroomId = classroom ? classroom._id : null;

      if (!teacherId || !subjectId) {
        console.warn(`Skipping timetable slot: ${row.SubjectCode} / ${row.TeacherName} - teacher or subject not found.`);
        continue;
      }

      const isLab = row.SubjectName.toLowerCase().includes('lab');
      const duration = isLab ? 2 : 1;

      timetableData.push({
        program: normProgram,
        className: row.ClassName,
        semester: semesterNum,
        division: row.Division,
        day: row.Day,
        timeSlot: row.TimeSlot,
        subjectId,
        teacherId,
        classroomId,
        status: 'valid',
        isLab,
        duration,
        createdBy: adminUser._id
      });
    }

    const seededTimetables = await Timetable.insertMany(timetableData);
    console.log(`Seeded ${seededTimetables.length} timetable template entries successfully.`);

    await mongoose.disconnect();
    console.log('Seeding finished successfully. Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
