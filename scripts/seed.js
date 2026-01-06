const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable-scheduler';

const teacherData = [
  {
    teacherID: "T001",
    faculty_name: "Dr. R. Sharma",
    subject_name: "Data Structures",
    teaching_hours: 6,
    teacher_number: "8799246001",
    classroom: "C-203",
    department: "Computer Science",
    assignedHours: 0,
    remainingHours: 6
  },
  {
    teacherID: "T002",
    faculty_name: "Prof. Neha Patel",
    subject_name: "Database Management Systems",
    teaching_hours: 5,
    teacher_number: "8799246002",
    classroom: "B-108",
    department: "Information Technology",
    assignedHours: 0,
    remainingHours: 5
  },
  {
    teacherID: "T003",
    faculty_name: "Mr. Ankit Verma",
    subject_name: "Operating Systems",
    teaching_hours: 4,
    teacher_number: "8799246003",
    classroom: "D-305",
    department: "Computer Engineering",
    assignedHours: 0,
    remainingHours: 4
  },
  {
    teacherID: "T004",
    faculty_name: "Ms. Priya Nair",
    subject_name: "Computer Networks",
    teaching_hours: 6,
    teacher_number: "8799246004",
    classroom: "C-110",
    department: "Information Technology",
    assignedHours: 0,
    remainingHours: 6
  },
  {
    teacherID: "T005",
    faculty_name: "Dr. Kunal Mehta",
    subject_name: "Artificial Intelligence",
    teaching_hours: 5,
    teacher_number: "8799246005",
    classroom: "A-204",
    department: "Computer Science",
    assignedHours: 0,
    remainingHours: 5
  },
  {
    teacherID: "T006",
    faculty_name: "Prof. Sneha Desai",
    subject_name: "Software Engineering",
    teaching_hours: 4,
    teacher_number: "8799246006",
    classroom: "B-210",
    department: "Information Technology",
    assignedHours: 0,
    remainingHours: 4
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import Teacher model
    const TeacherSchema = new mongoose.Schema({
      teacherID: { type: String, required: true, unique: true },
      faculty_name: { type: String, required: true },
      subject_name: { type: String, required: true },
      department: { type: String, required: true },
      teaching_hours: { type: Number, required: true },
      teacher_number: { type: String, required: true },
      classroom: { type: String, required: true },
      assignedHours: { type: Number, default: 0 },
      remainingHours: { type: Number, default: 0 },
    }, { timestamps: true });

    // Import Classroom model
    const ClassroomSchema = new mongoose.Schema({
      program: {
        type: String,
        required: true,
        enum: [
          'Information Technology',
          'Cyber Security',
          'Computer Science & Technology',
          'Computer Engineering',
          'Artificial Intelligence & Data Science',
        ],
      },
      className: {
        type: String,
        required: true,
        enum: ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'],
      },
      division: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      },
      year: { type: String },
      roomNumber: { type: String },
    }, { timestamps: true });

    ClassroomSchema.index({ program: 1, className: 1, division: 1 }, { unique: true });

    const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
    const Classroom = mongoose.models.Classroom || mongoose.model('Classroom', ClassroomSchema);

    // Clear existing data
    await Teacher.deleteMany({});
    console.log('Cleared existing teachers');

    await Classroom.deleteMany({});
    console.log('Cleared existing classrooms');

    // Insert teachers
    await Teacher.insertMany(teacherData);
    console.log(`Seeded ${teacherData.length} teachers successfully`);

    // Generate classroom data for all programs, classes, and divisions
    const programs = [
      'Information Technology',
      'Cyber Security',
      'Computer Science & Technology',
      'Computer Engineering',
      'Artificial Intelligence & Data Science',
    ];
    const classLevels = ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'];
    const divisions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const classroomData = [];
    let roomCounter = 101;

    for (const program of programs) {
      for (const className of classLevels) {
        for (const division of divisions) {
          classroomData.push({
            program,
            className,
            division,
            year: currentYear,
            roomNumber: `${roomCounter++}`,
          });
        }
      }
    }

    await Classroom.insertMany(classroomData);
    console.log(`Seeded ${classroomData.length} classrooms successfully`);
    console.log(`Generated classrooms for ${programs.length} programs, ${classLevels.length} class levels, ${divisions.length} divisions each`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

