require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoUri } = require('./config/env');

const Department = require('./models/Department');
const Semester = require('./models/Semester');
const TeacherSubjectMapping = require('./models/TeacherSubjectMapping');
const Subject = require('./models/Subject');
const Teacher = require('./models/Teacher');
const Timetable = require('./models/Timetable');

const sem5Subjects = [
  { name: 'Database Management System', code: 'IT302', type: 'theory', requiredPeriods: 4 },
  { name: 'Operating System', code: 'IT303', type: 'theory', requiredPeriods: 4 },
  { name: 'Computer Networks', code: 'IT304', type: 'theory', requiredPeriods: 4 },
  { name: 'Web Development', code: 'IT309', type: 'theory', requiredPeriods: 4 },
  { name: 'Software Engineering', code: 'IT306', type: 'theory', requiredPeriods: 4 },
];

const sem6Subjects = [
  { name: 'Data Structures', code: 'IT301', type: 'theory', requiredPeriods: 4 },
  { name: 'Artificial Intelligence', code: 'IT305', type: 'theory', requiredPeriods: 4 },
  { name: 'Machine Learning', code: 'IT307', type: 'theory', requiredPeriods: 4 },
  { name: 'Cloud Computing', code: 'IT308', type: 'theory', requiredPeriods: 4 },
  { name: 'Internet of Things', code: 'IT604', type: 'theory', requiredPeriods: 4 },
  { name: 'Information Security', code: 'IT601', type: 'theory', requiredPeriods: 4 },
];

const sem7Subjects = [
  { name: 'Deep Learning', code: 'IT701', type: 'theory', requiredPeriods: 4 },
  { name: 'Blockchain', code: 'IT702', type: 'theory', requiredPeriods: 4 },
  { name: 'Big Data Analytics', code: 'IT310', type: 'theory', requiredPeriods: 4 },
];

async function migrate() {
  try {
    await mongoose.connect(getMongoUri());
    console.log('Connected to MongoDB');

    // 1. Create IT Department
    let itDept = await Department.findOne({ code: 'IT' });
    if (!itDept) {
      itDept = await Department.create({ name: 'Information Technology', code: 'IT' });
      console.log('Created IT Department');
    }

    // 2. Create Semesters 1 to 7 for IT
    const semesters = {};
    for (let i = 1; i <= 7; i++) {
      let sem = await Semester.findOne({ number: i, departmentId: itDept._id });
      if (!sem) {
        sem = await Semester.create({ number: i, departmentId: itDept._id });
        console.log(`Created Semester ${i}`);
      }
      semesters[i] = sem;
    }

    // 3. Migrate Teachers
    const teachers = await Teacher.find({});
    for (const teacher of teachers) {
      if (!teacher.departmentId) {
        // Assume all current teachers belong to IT for this migration, 
        // since previous text was variations of "IT" or "Information Technology"
        teacher.departmentId = itDept._id;
        await teacher.save({ validateBeforeSave: false }); // Skip strict validation temporarily if needed
      }
    }
    console.log(`Migrated ${teachers.length} teachers to IT department`);

    // 4. Resolve Duplicated Subjects (e.g. Data Structures IT301)
    // Find all Data Structures
    const dsSubjects = await Subject.find({ subject_code: 'IT301' });
    if (dsSubjects.length > 1) {
      const primary = dsSubjects[0];
      for (let i = 1; i < dsSubjects.length; i++) {
        const dup = dsSubjects[i];
        // Update any timetable entries pointing to duplicate
        await Timetable.updateMany({ subjectId: dup._id }, { subjectId: primary._id });
        // Remove duplicate
        await Subject.findByIdAndDelete(dup._id);
        console.log(`Merged duplicate subject IT301 (${dup._id}) into ${primary._id}`);
      }
    }

    // 5. Migrate Remaining Subjects
    const subjects = await Subject.find({});
    for (const subject of subjects) {
      let needsSave = false;
      
      if (!subject.departmentId) {
        subject.departmentId = itDept._id;
        needsSave = true;
      }
      
      // Determine semester from existing 'semester' field (if string or number)
      // If it exists in subject doc directly (using mongoose strict: false query to get old field)
      const rawSubject = subject.toObject();
      if (rawSubject.semester && !subject.semesterId) {
        const semNum = Number(rawSubject.semester);
        if (semesters[semNum]) {
          subject.semesterId = semesters[semNum]._id;
          needsSave = true;
        }
      }

      if (needsSave) {
        // Remove old string fields to clean up, though they might be in schema still or not.
        // subject.semester and subject.department are no longer in schema.
        await subject.save({ validateBeforeSave: false });
      }
    }
    console.log(`Migrated subjects to use references`);

    // 6. Seed Missing Subjects
    const seedSubjects = async (subList, semNumber) => {
      const sem = semesters[semNumber];
      for (const s of subList) {
        const existing = await Subject.findOne({ subject_code: s.code, semesterId: sem._id, departmentId: itDept._id });
        if (!existing) {
          await Subject.create({
            subject_name: s.name,
            subject_code: s.code,
            type: s.type,
            departmentId: itDept._id,
            semesterId: sem._id,
            requiredPeriods: s.requiredPeriods,
          });
          console.log(`Created subject ${s.code} in Semester ${semNumber}`);
        }
      }
    };
    await seedSubjects(sem5Subjects, 5);
    await seedSubjects(sem6Subjects, 6);
    await seedSubjects(sem7Subjects, 7);

    // 7. Seed missing TeacherSubjectMapping based on existing teacherId in Subject
    const updatedSubjects = await Subject.find({});
    for (const sub of updatedSubjects) {
      if (sub.teacherId && sub.semesterId && sub.departmentId) {
        const existingMap = await TeacherSubjectMapping.findOne({ teacher_id: sub.teacherId, subject_id: sub._id });
        if (!existingMap) {
          await TeacherSubjectMapping.create({
            teacher_id: sub.teacherId,
            subject_id: sub._id,
            semester: sub.semesterId,
            department: sub.departmentId,
            allowed_divisions: [],
            is_primary_teacher: true,
            expertise_level: 'Intermediate',
            experience_with_subject: 0,
            replacement_priority: []
          });
        }
      }
    }
    console.log('Seeded TeacherSubjectMappings based on existing data');
    
    console.log('Migration Complete');
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
