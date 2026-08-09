const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const TeacherAssignment = require('../models/TeacherAssignment');
const xlsx = require('xlsx');

// @desc    Bulk import timetable configuration from Excel file (.xlsx)
// @route   POST /api/import/excel
// @access  Private (Admin)
exports.importExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const buffer = req.file.buffer;
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel file is empty' });
    }

    const requiredColumns = [
      'TeacherName', 'Department', 'TeachingHours', 
      'SubjectName', 'SubjectCode', 'Program', 
      'ClassName', 'Semester', 'Division', 'RequiredPeriods'
    ];

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      });
    }

    let teachersCreated = 0;
    let subjectsCreated = 0;
    let classroomsCreated = 0;
    let totalRows = 0;
    const errors = [];

    const teacherMap = new Map();
    const subjectMap = new Map();

    const programMap = {
      'IT': 'Information Technology',
      'CE': 'Computer Engineering',
      'ME': 'Mechanical Engineering',
      'EC': 'Electronics and Communication',
      'CS': 'Computer Science & Technology',
      'AIDS': 'Artificial Intelligence & Data Science',
      'CY': 'Cyber Security'
    };

    const normalizedProgramsProcessed = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (!row.TeacherName || !row.SubjectCode) continue;
      
      const rawProgram = row.Program ? row.Program.toString().trim() : '';
      if (!rawProgram) {
        errors.push(`Row ${i + 2}: Program field is empty or missing`);
        continue;
      }

      const normalizedProgram =
        programMap[rawProgram] ||
        programMap[rawProgram.toUpperCase()] ||
        rawProgram;

      row.Program = normalizedProgram;
      
      if (!normalizedProgramsProcessed.find(p => p.original === rawProgram)) {
        normalizedProgramsProcessed.push({ original: rawProgram, normalized: normalizedProgram });
      }

      totalRows++;

      try {
        // 1. Handle Teacher
        let teacherId;
        if (teacherMap.has(row.TeacherName)) {
          teacherId = teacherMap.get(row.TeacherName);
        } else {
          let teacher = await Teacher.findOne({ faculty_name: row.TeacherName });
          let allowedDivisions = [];
          if (row.AllowedDivisions) {
            allowedDivisions = String(row.AllowedDivisions).split(',').map(d => d.trim()).filter(Boolean);
          }

          if (teacher) {
            teacher.teaching_hours = Number(row.TeachingHours);
            teacher.department = row.Department;
            if (allowedDivisions.length > 0) {
              teacher.allowedDivisions = allowedDivisions;
            }
            await teacher.save();
            teacherId = teacher._id;
          } else {
            teacher = await Teacher.create({
              teacherID: `T-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
              faculty_name: row.TeacherName.trim(),
              department: row.Department.trim(),
              teaching_hours: Number(row.TeachingHours),
              subject_name: row.SubjectName.trim(),
              teacher_number: "N/A",
              classroom: "N/A",
              allowedDivisions
            });
            teachersCreated++;
            teacherId = teacher._id;
          }
          teacherMap.set(row.TeacherName, teacherId);
        }

        // 2. Handle Subject
        const subjectKey = `${row.SubjectCode}`;
        if (!subjectMap.has(subjectKey)) {
          let subject = await Subject.findOne({ subject_code: row.SubjectCode });
          if (subject) {
            subject.teacherId = teacherId;
            subject.requiredPeriods = Number(row.RequiredPeriods);
            subject.subject_name = row.SubjectName.trim();
            await subject.save();
          } else {
            subject = await Subject.create({
              subject_name: row.SubjectName.trim(),
              subject_code: row.SubjectCode.trim(),
              teacherId: teacherId,
              requiredPeriods: Number(row.RequiredPeriods)
            });
            subjectsCreated++;
          }
          subjectMap.set(subjectKey, subject._id);
        }

        // 3. Handle Classroom/Division Mapping
        const semesterNum = Number(row.Semester);
        
        let classroom = await Classroom.findOne({
          program: row.Program,
          className: row.ClassName,
          semester: semesterNum,
          division: row.Division
        });

        if (!classroom) {
          await Classroom.create({
             program: row.Program.trim(),
             className: row.ClassName.trim(),
             semester: semesterNum,
             division: row.Division.trim()
          });
          classroomsCreated++;
        }

        // 4. Handle Teacher Assignment
        if (row.Division) {
          const divisions = String(row.Division).split(',');
          for (let div of divisions) {
            const divTrimmed = div.trim();
            if (!divTrimmed) continue;
            
            const existingAssignment = await TeacherAssignment.findOne({
              teacherId,
              program: row.Program.trim(),
              semester: semesterNum,
              division: divTrimmed
            });

            if (!existingAssignment) {
              await TeacherAssignment.create({
                teacherId,
                program: row.Program.trim(),
                semester: semesterNum,
                division: divTrimmed
              });
            }
          }
        }

      } catch (err) {
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      totalRows,
      teachersCreated,
      subjectsCreated,
      classroomsCreated,
      errors,
      normalizedPrograms: normalizedProgramsProcessed
    });

  } catch (error) {
    next(error);
  }
};
