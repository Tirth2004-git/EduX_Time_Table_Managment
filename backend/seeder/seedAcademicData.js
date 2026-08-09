const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const TeacherAssignment = require('../models/TeacherAssignment');
const Timetable = require('../models/Timetable');
const ScheduledSession = require('../models/ScheduledSession');
const Classroom = require('../models/Classroom');
const User = require('../models/User');

const seedAcademicData = async (adminUserId) => {
  try {
    // 1. Clear existing academic data (excluding Admins)
    await Teacher.deleteMany({});
    await Subject.deleteMany({});
    await TeacherAssignment.deleteMany({});
    await Timetable.deleteMany({});
    await ScheduledSession.deleteMany({});
    await Classroom.deleteMany({});
    await User.deleteMany({ role: 'teacher' });

    console.log('Cleared existing academic data.');

    // 2. Create Classrooms
    const rooms = await Classroom.insertMany([
      { roomNumber: 'R101', capacity: 60, type: 'lecture', program: 'Information Technology', className: 'TY', division: 'A' },
      { roomNumber: 'R102', capacity: 60, type: 'lecture', program: 'Information Technology', className: 'TY', division: 'B' },
      { roomNumber: 'L201', capacity: 30, type: 'lab', program: 'Computer Science', className: 'SY', division: 'A' },
    ]);
    const r101 = rooms[0]._id;
    const r102 = rooms[1]._id;

    // 3. Create Teachers
    const teachersData = [
      {
        teacherID: 'T001',
        faculty_name: 'Dr. Vikram Sen',
        department: 'Information Technology',
        designation: 'Professor',
        teaching_hours: 24,
        teacher_number: '9876543210',
        classroom: 'R101',
        email: 'vikram.sen@edux.com'
      },
      {
        teacherID: 'T002',
        faculty_name: 'Dr. Rahul Sharma',
        department: 'Information Technology',
        designation: 'Assistant Professor',
        teaching_hours: 24,
        teacher_number: '9876543211',
        classroom: 'R102',
        email: 'rahul.sharma@edux.com'
      },
      {
        teacherID: 'T003',
        faculty_name: 'Dr. Amit Patel',
        department: 'Computer Science',
        designation: 'Associate Professor',
        teaching_hours: 24,
        teacher_number: '9876543212',
        classroom: 'L201',
        email: 'amit.patel@edux.com'
      }
    ];

    const createdTeachers = [];
    for (const tData of teachersData) {
      const teacher = await Teacher.create({
        teacherID: tData.teacherID,
        faculty_name: tData.faculty_name,
        department: tData.department,
        designation: tData.designation,
        teaching_hours: tData.teaching_hours,
        teacher_number: tData.teacher_number,
        classroom: tData.classroom,
        workload: [],
        preferences: { maxWorkload: 40, preferredSlots: [], unavailableSlots: [] }
      });
      createdTeachers.push(teacher);

      // Create linked user account
      await User.create({
        username: tData.teacherID,
        email: tData.email,
        password: 'password123', // Will be hashed by pre-save hook
        role: 'teacher',
        teacherId: teacher._id,
        name: tData.faculty_name,
        isVerified: true
      });
    }

    const [tVikram, tRahul, tAmit] = createdTeachers;

    // 4. Create Subjects
    const subDS = await Subject.create({
      subject_name: 'Data Structures',
      subject_code: 'CS601',
      program: 'Information Technology',
      department: 'Information Technology',
      semester: 6,
      requiredPeriods: 4,
      type: 'theory',
      teacherIds: [tRahul._id]
    });

    const subDBMS = await Subject.create({
      subject_name: 'Database Management System',
      subject_code: 'CS602',
      program: 'Information Technology',
      department: 'Information Technology',
      semester: 6,
      requiredPeriods: 4,
      type: 'theory',
      teacherIds: [tRahul._id]
    });

    const subOS = await Subject.create({
      subject_name: 'Operating System',
      subject_code: 'CS603',
      program: 'Information Technology',
      department: 'Information Technology',
      semester: 5,
      requiredPeriods: 4,
      type: 'theory',
      teacherIds: [tAmit._id]
    });

    const subIoT = await Subject.create({
      subject_name: 'Internet of Things',
      subject_code: 'IT604',
      program: 'Information Technology',
      department: 'Information Technology',
      semester: 7,
      requiredPeriods: 4,
      type: 'theory',
      teacherIds: [tVikram._id]
    });

    const subCN = await Subject.create({
      subject_name: 'Computer Networks',
      subject_code: 'CS605',
      program: 'Information Technology',
      department: 'Information Technology',
      semester: 7,
      requiredPeriods: 4,
      type: 'theory',
      teacherIds: [tVikram._id]
    });

    // 5. Create Teacher Assignments
    await TeacherAssignment.insertMany([
      { teacherId: tRahul._id, subjectId: subDS._id, program: 'Information Technology', semester: 6, division: 'A' },
      { teacherId: tRahul._id, subjectId: subDBMS._id, program: 'Information Technology', semester: 6, division: 'B' },
      { teacherId: tAmit._id, subjectId: subOS._id, program: 'Information Technology', semester: 5, division: 'A' },
      { teacherId: tVikram._id, subjectId: subIoT._id, program: 'Information Technology', semester: 7, division: 'A' },
      { teacherId: tVikram._id, subjectId: subCN._id, program: 'Information Technology', semester: 7, division: 'B' },
    ]);

    // 6. Generate Timetable Templates
    const timeSlots = [
      '09:30-10:25',
      '10:25-11:20',
      '12:20-13:15',
      '13:15-14:10',
      '14:30-15:25',
      '15:25-16:20'
    ];

    const timetableEntries = [
      // Rahul - Monday
      { program: 'Information Technology', className: 'TY', semester: 6, division: 'A', day: 'Monday', timeSlot: '09:30-10:25', subjectId: subDS._id, teacherId: tRahul._id, classroomId: r101, createdBy: adminUserId },
      { program: 'Information Technology', className: 'TY', semester: 6, division: 'B', day: 'Monday', timeSlot: '12:20-13:15', subjectId: subDBMS._id, teacherId: tRahul._id, classroomId: r102, createdBy: adminUserId },
      // Rahul - Tuesday
      { program: 'Information Technology', className: 'TY', semester: 6, division: 'B', day: 'Tuesday', timeSlot: '10:25-11:20', subjectId: subDBMS._id, teacherId: tRahul._id, classroomId: r102, createdBy: adminUserId },
      { program: 'Information Technology', className: 'TY', semester: 6, division: 'A', day: 'Tuesday', timeSlot: '14:30-15:25', subjectId: subDS._id, teacherId: tRahul._id, classroomId: r101, createdBy: adminUserId },
      // Rahul - Wednesday
      { program: 'Information Technology', className: 'TY', semester: 6, division: 'A', day: 'Wednesday', timeSlot: '09:30-10:25', subjectId: subDS._id, teacherId: tRahul._id, classroomId: r101, createdBy: adminUserId },
      
      // Vikram - Monday
      { program: 'Information Technology', className: 'TY', semester: 7, division: 'A', day: 'Monday', timeSlot: '10:25-11:20', subjectId: subIoT._id, teacherId: tVikram._id, classroomId: r101, createdBy: adminUserId },
      { program: 'Information Technology', className: 'TY', semester: 7, division: 'B', day: 'Monday', timeSlot: '13:15-14:10', subjectId: subCN._id, teacherId: tVikram._id, classroomId: r102, createdBy: adminUserId },
      // Vikram - Tuesday
      { program: 'Information Technology', className: 'TY', semester: 7, division: 'B', day: 'Tuesday', timeSlot: '09:30-10:25', subjectId: subCN._id, teacherId: tVikram._id, classroomId: r102, createdBy: adminUserId },
      
      // Amit - Wednesday
      { program: 'Information Technology', className: 'SY', semester: 5, division: 'A', day: 'Wednesday', timeSlot: '10:25-11:20', subjectId: subOS._id, teacherId: tAmit._id, classroomId: r101, createdBy: adminUserId },
      { program: 'Information Technology', className: 'SY', semester: 5, division: 'A', day: 'Thursday', timeSlot: '09:30-10:25', subjectId: subOS._id, teacherId: tAmit._id, classroomId: r101, createdBy: adminUserId },
    ];

    const templates = await Timetable.insertMany(timetableEntries);

    // 7. Generate Scheduled Sessions for Current Week
    const sessions = [];
    const today = new Date();
    // Start of current week (Monday)
    const dayOfWeek = today.getDay() || 7; 
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0,0,0,0);

    const daysMap = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5 };

    for (const tmpl of templates) {
      const sessionDate = new Date(startOfWeek);
      sessionDate.setDate(startOfWeek.getDate() + daysMap[tmpl.day]);

      sessions.push({
        templateSlotId: tmpl._id,
        date: sessionDate,
        timeSlot: tmpl.timeSlot,
        subjectId: tmpl.subjectId,
        originalTeacherId: tmpl.teacherId,
        effectiveTeacherId: tmpl.teacherId,
        classroomId: tmpl.classroomId,
        program: tmpl.program,
        className: tmpl.className,
        semester: tmpl.semester,
        division: tmpl.division,
        status: 'scheduled',
        isLab: tmpl.isLab || false,
        duration: 1
      });
    }

    await ScheduledSession.insertMany(sessions);

    console.log('Seed academic data completed successfully.');
    return { success: true, message: 'Academic demo data generated successfully' };

  } catch (error) {
    console.error('Error seeding academic data:', error);
    throw error;
  }
};

module.exports = seedAcademicData;
