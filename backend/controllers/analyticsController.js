const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const Division = require('../models/Division');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const FacultySubjectAssignment = require('../models/FacultySubjectAssignment');

const WEEKLY_ROOM_CAPACITY = 36;

exports.getAnalytics = async (req, res, next) => {
  try {
    const requestedSemester = Number(req.query.semester);
    const semester = Number.isInteger(requestedSemester) && requestedSemester >= 1 && requestedSemester <= 8
      ? requestedSemester
      : null;
    const scope = semester ? { semester: String(semester) } : {};

    const [entries, classrooms, allTeachers, allSubjects, divisions] = await Promise.all([
      Timetable.find(scope).select('teacher subject classroom day timeSlot isLab status').lean(),
      Classroom.find().select('_id capacity type').lean(),
      Teacher.find().select('_id name max_hours_per_week').lean(),
      Subject.find(scope).select('_id subject_name weekly_periods').lean(),
      Division.find(scope).select('_id division_name').lean()
    ]);

    const teacherIds = new Set(entries.map(e => String(e.teacher)).filter(Boolean));
    const subjectIds = new Set(entries.map(e => String(e.subject)).filter(Boolean));
    const classroomIds = new Set(entries.map((entry) => String((entry.classroom || entry.laboratory))).filter(Boolean));
    const teachers = semester ? allTeachers.filter((teacher) => teacherIds.has(String(teacher._id))) : allTeachers;
    const subjects = semester ? allSubjects.filter((subject) => subjectIds.has(String(subject._id))) : allSubjects;

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
      if (teacherId && teacherId !== 'null') {
        workloadByTeacher.set(teacherId, (workloadByTeacher.get(teacherId) || 0) + duration);
        const teacherSlot = `${teacherId}:${entry.day}:${entry.timeSlot}`;
        teacherSlots.set(teacherSlot, (teacherSlots.get(teacherSlot) || 0) + 1);
      }

      if ((entry.classroom || entry.laboratory)) {
        const roomSlot = `${(entry.classroom || entry.laboratory)}:${entry.day}:${entry.timeSlot}`;
        roomSlots.set(roomSlot, (roomSlots.get(roomSlot) || 0) + 1);
      }
      if (entry.status === 'conflict') flaggedConflicts += 1;
    });

    teacherSlots.forEach((count) => { if (count > 1) teacherConflicts += count - 1; });
    roomSlots.forEach((count) => { if (count > 1) classroomConflicts += count - 1; });

    const teacherWorkload = [...workloadByTeacher.entries()]
      .map(([teacherId, assignedHours]) => {
        const teacher = teacherById.get(teacherId);
        const totalHours = teacher?.max_hours_per_week || 40;
        return { name: teacher?.name || 'Unassigned teacher', assignedHours, totalHours };
      })
      .sort((a, b) => (b.assignedHours / Math.max(1, b.totalHours)) - (a.assignedHours / Math.max(1, a.totalHours)));

    const totalSubjectPeriods = allSubjects.reduce((sum, sub) => sum + (sub.weekly_periods || 0), 0);
    const totalRequiredPeriods = totalSubjectPeriods * Math.max(1, divisions.length);
    const filledSlots = entries.length;
    
    const freeRooms = Math.max(0, classrooms.length - classroomIds.size);
    const timetableCompletion = totalRequiredPeriods ? Math.min(100, Math.round((filledSlots / totalRequiredPeriods) * 100)) : 0;
    const conflictCount = teacherConflicts + classroomConflicts + flaggedConflicts;
    const healthScore = entries.length === 0
      ? 0
      : Math.max(0, 100 - conflictCount * 12 - Math.max(0, 60 - timetableCompletion) / 3);

    res.json({
      semester,
      hasData: entries.length > 0,
      teachersCount: teachers.length,
      subjectsCount: subjects.length,
      classroomsCount: classrooms.length,
      timetableCompletion,
      conflictCount,
      scheduleHealthScore: Math.round(healthScore),
      teacherWorkload,
      health: { teacherConflicts, classroomConflicts, freeRooms, overallScore: Math.round(healthScore) },
    });
  } catch (error) {
    next(error);
  }
};
