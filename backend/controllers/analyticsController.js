const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const Division = require('../models/Division');
const Semester = require('../models/Semester');

exports.getAnalytics = async (req, res, next) => {
  try {
    const rawSemester = req.query.semester;
    let semesterFilter = null;
    let semesterObjectIds = [];
    let semesterIdStrings = [];

    if (rawSemester !== undefined && rawSemester !== '' && rawSemester !== 'all') {
      if (mongoose.Types.ObjectId.isValid(rawSemester)) {
        const semDoc = await Semester.findById(rawSemester).lean();
        if (!semDoc) {
          return res.status(400).json({
            success: false,
            error: 'Invalid semester identifier. Selected semester not found.',
          });
        }
        semesterFilter = semDoc.semester_number;
        semesterObjectIds = [semDoc._id];
        semesterIdStrings = [semDoc._id.toString()];
      } else {
        const parsedNum = Number(rawSemester);
        if (!Number.isInteger(parsedNum) || parsedNum < 1 || parsedNum > 8) {
          return res.status(400).json({
            success: false,
            error: 'Invalid semester identifier. Please select a valid semester (1-8).',
          });
        }
        semesterFilter = parsedNum;
        const semDocs = await Semester.find({ semester_number: parsedNum }).select('_id').lean();
        semesterObjectIds = semDocs.map((s) => s._id);
        semesterIdStrings = semesterObjectIds.map((id) => id.toString());
      }
    }

    // Build scopes based on exact Mongoose model definitions:
    // 1. Subject.semester is ObjectId ref 'Semester'
    // 2. Division.semester is ObjectId ref 'Semester'
    // 3. Timetable.semester is String (can store ObjectId string or semester number string)
    const subjectScope = semesterObjectIds.length > 0
      ? { semester: { $in: semesterObjectIds } }
      : semesterFilter ? { _id: null } : {};

    const divisionScope = semesterObjectIds.length > 0
      ? { semester: { $in: semesterObjectIds } }
      : semesterFilter ? { _id: null } : {};

    const timetableScope = semesterObjectIds.length > 0
      ? {
          $or: [
            { semester: { $in: semesterIdStrings } },
            { semester: { $in: semesterObjectIds } },
            { semester: String(semesterFilter) },
          ],
        }
      : semesterFilter ? { _id: null } : {};

    const [entries, classrooms, allTeachers, allSubjects, divisions] = await Promise.all([
      Timetable.find(timetableScope).select('teacher subject classroom laboratory day timeSlot isLab status').lean(),
      Classroom.find().select('_id capacity type').lean(),
      Teacher.find().select('_id name max_hours_per_week').lean(),
      Subject.find(subjectScope).select('_id subject_name weekly_periods').lean(),
      Division.find(divisionScope).select('_id division_name').lean(),
    ]);

    const teacherIds = new Set(entries.map((e) => String(e.teacher)).filter(Boolean));
    const subjectIds = new Set(entries.map((e) => String(e.subject)).filter(Boolean));
    const classroomIds = new Set(
      entries.map((entry) => String(entry.classroom || entry.laboratory)).filter(Boolean)
    );

    const teachers = semesterFilter
      ? allTeachers.filter((teacher) => teacherIds.has(String(teacher._id)))
      : allTeachers;
    const subjects = semesterFilter ? allSubjects : allSubjects;

    const teacherById = new Map(teachers.map((teacher) => [String(teacher._id), teacher]));
    const workloadByTeacher = new Map();
    const teacherSlots = new Map();
    const roomSlots = new Map();
    let teacherConflicts = 0;
    let classroomConflicts = 0;
    let flaggedConflicts = 0;

    entries.forEach((entry) => {
      const duration = entry.isLab ? 2 : 1;
      const teacherId = String(entry.teacher);
      if (teacherId && teacherId !== 'null' && teacherId !== 'undefined') {
        workloadByTeacher.set(teacherId, (workloadByTeacher.get(teacherId) || 0) + duration);
        const teacherSlot = `${teacherId}:${entry.day}:${entry.timeSlot}`;
        teacherSlots.set(teacherSlot, (teacherSlots.get(teacherSlot) || 0) + 1);
      }

      const roomId = entry.classroom || entry.laboratory;
      if (roomId && String(roomId) !== 'null' && String(roomId) !== 'undefined') {
        const roomSlot = `${roomId}:${entry.day}:${entry.timeSlot}`;
        roomSlots.set(roomSlot, (roomSlots.get(roomSlot) || 0) + 1);
      }
      if (entry.status === 'conflict') flaggedConflicts += 1;
    });

    teacherSlots.forEach((count) => {
      if (count > 1) teacherConflicts += count - 1;
    });
    roomSlots.forEach((count) => {
      if (count > 1) classroomConflicts += count - 1;
    });

    const teacherWorkload = [...workloadByTeacher.entries()]
      .map(([teacherId, assignedHours]) => {
        const teacher = teacherById.get(teacherId);
        const totalHours = teacher?.max_hours_per_week || 40;
        return { name: teacher?.name || 'Unassigned teacher', assignedHours, totalHours };
      })
      .sort(
        (a, b) =>
          b.assignedHours / Math.max(1, b.totalHours) -
          a.assignedHours / Math.max(1, a.totalHours)
      );

    const totalSubjectPeriods = allSubjects.reduce(
      (sum, sub) => sum + (sub.weekly_periods || 0),
      0
    );
    const totalRequiredPeriods = totalSubjectPeriods * Math.max(1, divisions.length);
    const filledSlots = entries.length;

    const freeRooms = Math.max(0, classrooms.length - classroomIds.size);
    const timetableCompletion = totalRequiredPeriods
      ? Math.min(100, Math.round((filledSlots / totalRequiredPeriods) * 100))
      : 0;
    const conflictCount = teacherConflicts + classroomConflicts + flaggedConflicts;
    const healthScore =
      entries.length === 0
        ? 0
        : Math.max(
            0,
            100 - conflictCount * 12 - Math.max(0, 60 - timetableCompletion) / 3
          );

    res.json({
      success: true,
      semester: semesterFilter,
      hasData: entries.length > 0,
      teachersCount: teachers.length,
      subjectsCount: subjects.length,
      classroomsCount: classrooms.length,
      timetableCompletion,
      conflictCount,
      scheduleHealthScore: Math.round(healthScore),
      teacherWorkload,
      health: {
        teacherConflicts,
        classroomConflicts,
        freeRooms,
        overallScore: Math.round(healthScore),
      },
    });
  } catch (error) {
    console.error('Analytics computation error:', error);
    next(error);
  }
};
