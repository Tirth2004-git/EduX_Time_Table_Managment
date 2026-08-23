const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
const WeeklyTimetable = require('../models/WeeklyTimetable');
const WeeklyConfig = require('../models/WeeklyConfig');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const TeacherAssignment = require('../models/TeacherAssignment');
const SharedLink = require('../models/SharedLink');
const TeacherLeave = require('../models/TeacherLeave');
const crypto = require('crypto');
const { computeTeacherWorkload, computeSubjectPeriods } = require('../services/workloadCompute');
const { validateTimetableEntry, validateWeeklyTimetable, validateTimetable } = require('../services/validationEngine');
const { autoGenerateTimetable } = require('../services/autoGenerator');
const { smartAutoGenerate } = require('../services/smartGenerator');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['11:20-12:20', '14:10-14:30'];
const TIME_SLOTS = [
  '09:30-10:25',
  '10:25-11:20',
  '11:20-12:20',
  '12:20-13:15',
  '13:15-14:10',
  '14:10-14:30',
  '14:30-15:25',
  '15:25-16:20',
];

const resolveMappedRoom = async (departmentId, semesterId, divisionId) => {
  if (!departmentId || !semesterId || !divisionId) return null;

  console.log('resolveMappedRoom called with:', { departmentId, semesterId, divisionId });

  // 1) Try modern schema (departmentId, semesterId, divisionId)
  let mappedRoom = await Classroom.findOne({
    departmentId: departmentId,
    semesterId: semesterId,
    divisionId: divisionId,
    available: true
  }).lean();

  if (mappedRoom) {
    console.log('resolveMappedRoom found (modern fields):', { _id: mappedRoom._id, room_name: mappedRoom.room_name || mappedRoom.roomNumber || mappedRoom.room_id });
    return mappedRoom._id;
  }

  // 2) Fallback: try legacy/seeded schema where classrooms were stored by program/semester/division strings
  try {
    const Division = require('../models/Division');
    const divObj = await Division.findById(divisionId).populate('department').populate('semester').lean();
    if (!divObj) {
      console.log('resolveMappedRoom: division not found for fallback lookup', divisionId);
      return null;
    }

    const deptName = divObj.department?.department_name || divObj.department?.short_name;
    const semNumber = divObj.semester?.semester_number || semesterId;
    const divName = divObj.division_name || divObj.division_id || divisionId;

    console.log('resolveMappedRoom fallback using:', { deptName, semNumber, divName });

    mappedRoom = await Classroom.findOne({
      $and: [
        { available: true },
        { $or: [ { departmentId: departmentId }, { program: deptName } ] },
        { $or: [ { semesterId: semesterId }, { semester: semNumber } ] },
        { $or: [ { divisionId: divisionId }, { division: divName }, { division_id: divName } ] }
      ]
    }).lean();

    console.log('resolveMappedRoom result (fallback):', mappedRoom ? { _id: mappedRoom._id, room_name: mappedRoom.room_name || mappedRoom.roomNumber || mappedRoom.room_id } : null);
    return mappedRoom ? mappedRoom._id : null;
  } catch (err) {
    console.error('resolveMappedRoom fallback error:', err);
    return null;
  }
};

// 1. List Timetable Entries
exports.listTimetable = async (req, res, next) => {
  try {
    const { departmentId, semesterId, division, day, classroomId } = req.query;

    const query = {};
    if (classroomId) {
      query.classroom = classroomId;
    } else {
      if (departmentId) query.department = departmentId;
      if (semesterId) query.semester = semesterId;
      if (division) query.division = division;
    }
    if (day) query.day = day;

    let timetable = await Timetable.find(query)
      .populate('subject', 'subject_name subject_code requiredPeriods allottedPeriods remainingPeriods')
      .populate('teacher', 'teacher_id name department teaching_hours assignedHours remainingHours')
      .populate('classroom', 'room_name capacity type')
      .sort({ department: 1, semester: 1, division: 1, day: 1, timeSlot: 1 })
      .lean();

    console.log("Fetched timetable", timetable.length);

    // Map new fields back to legacy fields for frontend compatibility
    timetable = timetable.map((t) => ({
      ...t,
      subjectId: t.subject,
      teacherId: t.teacher,
      classroomId: t.classroom
    }));

    res.json({ timetable });
  } catch (error) {
    next(error);
  }
};

// Reset Timetable
exports.resetTimetable = async (req, res, next) => {
  try {
    const { departmentId, semesterId, division } = req.query;
    console.log("Reset payload", req.query);
    if (!departmentId || !semesterId || !division) {
      return res.status(400).json({ error: 'Department, Semester, and Division are required to reset the timetable.' });
    }

    await Timetable.deleteMany({
      department: departmentId,
      semester: semesterId,
      division: division
    });

    res.json({ success: true, message: 'Timetable reset successfully' });
  } catch (error) {
    next(error);
  }
};

// 2. Add Timetable Entry
exports.addTimetableEntry = async (req, res, next) => {
  try {
    let { departmentId, semesterId, division, day, timeSlot, subjectId, teacherId, classroomId, isLab } = req.body;
    isLab = Boolean(isLab);
    const duration = isLab ? 2 : 1;

    const missingFields = [];
    if (!departmentId) missingFields.push('departmentId');
    if (!semesterId) missingFields.push('semesterId');
    if (!division) missingFields.push('division');
    if (!day) missingFields.push('day');
    if (!timeSlot) missingFields.push('timeSlot');
    if (!subjectId) missingFields.push('subjectId');
    if (!teacherId) missingFields.push('teacherId');

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    const existing = await Timetable.findOne({
      department: departmentId,
      semester: semesterId,
      division,
      day,
      timeSlot
    });
    if (existing) {
      return res.status(400).json({ error: 'Lecture already exists in this slot' });
    }

    const subject = await Subject.findById(mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    let nextTimeSlot = null;
    if (isLab) {
      const weeklyLabs = await Timetable.countDocuments({
        department: departmentId, semester: semesterId, division, subject: subjectId, isLab: true
      });
      if (weeklyLabs >= 4) { // 2 labs (each 2 slots)
        return res.status(400).json({ error: 'Maximum 2 labs per week allowed for this subject' });
      }

      const currentIndex = TIME_SLOTS.indexOf(timeSlot);
      if (currentIndex === -1 || currentIndex >= TIME_SLOTS.length - 1) {
        return res.status(400).json({ error: 'Cannot schedule lab at the last slot of the day or invalid slot' });
      }
      
      nextTimeSlot = TIME_SLOTS[currentIndex + 1];
      if (BREAK_SLOTS.includes(nextTimeSlot)) {
        return res.status(400).json({ error: 'Labs must be scheduled in consecutive slots without breaks' });
      }
    }
    
    // 1. Teacher can teach subject Validation
    const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
    const isValidTeacher = await TeacherSubjectMapping.findOne({ teacher_id: teacherId, subject_id: subjectId });
    if (!isValidTeacher) {
      return res.status(400).json({ error: `Teacher is not eligible to teach this subject (Checked TeacherSubjectMapping with teacherId=${teacherId}, subjectId=${subjectId})` });
    }

    // Auto-resolve classroom mapping
    let resolvedClassroomId = classroomId;
    if (!isLab && !resolvedClassroomId) {
      resolvedClassroomId = await resolveMappedRoom(departmentId, semesterId, division);
      if (!resolvedClassroomId) {
        const Division = require('../models/Division');
        const divObj = await Division.findById(division).populate('department').populate('semester');
        const deptName = divObj?.department?.department_name || departmentId;
        const semName = divObj?.semester?.semester_number ? `Semester ${divObj.semester.semester_number}` : semesterId;
        const divName = divObj?.division_name || division;
        
        console.log('Classroom Mapping Failed:', {
          departmentId,
          semesterId,
          divisionId: division,
          academicYear: req.body.academicYear || '2026-27',
          availableRooms: 'None mapped'
        });
        
        return res.status(400).json({ error: `No classroom mapped for ${deptName} · ${semName} · Division ${divName}. Please configure it in Classroom Management before scheduling.` });
      }
    }

    // Room Conflict Validation
    if (resolvedClassroomId) {
      const classroomConflict = await Timetable.findOne({ 
        $or: [{ classroom: resolvedClassroomId }, { laboratory: resolvedClassroomId }], 
        day, 
        timeSlot 
      }).populate('department semester division');
      
      if (classroomConflict) {
        const Classroom = require('../models/Classroom');
        const room = await Classroom.findById(resolvedClassroomId);
        const roomName = room ? (room.room_name || room.room_id) : 'This Room';
        return res.status(400).json({ error: `${roomName} (mapped to this division) is already booked at this time — check for overlapping periods` });
      }

      if (isLab && nextTimeSlot) {
        const nextClassroomConflict = await Timetable.findOne({ 
          $or: [{ classroom: resolvedClassroomId }, { laboratory: resolvedClassroomId }], 
          day, 
          timeSlot: nextTimeSlot 
        });
        if (nextClassroomConflict) {
          const Classroom = require('../models/Classroom');
          const room = await Classroom.findById(resolvedClassroomId);
          const roomName = room ? (room.room_name || room.room_id) : 'This Room';
          return res.status(400).json({ error: `${roomName} (mapped to this division) is already booked for the next slot — check for overlapping periods` });
        }
      }
    }

    // Division Conflict Validation
    const divisionConflict = await Timetable.findOne({ department: departmentId, semester: semesterId, division, day, timeSlot });
    if (divisionConflict) return res.status(400).json({ error: 'Division is already occupied at this time' });

    // Teacher Conflict Validation
    const teacherConflict = await Timetable.findOne({ teacher: teacherId, day, timeSlot });
    if (teacherConflict) return res.status(400).json({ error: 'Teacher is already assigned at this time' });

    if (isLab && nextTimeSlot) {
      const divisionConflictNext = await Timetable.findOne({ department: departmentId, semester: semesterId, division, day, timeSlot: nextTimeSlot });
      if (divisionConflictNext) return res.status(400).json({ error: 'Division is already occupied during the next slot' });
      
      const teacherConflictNext = await Timetable.findOne({ teacher: teacherId, day, timeSlot: nextTimeSlot });
      if (teacherConflictNext) return res.status(400).json({ error: 'Teacher is already assigned during the next slot' });
    }

    const userId = req.user.userId;

    const timetableData = {
      department: departmentId,
      semester: semesterId,
      division,
      day,
      timeSlot,
      subject: subjectId,
      teacher: teacherId,
      status: 'valid',
      isLab,
      duration,
      createdBy: userId,
    };
    
    if (subject.type === 'Laboratory' || isLab) {
      timetableData.laboratory = resolvedClassroomId || undefined;
    } else {
      timetableData.classroom = resolvedClassroomId || undefined;
    }

    const createdDocs = [];
    const timetable = await Timetable.create(timetableData);
    createdDocs.push(timetable);

    if (isLab && nextTimeSlot) {
      const nextTimetableData = { ...timetableData, timeSlot: nextTimeSlot, duration: 1 };
      const nextTimetable = await Timetable.create(nextTimetableData);
      createdDocs.push(nextTimetable);
    }

    res.status(201).json({ message: 'Timetable entry added successfully', timetable: createdDocs });
  } catch (error) {
    next(error);
  }
};

// 3. Delete Timetable Entry
exports.deleteTimetableEntry = async (req, res, next) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Timetable ID is required' });
    }

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    // Nodemailer update notification
    try {
      const { sendTimetableUpdateEmail } = require('../services/emailService');
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findById(timetable.teacherId);
      if (teacher) {
        const divisionInfo = `${timetable.program} ${timetable.className} Sem-${timetable.semester} Div-${timetable.division} at ${timetable.day} ${timetable.timeSlot} (REMOVED)`;
        const User = require('../models/User');
        const user = await User.findOne({
          $or: [
            { name: teacher.faculty_name },
            { username: teacher.faculty_name },
            { email: { $regex: new RegExp(teacher.faculty_name.replace(/\s+/g, ''), 'i') } }
          ]
        });
        const recipientEmail = user ? user.email : `${teacher.faculty_name.toLowerCase().replace(/\s+/g, '')}@edux.edu`;
        await sendTimetableUpdateEmail(recipientEmail, teacher.faculty_name, divisionInfo);
      }
    } catch (emailErr) {
      console.error('Nodemailer update notification error:', emailErr.message);
    }

    if (!timetable.teacherId || !timetable.subjectId) {
      await Timetable.findByIdAndDelete(id);
      return res.json({
        message: 'Timetable entry deleted successfully (no rollback - missing teacher or subject)',
        rollback: null,
      });
    }

    let originalWorkload = null;
    let originalSubjectPeriods = null;
    
    try {
      originalWorkload = await computeTeacherWorkload(
        timetable.teacherId.toString(),
        timetable.program,
        timetable.className,
        timetable.semester,
        timetable.division
      );
    } catch (e) {}

    try {
      originalSubjectPeriods = await computeSubjectPeriods(
        timetable.subjectId.toString(),
        timetable.program,
        timetable.className,
        timetable.semester,
        timetable.division
      );
    } catch (e) {}

    const entriesToDelete = [];
    if (timetable.isLab) {
      const labEntries = await Timetable.find({
        program: timetable.program,
        className: timetable.className,
        semester: timetable.semester,
        division: timetable.division,
        subjectId: timetable.subjectId,
        day: timetable.day,
        isLab: true
      });
      entriesToDelete.push(...labEntries);
    } else {
      entriesToDelete.push(timetable);
    }

    try {
      await timetable.populate('subjectId');
      const undoData = {
        operation: 'CREATE',
        document: entriesToDelete.map(d => d.toObject())
      };
      const redoData = {
        operation: 'DELETE',
        timetableId: entriesToDelete.map(d => d._id)
      };
      await AuditLog.create({
        userId: req.user.userId,
        actionType: 'DELETE',
        details: `Deleted slot for subject ${timetable.subjectId?.subject_code || ''} on ${timetable.day} at ${timetable.timeSlot}`
      });
      await pushHistory(req.user.userId, 'DELETE', `Delete ${timetable.subjectId?.subject_code || ''} slot`, undoData, redoData);
    } catch (histErr) {
      console.error('History integration error:', histErr);
    }

    if (timetable.isLab) {
      await Timetable.deleteMany({
        program: timetable.program,
        className: timetable.className,
        semester: timetable.semester,
        division: timetable.division,
        subjectId: timetable.subjectId,
        day: timetable.day,
        isLab: true
      });
    } else {
      await Timetable.findByIdAndDelete(id);
    }

    let updatedWorkload = null;
    let updatedSubjectPeriods = null;
    
    try {
      updatedWorkload = await computeTeacherWorkload(
        timetable.teacherId.toString(),
        timetable.program,
        timetable.className,
        timetable.semester,
        timetable.division
      );
    } catch (e) {}

    try {
      updatedSubjectPeriods = await computeSubjectPeriods(
        timetable.subjectId.toString(),
        timetable.program,
        timetable.className,
        timetable.semester,
        timetable.division
      );
    } catch (e) {}

    res.json({
      message: 'Timetable entry deleted successfully. Workload recomputed dynamically.',
      workload: updatedWorkload ? {
        teacher: {
          assignedHours: updatedWorkload.assignedHours,
          remainingHours: updatedWorkload.remainingHours,
        },
      } : null,
      subject: updatedSubjectPeriods ? {
        allottedPeriods: updatedSubjectPeriods.allottedPeriods,
        remainingPeriods: updatedSubjectPeriods.remainingPeriods,
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Global Timetable GET (with filters)
exports.getGlobalTimetable = async (req, res, next) => {
  try {
    const { program, className, semester, division, teacherId, subjectId, day, timeSlot, classroomId } = req.query;

    const query = {};
    if (classroomId) {
      query.classroomId = classroomId;
    } else {
      if (program && program.trim() !== '') query.program = program.trim();
      if (className && className.trim() !== '') query.className = className.trim();
      if (semester && semester.trim() !== '') {
        const semesterNum = parseInt(semester.trim().replace(/^Sem-?/i, ''), 10);
        if (!isNaN(semesterNum)) query.semester = semesterNum;
      }
      if (division && division.trim() !== '') query.division = division.trim();
    }
    
    if (teacherId && teacherId.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(teacherId.trim())) {
        query.$or = [{ teacher: teacherId.trim() }, { teacherId: teacherId.trim() }];
      }
    }
    if (subjectId && subjectId.trim() !== '') {
      if (mongoose.Types.ObjectId.isValid(subjectId.trim())) {
        query.$or = [{ subject: subjectId.trim() }, { subjectId: subjectId.trim() }];
      }
    }
    if (day && day.trim() !== '') query.day = day.trim();
    if (timeSlot && timeSlot.trim() !== '') query.timeSlot = timeSlot.trim();

    const timetable = await Timetable.find(query)
      .populate('subject', 'subject_name subject_code name code requiredPeriods allottedPeriods remainingPeriods weekly_periods')
      .populate('teacher', 'teacher_id name teacherID faculty_name department teaching_hours max_hours_per_week')
      .populate('classroom', 'className roomNumber building floor capacity type room_id room_name')
      .populate('laboratory', 'lab_name room_number capacity')
      .populate('department', 'department_name short_name')
      .populate('semester', 'semester_number academic_year')
      .populate('division', 'division_name')
      .sort({ day: 1, timeSlot: 1 })
      .lean();

    const formattedTimetable = timetable.map((entry) => {
      const sub = entry.subject || {};
      const tea = entry.teacher || {};
      const cls = entry.classroom || entry.laboratory || {};
      const dept = entry.department || {};
      const sem = entry.semester || {};
      const div = entry.division || {};

      return {
        _id: entry._id,
        program: dept.short_name || dept.department_name || entry.program || 'General',
        department: dept.department_name || dept.short_name || entry.department,
        className: entry.className || (sem.semester_number ? `Sem ${sem.semester_number}` : 'N/A'),
        semester: sem.semester_number || entry.semester,
        division: div.division_name || entry.division,
        day: entry.day,
        timeSlot: entry.timeSlot,
        status: entry.status || 'published',
        is_lab: Boolean(entry.is_lab || entry.laboratory || entry.slot_type === 'LAB'),
        slot_type: entry.slot_type || (entry.is_lab ? 'LAB' : 'THEORY'),
        classroomId: cls._id || null,
        classroom: cls._id ? {
          _id: cls._id,
          roomNumber: cls.roomNumber || cls.room_number || cls.room_name || 'N/A',
          building: cls.building || 'Main Campus',
          capacity: cls.capacity,
          type: cls.type || (entry.is_lab ? 'Laboratory' : 'Classroom')
        } : null,
        subject: sub._id ? {
          _id: sub._id,
          subject_name: sub.subject_name || sub.name || 'Subject',
          subject_code: sub.subject_code || sub.code || 'SUB',
          requiredPeriods: sub.requiredPeriods || sub.weekly_periods || 4,
          weekly_periods: sub.weekly_periods || sub.requiredPeriods || 4,
        } : null,
        teacher: tea._id ? {
          _id: tea._id,
          teacherID: tea.teacher_id || tea.teacherID || 'T_01',
          faculty_name: tea.name || tea.faculty_name || 'Faculty',
          name: tea.name || tea.faculty_name || 'Faculty',
          department: tea.department,
          teaching_hours: tea.max_hours_per_week || tea.teaching_hours || 20,
        } : null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    });

    res.json({
      timetable: formattedTimetable,
      data: formattedTimetable,
      count: formattedTimetable.length,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Save Weekly Timetable
exports.saveWeeklyTimetable = async (req, res, next) => {
  try {
    const { program, className, semester, division, holidays = [] } = req.body;

    if (!program || !className || semester === undefined || !division) {
      return res.status(400).json({ error: 'Program, class name, semester, and division are required' });
    }

    const currentEntries = await Timetable.find({ program, className, semester, division });

    const validation = await validateWeeklyTimetable(program, className, semester, division, holidays);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Timetable validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    let weeklyTimetable = await WeeklyTimetable.findOne({ program, className, semester, division });
    const timetableEntryIds = currentEntries.map((entry) => entry._id);
    const userId = req.user.userId;

    if (weeklyTimetable) {
      weeklyTimetable.holidays = holidays;
      weeklyTimetable.timetableEntries = timetableEntryIds;
      await weeklyTimetable.save();
    } else {
      weeklyTimetable = await WeeklyTimetable.create({
        program, className, semester, division, holidays,
        timetableEntries: timetableEntryIds, createdBy: userId,
      });
    }

    res.json({
      message: 'Timetable saved successfully',
      weeklyTimetable: {
        _id: weeklyTimetable._id,
        program: weeklyTimetable.program,
        className: weeklyTimetable.className,
        semester: weeklyTimetable.semester,
        division: weeklyTimetable.division,
        holidays: weeklyTimetable.holidays,
        timetableEntriesCount: timetableEntryIds.length,
      },
      warnings: validation.warnings,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get Weekly Timetable Config (holidays/etc)
exports.getWeeklyTimetable = async (req, res, next) => {
  try {
    const { program, className, semester, division } = req.query;

    if (!program || !className || !semester || !division) {
      return res.status(400).json({ error: 'Program, class name, semester, and division are required' });
    }

    const weeklyTimetable = await WeeklyTimetable.findOne({
      program,
      className,
      semester: parseInt(semester, 10),
      division,
    }).populate('timetableEntries');

    if (!weeklyTimetable) {
      return res.status(404).json({ error: 'Weekly timetable not found' });
    }

    res.json({
      weeklyTimetable: {
        _id: weeklyTimetable._id,
        program: weeklyTimetable.program,
        className: weeklyTimetable.className,
        semester: weeklyTimetable.semester,
        division: weeklyTimetable.division,
        holidays: weeklyTimetable.holidays,
        timetableEntriesCount: weeklyTimetable.timetableEntries.length,
      },
    });
  } catch (error) {
    next(error);
  }
};


// 8. Set/Remove Holiday for Day
exports.setHoliday = async (req, res, next) => {
  try {
    const { program, className, semester, division, day, action } = req.body;

    if (!program || !className || !semester || !division || !day || !action) {
      return res.status(400).json({ error: 'All fields are required (program, className, semester, division, day, action)' });
    }

    if (action !== 'set' && action !== 'remove') {
      return res.status(400).json({ error: 'Action must be either "set" or "remove"' });
    }

    if (action === 'set') {
      const existingEntries = await Timetable.find({
        program, className, semester: parseInt(semester, 10), division, day,
      }).populate('subjectId teacherId');

      const deleteResult = await Timetable.deleteMany({
        program, className, semester: parseInt(semester, 10), division, day,
      });

      await WeeklyConfig.findOneAndUpdate(
        { program, className, semester: parseInt(semester, 10), division },
        { $addToSet: { holidays: day } },
        { festival: true, upsert: true } // Mongoose upsert option
      );

      res.json({
        message: 'Holiday set successfully',
        deletedEntries: deleteResult.deletedCount,
        affectedSubjects: existingEntries.map(e => e.subjectId?.subject_name).filter(Boolean),
        affectedTeachers: Array.from(new Set(existingEntries.map(e => e.teacherId?.faculty_name).filter(Boolean))),
      });
    } else {
      await WeeklyConfig.findOneAndUpdate(
        { program, className, semester: parseInt(semester, 10), division },
        { $pull: { holidays: day } }
      );
      res.json({ message: 'Holiday removed successfully' });
    }
  } catch (error) {
    next(error);
  }
};

// 9. Suggest Slot
exports.suggestSlot = async (req, res, next) => {
  try {
    const { program, className, semester, division, subjectId, teacherId, currentDay, currentTimeSlot } = req.body;

    if (!program || !className || !semester || !division || !subjectId) {
      return res.status(400).json({ error: 'program, className, semester, division, and subjectId are required' });
    }

    const suggestions = [];
    const subject = await Subject.findById(mongoose.Types.ObjectId.isValid(subjectId) ? subjectId : null);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (teacherId) {
      const isHeavySubject = subject.requiredPeriods >= 4;

      for (const day of DAYS) {
        for (const time of TIME_SLOTS.filter(s => !BREAK_SLOTS.includes(s))) {
          if (day === currentDay && time === currentTimeSlot) continue;

          const validation = await validateTimetableEntry(
            program, className, semester, division, day, time, subjectId, teacherId
          );

          if (validation.isValid) {
            let score = 100;
            let reasoning = 'Valid slot.';

            const isMorning = time.startsWith('09') || time.startsWith('10');
            if (isHeavySubject && isMorning) {
              score += 20;
              reasoning += ' Great morning slot for a heavy subject.';
            } else if (isHeavySubject && !isMorning) {
              score -= 10;
              reasoning += ' Afternoon slot (less ideal for heavy subjects).';
            }

            const timeIndex = TIME_SLOTS.indexOf(time);
            let consecutive = false;
            
            if (timeIndex > 0) {
              const prev = await Timetable.findOne({ program, className, semester, division, day, timeSlot: TIME_SLOTS[timeIndex - 1], subjectId });
              if (prev) consecutive = true;
            }
            if (timeIndex < TIME_SLOTS.length - 1) {
              const next = await Timetable.findOne({ program, className, semester, division, day, timeSlot: TIME_SLOTS[timeIndex + 1], subjectId });
              if (next) consecutive = true;
            }

            if (consecutive) {
              score -= 30;
              reasoning += ' Warning: Creates consecutive lectures for the same subject.';
            }

            suggestions.push({
              type: 'slot',
              day,
              timeSlot: time,
              score,
              reason: reasoning.trim()
            });
          }
        }
      }
    }

    if (currentDay && currentTimeSlot) {
      const alternativeTeachers = await Teacher.find({ subject_name: subject.subject_name });
      
      for (const altTeacher of alternativeTeachers) {
        if (altTeacher._id.toString() === teacherId) continue;

        const validation = await validateTimetableEntry(
          program, className, semester, division, currentDay, currentTimeSlot, subjectId, altTeacher._id.toString()
        );

        if (validation.isValid) {
          suggestions.push({
            type: 'teacher',
            teacherId: altTeacher._id,
            faculty_name: altTeacher.faculty_name,
            score: 90,
            reason: `Teacher ${altTeacher.faculty_name} is available for this slot.`
          });
        }
      }
    }

    suggestions.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
};

// 10. Validate entire timetable state
exports.validateTimetableRoute = async (req, res, next) => {
  try {
    const { program, className, semester, division, classroomId } = req.body;
    const validation = await validateTimetable(program, className, semester, division, classroomId);
    res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
    });
  } catch (error) {
    next(error);
  }
};

exports.autoGenerateRoute = async (req, res, next) => {
  try {
    const { departmentId, semesterId, division, options = { includeTheory: true, includeLabs: false } } = req.body;
    console.log(`[GENERATOR LOG] department=${departmentId}, semester=${semesterId}, division=${division}`);
    const { generateTimetable } = require('../services/timetableGenerator');
    const result = await generateTimetable({ departmentId, semesterId, division, options, userId: req.user.userId });
    if (!result.success) return res.status(500).json({ error: result.errors.join(', ') });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.smartGenerateRoute = async (req, res, next) => {
  try {
    const { departmentId, semesterId, division, options = { includeTheory: true, includeLabs: true } } = req.body;
    
    if (!departmentId || !semesterId || !division) {
      return res.status(400).json({ error: 'departmentId, semesterId, and division are required.' });
    }

    console.log(`[GENERATOR LOG] department=${departmentId}, semester=${semesterId}, division=${division}`);
    const { generateTimetable } = require('../services/timetableGenerator');
    const result = await generateTimetable({ departmentId, semesterId, division, options, userId: req.user.userId });
    if (!result.success) return res.status(500).json({ error: result.errors.join(', ') });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// 13. Get Weekly Config
exports.getWeeklyConfig = async (req, res, next) => {
  try {
    const { program, className, semester, division } = req.query;

    if (!program || !className || !semester || !division) {
      return res.status(400).json({ error: 'All parameters are required (program, className, semester, division)' });
    }

    const config = await WeeklyConfig.findOne({
      program,
      className,
      semester: parseInt(semester, 10),
      division,
    });

    res.json({
      holidays: config?.holidays || [],
    });
  } catch (error) {
    next(error);
  }
};

// 14. Get Timetable Preview
exports.getTimetablePreview = async (req, res, next) => {
  try {
    const { program, className, semester, division, teacherId, subjectId, day, timeSlot, classroomId } = req.query;

    const filter = {};
    
    if (classroomId) {
      filter.classroomId = new mongoose.Types.ObjectId(classroomId);
    } else {
      if (program) filter.program = program;
      if (className) filter.className = className;
      if (semester) filter.semester = parseInt(semester, 10);
      if (division) filter.division = division;
    }
    
    if (teacherId && teacherId.trim() !== '') {
      filter.teacherId = new mongoose.Types.ObjectId(teacherId.trim());
    }
    if (subjectId && subjectId.trim() !== '') {
      filter.subjectId = new mongoose.Types.ObjectId(subjectId.trim());
    }
    if (day && day.trim() !== '') {
      filter.day = day.trim();
    }
    if (timeSlot && timeSlot.trim() !== '') {
      filter.timeSlot = timeSlot.trim();
    }

    const teachersCollection = Teacher.collection?.name || 'teachers';
    const subjectsCollection = Subject.collection?.name || 'subjects';
    const classroomsCollection = Classroom.collection?.name || 'classrooms';

    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: teachersCollection,
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacherData'
        }
      },
      {
        $unwind: {
          path: '$teacherData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: subjectsCollection,
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subjectData'
        }
      },
      {
        $unwind: {
          path: '$subjectData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: classroomsCollection,
          let: {
            p: '$program',
            c: '$className',
            s: '$semester',
            d: '$division'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$program', '$$p'] },
                    { $eq: ['$className', '$$c'] },
                    { $eq: ['$semester', '$$s'] },
                    { $eq: ['$division', '$$d'] }
                  ]
                }
              }
            }
          ],
          as: 'classroomData'
        }
      },
      {
        $unwind: {
          path: '$classroomData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: {
          program: 1,
          className: 1,
          semester: 1,
          division: 1,
          day: 1,
          timeSlot: 1
        }
      }
    ];

    const timetable = await Timetable.aggregate(aggregationPipeline);

    let holidays = [];
    if (filter.program && filter.className && filter.semester && filter.division) {
      const weeklyTimetable = await WeeklyTimetable.findOne({
        program: filter.program,
        className: filter.className,
        semester: filter.semester,
        division: filter.division,
      });
      holidays = weeklyTimetable?.holidays || [];
    }

    const teachers = await Teacher.find({}, 'teacherID faculty_name department').sort({ faculty_name: 1 });
    const subjects = await Subject.find({}, 'subject_name subject_code').sort({ subject_name: 1 });

    const transformedTimetable = timetable.map((entry) => ({
      _id: entry._id,
      program: entry.program,
      className: entry.className,
      semester: entry.semester,
      division: entry.division,
      day: entry.day,
      timeSlot: entry.timeSlot,
      status: entry.status,
      subject: entry.subjectData ? {
        _id: entry.subjectData._id,
        subject_name: entry.subjectData.subject_name,
        subject_code: entry.subjectData.subject_code,
      } : null,
      teacher: entry.teacherData ? {
        _id: entry.teacherData._id,
        faculty_name: entry.teacherData.faculty_name,
        teacherID: entry.teacherData.teacherID,
        department: entry.teacherData.department,
      } : null,
      classroom: entry.classroomData ? {
        _id: entry.classroomData._id,
        roomNumber: entry.classroomData.roomNumber || null,
        building: entry.classroomData.building,
        floor: entry.classroomData.floor,
        capacity: entry.classroomData.capacity,
      } : null,
    }));

    res.json({
      timetable: transformedTimetable,
      holidays,
      teachers,
      subjects
    });
  } catch (error) {
    next(error);
  }
};

// 15. Move Timetable Entry (Drag-and-Drop)
exports.moveSlot = async (req, res, next) => {
  try {
    const { entryId, newDay, newTimeSlot, newTeacherId } = req.body;

    if (!entryId || !newDay || !newTimeSlot) {
      return res.status(400).json({ error: 'entryId, newDay, and newTimeSlot are required' });
    }

    const entry = await Timetable.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    if (entry.isLab && (TIME_SLOTS.indexOf(newTimeSlot) < 0 || TIME_SLOTS.indexOf(newTimeSlot) >= TIME_SLOTS.length - 1 || BREAK_SLOTS.includes(TIME_SLOTS[TIME_SLOTS.indexOf(newTimeSlot) + 1]))) {
      return res.status(409).json({ error: 'Labs must use two consecutive non-break slots.' });
    }
    const conflicts = await Timetable.find({ department: entry.department, semester: entry.semester, division: entry.division, day: newDay, timeSlot: newTimeSlot, _id: { $ne: entry._id } }).lean();
    if (conflicts.length) return res.status(409).json({ error: `Cannot update lecture: Division is already assigned on ${newDay} ${newTimeSlot}.` });
    if (newTeacherId && !await Teacher.exists({ _id: newTeacherId })) return res.status(404).json({ error: 'Selected teacher not found.' });
    const assignedTeacher = newTeacherId || entry.teacher;
    const teacherConflict = await Timetable.exists({ teacher: assignedTeacher, day: newDay, timeSlot: newTimeSlot, _id: { $ne: entry._id } });
    if (teacherConflict) return res.status(409).json({ error: `Cannot update lecture: Teacher is already assigned on ${newDay} ${newTimeSlot}.` });
    const roomId = entry.classroom || entry.laboratory;
    if (roomId) {
      const roomConflict = await Timetable.exists({ $or: [{ classroom: roomId }, { laboratory: roomId }], day: newDay, timeSlot: newTimeSlot, _id: { $ne: entry._id } });
      if (roomConflict) return res.status(409).json({ error: `Cannot update lecture: Classroom is already assigned on ${newDay} ${newTimeSlot}.` });
    }
    const previousDay = entry.day; const previousTimeSlot = entry.timeSlot;
    entry.day = newDay; entry.timeSlot = newTimeSlot; if (newTeacherId) entry.teacher = newTeacherId; await entry.save();
    try {
      const AuditLogModel = require('../models/AuditLog');
      await AuditLogModel.create({ userId: req.user.userId, actionType: 'MOVE', timetableId: entry._id, details: `Moved lecture from ${previousDay} ${previousTimeSlot} to ${newDay} ${newTimeSlot}` });
    } catch (auditError) { console.error('Move audit log error:', auditError.message); }
    return res.json({ success: true, message: 'Lecture updated successfully.', data: entry });

    // Run conflict validations
    const validation = await validateTimetableEntry(
      entry.program,
      entry.className,
      entry.semester,
      entry.division,
      newDay,
      newTimeSlot,
      entry.subjectId,
      entry.teacherId,
      entryId,
      entry.duration,
      entry.isLab
    );

    if (!validation.isValid) {
      return res.status(409).json({ success: false, error: validation.errors[0] || 'Validation failed', errors: validation.errors });
    }

    // If it's a lab, we also need to move the second part of the lab!
    const entriesToUpdate = [entry];
    let secondPart = null;
    let oldNextSlot = null;
    let newNextSlot = null;

    if (entry.isLab) {
      const oldIndex = TIME_SLOTS.indexOf(entry.timeSlot);
      const newIndex = TIME_SLOTS.indexOf(newTimeSlot);
      if (oldIndex !== -1 && newIndex !== -1) {
        oldNextSlot = TIME_SLOTS[oldIndex + 1];
        newNextSlot = TIME_SLOTS[newIndex + 1];

        // Find the second part entry
        secondPart = await Timetable.findOne({
          program: entry.program,
          className: entry.className,
          semester: entry.semester,
          division: entry.division,
          day: entry.day,
          timeSlot: oldNextSlot,
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
          isLab: true,
          _id: { $ne: entryId }
        });

        if (secondPart) {
          entriesToUpdate.push(secondPart);
        }
      }
    }

    const oldDay = entry.day;
    const oldTimeSlot = entry.timeSlot;

    // History and Audit logging
    const userId = req.user.userId;
    try {
      const undoData = {
        operation: 'UPDATE',
        timetableId: entriesToUpdate.map(e => e._id),
        fields: entriesToUpdate.map(e => ({ day: e.day, timeSlot: e.timeSlot }))
      };
      const redoData = {
        operation: 'UPDATE',
        timetableId: entriesToUpdate.map(e => e._id),
        fields: entriesToUpdate.map((e, idx) => {
          if (idx === 0) return { day: newDay, timeSlot: newTimeSlot };
          return { day: newDay, timeSlot: newNextSlot };
        })
      };

      await entry.populate('subjectId');
      await AuditLog.create({
        userId,
        actionType: 'MOVE',
        details: `Moved slot for subject ${entry.subjectId?.subject_code || ''} from ${oldDay} ${oldTimeSlot} to ${newDay} ${newTimeSlot}`
      });
      await pushHistory(userId, 'MOVE', `Move ${entry.subjectId?.subject_code || ''} slot`, undoData, redoData);
    } catch (histErr) {
      console.error('History integration error:', histErr);
    }

    // Now perform actual database updates
    entry.day = newDay;
    entry.timeSlot = newTimeSlot;
    await entry.save();

    if (secondPart && newNextSlot) {
      secondPart.day = newDay;
      secondPart.timeSlot = newNextSlot;
      await secondPart.save();
    }

    // Nodemailer update notification
    try {
      const { sendTimetableUpdateEmail } = require('../services/emailService');
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findById(entry.teacherId);
      if (teacher) {
        const divisionInfo = `${entry.program} ${entry.className} Sem-${entry.semester} Div-${entry.division} moved from ${oldDay} ${oldTimeSlot} to ${newDay} ${newTimeSlot}`;
        const User = require('../models/User');
        const user = await User.findOne({
          $or: [
            { name: teacher.faculty_name },
            { username: teacher.faculty_name },
            { email: { $regex: new RegExp(teacher.faculty_name.replace(/\s+/g, ''), 'i') } }
          ]
        });
        const recipientEmail = user ? user.email : `${teacher.faculty_name.toLowerCase().replace(/\s+/g, '')}@edux.edu`;
        await sendTimetableUpdateEmail(recipientEmail, teacher.faculty_name, divisionInfo);
      }
    } catch (emailErr) {
      console.error('Nodemailer update notification error:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Timetable entry moved successfully',
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// 16. Copy Timetable between divisions
exports.copyTimetable = async (req, res, next) => {
  try {
    const { program, className, semester, sourceDivision, targetDivision } = req.body;

    if (!program || !className || !semester || !sourceDivision || !targetDivision) {
      return res.status(400).json({ error: 'All fields are required (program, className, semester, sourceDivision, targetDivision)' });
    }

    const semNum = parseInt(semester, 10);
    const sourceEntries = await Timetable.find({
      program,
      className,
      semester: semNum,
      division: sourceDivision
    });

    if (sourceEntries.length === 0) {
      return res.status(404).json({ error: 'No source timetable entries found' });
    }

    const createdBy = req.user.userId;
    let copiedCount = 0;
    const skipped = [];

    // Find if target already has entries
    const targetHasEntries = await Timetable.exists({
      program,
      className,
      semester: semNum,
      division: targetDivision
    });

    if (targetHasEntries) {
      return res.status(400).json({ error: `Target division ${targetDivision} already has timetable allocations. Please reset target timetable first.` });
    }

    for (const entry of sourceEntries) {
      const validation = await validateTimetableEntry(
        program,
        className,
        semNum,
        targetDivision,
        entry.day,
        entry.timeSlot,
        entry.subjectId,
        entry.teacherId,
        undefined,
        entry.duration,
        entry.isLab
      );

      if (validation.isValid) {
        await Timetable.create({
          program,
          className,
          semester: semNum,
          division: targetDivision,
          day: entry.day,
          timeSlot: entry.timeSlot,
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
          classroomId: entry.classroomId || undefined,
          isLab: entry.isLab,
          duration: entry.duration,
          status: 'valid',
          createdBy
        });
        copiedCount++;
      } else {
        skipped.push({
          day: entry.day,
          timeSlot: entry.timeSlot,
          reason: validation.errors[0] || 'Conflict detected'
        });
      }
    }

    res.json({
      success: true,
      message: `Timetable copied. Copied: ${copiedCount}, Skipped: ${skipped.length}`,
      data: { copiedCount, skipped }
    });
  } catch (error) {
    next(error);
  }
};

// 17. Update Teacher for a slot (Swap)
exports.updateTeacher = async (req, res, next) => {
  try {
    const { entryId, newTeacherId } = req.body;
    if (!entryId || !newTeacherId) {
      return res.status(400).json({ error: 'entryId and newTeacherId are required' });
    }

    const entry = await Timetable.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    const replacementTeacher = await Teacher.findById(newTeacherId).lean();
    if (!replacementTeacher) return res.status(404).json({ error: 'Replacement teacher not found' });
    if (String(entry.teacher) === String(newTeacherId)) return res.status(400).json({ error: 'This teacher is already assigned to the lecture' });
    const teacherConflict = await Timetable.exists({ teacher: newTeacherId, day: entry.day, timeSlot: entry.timeSlot, _id: { $ne: entry._id } });
    if (teacherConflict) return res.status(409).json({ error: `Teacher is already assigned on ${entry.day} ${entry.timeSlot}.` });
    const previousTeacher = await Teacher.findById(entry.teacher).lean();
    entry.teacher = newTeacherId;
    await entry.save();
    try {
      const AuditLogModel = require('../models/AuditLog');
      await AuditLogModel.create({ userId: req.user.userId, actionType: 'REPLACE', timetableId: entry._id, details: `Replaced ${previousTeacher?.faculty_name || 'teacher'} with ${replacementTeacher.faculty_name || 'teacher'} on ${entry.day} ${entry.timeSlot}` });
    } catch (auditError) { console.error('Replacement audit log error:', auditError.message); }
    return res.json({ success: true, message: 'Teacher replaced successfully.', data: entry });

    // Run conflict validations
    const validation = await validateTimetableEntry(
      entry.program,
      entry.className,
      entry.semester,
      entry.division,
      entry.day,
      entry.timeSlot,
      entry.subjectId,
      newTeacherId,
      entryId,
      entry.duration,
      entry.isLab
    );

    if (!validation.isValid) {
      return res.status(409).json({ error: validation.errors[0] || 'Teacher conflict detected' });
    }

    // If it's a lab, we also need to update the second part of the lab!
    const entriesToUpdate = [entry];
    let secondPart = null;
    if (entry.isLab) {
      const oldIndex = TIME_SLOTS.indexOf(entry.timeSlot);
      if (oldIndex !== -1 && oldIndex < TIME_SLOTS.length - 1) {
        const oldNextSlot = TIME_SLOTS[oldIndex + 1];

        // Find the second part entry
        secondPart = await Timetable.findOne({
          program: entry.program,
          className: entry.className,
          semester: entry.semester,
          division: entry.division,
          day: entry.day,
          timeSlot: oldNextSlot,
          subjectId: entry.subjectId,
          teacherId: entry.teacherId,
          isLab: true,
          _id: { $ne: entryId }
        });

        if (secondPart) {
          entriesToUpdate.push(secondPart);
        }
      }
    }

    // Capture history and audit log before update
    const userId = req.user.userId;
    try {
      const undoData = {
        operation: 'UPDATE',
        timetableId: entriesToUpdate.map(e => e._id),
        fields: entriesToUpdate.map(e => ({ teacherId: e.teacherId }))
      };
      const redoData = {
        operation: 'UPDATE',
        timetableId: entriesToUpdate.map(e => e._id),
        fields: entriesToUpdate.map(e => ({ teacherId: newTeacherId }))
      };

      await entry.populate('subjectId');
      const Teacher = require('../models/Teacher');
      const oldTeacher = await Teacher.findById(undoData.fields[0].teacherId);
      const newTeacher = await Teacher.findById(newTeacherId);

      await AuditLog.create({
        userId,
        actionType: 'REPLACE',
        details: `Replaced teacher for subject ${entry.subjectId?.subject_code || ''} on ${entry.day} ${entry.timeSlot} from ${oldTeacher?.faculty_name || ''} to ${newTeacher?.faculty_name || ''}`
      });
      await pushHistory(userId, 'REPLACE', `Replace teacher for ${entry.subjectId?.subject_code || ''}`, undoData, redoData);
    } catch (histErr) {
      console.error('History integration error:', histErr);
    }

    // Now update database documents
    for (const doc of entriesToUpdate) {
      doc.teacherId = newTeacherId;
      await doc.save();
    }

    // Nodemailer update notification
    try {
      const { sendTimetableUpdateEmail } = require('../services/emailService');
      const Teacher = require('../models/Teacher');
      const newTeacher = await Teacher.findById(newTeacherId);
      if (newTeacher) {
        const divisionInfo = `${entry.program} ${entry.className} Sem-${entry.semester} Div-${entry.division} at ${entry.day} ${entry.timeSlot}`;
        const User = require('../models/User');
        const user = await User.findOne({
          $or: [
            { name: newTeacher.faculty_name },
            { username: newTeacher.faculty_name },
            { email: { $regex: new RegExp(newTeacher.faculty_name.replace(/\s+/g, ''), 'i') } }
          ]
        });
        const recipientEmail = user ? user.email : `${newTeacher.faculty_name.toLowerCase().replace(/\s+/g, '')}@edux.edu`;
        await sendTimetableUpdateEmail(recipientEmail, newTeacher.faculty_name, divisionInfo);
      }
    } catch (emailErr) {
      console.error('Nodemailer update notification error:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: entry
    });
  } catch (error) {
    next(error);
  }
};

// 18. Generate/Get Shareable Token for a division
exports.shareTimetable = async (req, res, next) => {
  try {
    const { program, className, semester, division } = req.body;
    if (!program || !className || !semester || !division) {
      return res.status(400).json({ error: 'program, className, semester, and division are required' });
    }

    const semNum = parseInt(semester, 10);

    let sharedLink = await SharedLink.findOne({
      program,
      className,
      semester: semNum,
      division
    });

    if (!sharedLink) {
      const token = crypto.randomBytes(16).toString('hex');
      sharedLink = await SharedLink.create({
        token,
        program,
        className,
        semester: semNum,
        division
      });
    }

    res.json({
      success: true,
      token: sharedLink.token
    });
  } catch (error) {
    next(error);
  }
};

// 19. Public: Get Timetable by Token (Read-Only)
exports.getSharedTimetable = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const sharedLink = await SharedLink.findOne({ token });
    if (!sharedLink) {
      return res.status(404).json({ error: 'Invalid or expired shared link' });
    }

    const { program, className, semester, division } = sharedLink;

    // Fetch timetable entries
    const timetable = await Timetable.find({
      program,
      className,
      semester,
      division
    })
    .populate('subjectId', 'subject_name subject_code isLab duration')
    .populate('teacherId', 'faculty_name department')
    .populate('classroomId', 'roomNumber')
    .sort({ day: 1, timeSlot: 1 });

    // Fetch holidays config
    const config = await WeeklyConfig.findOne({
      program,
      className,
      semester,
      division
    });

    res.json({
      success: true,
      data: {
        program,
        className,
        semester,
        division,
        holidays: config?.holidays || [],
        timetable
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// NEW: Professional Slot Management & Conflict Resolution Endpoints
// ==========================================

const AuditLog = require('../models/AuditLog');
const HistoryState = require('../models/HistoryState');

// Helper to push state onto the Undo stack and clear Redo stack
async function pushHistory(userId, actionType, description, undoData, redoData) {
  try {
    await HistoryState.deleteMany({ userId, isUndone: true });
    const lastState = await HistoryState.findOne({ userId }).sort({ actionIndex: -1 });
    const nextIndex = lastState ? lastState.actionIndex + 1 : 1;
    await HistoryState.create({
      userId,
      actionIndex: nextIndex,
      actionType,
      undoData,
      redoData,
      description,
      isUndone: false
    });
  } catch (err) {
    console.error('Error pushing history state:', err);
  }
}

// Helper to apply undo/redo DB mutations
async function applyHistoryOperation(op) {
  const Timetable = require('../models/Timetable');
  if (op.operation === 'CREATE') {
    if (Array.isArray(op.document)) {
      await Timetable.insertMany(op.document);
    } else {
      await Timetable.create(op.document);
    }
  } else if (op.operation === 'DELETE') {
    if (Array.isArray(op.timetableId)) {
      await Timetable.deleteMany({ _id: { $in: op.timetableId } });
    } else {
      await Timetable.findByIdAndDelete(op.timetableId);
    }
  } else if (op.operation === 'UPDATE') {
    if (Array.isArray(op.timetableId)) {
      for (let i = 0; i < op.timetableId.length; i++) {
        await Timetable.findByIdAndUpdate(op.timetableId[i], op.fields[i]);
      }
    } else {
      await Timetable.findByIdAndUpdate(op.timetableId, op.fields);
    }
  }
}

// @desc    Perform dry-run validations on an edit or addition
// @route   POST /api/timetable/validate-change
// @access  Private (Admin)
exports.validateSlotChange = async (req, res, next) => {
  try {
    let { program, className, semester, division, day, timeSlot, subjectId, teacherId, classroomId, excludeTimetableId, isLab } = req.body;
    isLab = Boolean(isLab);

    const errors = [];
    const warnings = [];

    // Room Conflict Validation
    if (classroomId) {
      const query = { 
        $or: [{ classroom: classroomId }, { laboratory: classroomId }], 
        day, 
        timeSlot 
      };
      if (excludeTimetableId) query._id = { $ne: excludeTimetableId };
      const classroomConflict = await Timetable.findOne(query);
      if (classroomConflict) {
        errors.push(`Room is already booked at this time`);
      }
    }

    // Teacher Conflict
    if (teacherId) {
      const query = { teacher: teacherId, day, timeSlot };
      if (excludeTimetableId) query._id = { $ne: excludeTimetableId };
      const teacherConflict = await Timetable.findOne(query);
      if (teacherConflict) {
        errors.push(`Teacher is already assigned at this time`);
      }
    }
    
    // Division Conflict
    if (program && semester && division) {
      const query = { department: program, semester, division, day, timeSlot };
      if (excludeTimetableId) query._id = { $ne: excludeTimetableId };
      const divConflict = await Timetable.findOne(query);
      if (divConflict) {
        errors.push(`Division is already occupied at this time`);
      }
    }

    res.json({
      isValid: errors.length === 0,
      errors,
      warnings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch eligible replacement faculty with compatibility scores
// @route   POST /api/timetable/replacement-eligibility
// @access  Private (Admin)
exports.getReplacementFaculty = async (req, res, next) => {
  try {
    const { timetableId, program, className, semester, division, day, timeSlot, subjectId } = req.body;

    let targetEntry = null;
    if (timetableId) {
      targetEntry = await Timetable.findById(timetableId);
    }

    const prog = program || req.body.departmentId || targetEntry?.department;
    const clsName = className || 'Timetable';
    const sem = semester || targetEntry?.semester;
    const div = division || targetEntry?.division;
    const d = day || targetEntry?.day;
    const ts = timeSlot || targetEntry?.timeSlot;
    const subId = subjectId || targetEntry?.subject;

    if (!prog || !clsName || !sem || !div || !d || !ts || !subId) {
      return res.status(400).json({ error: 'Context parameters (program, className, semester, division, day, timeSlot, subjectId) are required.' });
    }

    const subject = await Subject.findById(mongoose.Types.ObjectId.isValid(subId) ? subId : null);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found.' });
    }

    // Find eligible replacement teachers (matching subject name/department)
    const teachers = await Teacher.find().sort({ faculty_name: 1 }).lean();
    const candidateFaculty = [];

    for (const teacher of teachers) {
      if (String(teacher._id) === String(targetEntry?.teacher)) continue;
      // 1. Availability check
      const isBusy = await Timetable.exists({
        teacher: teacher._id,
        day: d,
        timeSlot: ts,
        _id: { $ne: timetableId }
      });

      const targetDate = getDateForWeekday(d);
      const isOnLeave = await TeacherLeave.exists({
        teacherId: teacher._id,
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate }
      });

      // 2. Subject Eligibility check (checks if subject matches or if teacher is in same department)
      const subjectMatch = teacher.subject_name === subject.subject_name;
      const deptMatch = teacher.department === subject.department;
      const eligible = subjectMatch || deptMatch;

      // 3. Workload calculation
      const assignedCount = await Timetable.countDocuments({ teacher: teacher._id });
      const maxWorkload = teacher.preferences?.maxWorkload || teacher.teaching_hours || 40;
      const utilization = Math.min(Math.round((assignedCount / maxWorkload) * 100), 100);

      // 4. Calculate Compatibility Score
      let score = 100;
      const reasons = [];

      if (isBusy) {
        score -= 40;
        reasons.push('Assigned to another class in this timeslot');
      }
      if (isOnLeave) {
        score -= 40;
        reasons.push('On registered leave for this date');
      }
      if (!subjectMatch) {
        score -= 20;
        reasons.push('Does not teach this primary subject');
      }
      if (utilization >= 100) {
        score -= 15;
        reasons.push('Weekly workload utilization is maxed out');
      }

      score = Math.max(0, score);

      candidateFaculty.push({
        id: teacher._id.toString(),
        faculty_name: teacher.faculty_name,
        teacherID: teacher.teacherID,
        department: teacher.department,
        available: !isBusy && !isOnLeave,
        eligible,
        conflict: isBusy || isOnLeave,
        workload: utilization,
        compatibility: score,
        reasons: reasons.length > 0 ? reasons : ['Perfectly available & eligible']
      });
    }

    // Sort by compatibility score descending
    candidateFaculty.sort((a, b) => b.compatibility - a.compatibility);

    res.json({ success: true, candidates: candidateFaculty });
  } catch (error) {
    next(error);
  }
};

// @desc    Check safety of moving a slot
// @route   POST /api/timetable/move-check
// @access  Private (Admin)
exports.checkMoveSafety = async (req, res, next) => {
  try {
    const { entryId, newDay, newTimeSlot } = req.body;
    if (!entryId || !newDay || !newTimeSlot) {
      return res.status(400).json({ error: 'entryId, newDay, and newTimeSlot are required' });
    }

    const entry = await Timetable.findById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    const validation = await validateTimetableEntry(
      entry.program,
      entry.className,
      entry.semester,
      entry.division,
      newDay,
      newTimeSlot,
      entry.subjectId,
      entry.teacherId,
      entryId,
      entry.duration,
      entry.isLab
    );

    res.json({
      success: true,
      isValid: validation.isValid,
      errors: validation.errors || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    AI slot fix suggest generator
// @route   POST /api/timetable/suggest-fix
// @access  Private (Admin)
exports.suggestSlotFix = async (req, res, next) => {
  try {
    const { entryId } = req.body;
    if (!entryId) {
      return res.status(400).json({ error: 'entryId is required' });
    }

    const entry = await Timetable.findById(entryId).populate('subjectId teacherId');
    if (!entry) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    const recommendations = [];

    // Option 1: Move Slot (find available timeslots for same teacher and classroom)
    const activeSlots = TIME_SLOTS.filter(s => !BREAK_SLOTS.includes(s));
    for (const d of DAYS) {
      for (const ts of activeSlots) {
        if (d === entry.day && ts === entry.timeSlot) continue;

        const val = await validateTimetableEntry(
          entry.program, entry.className, entry.semester, entry.division, d, ts, entry.subjectId._id, entry.teacherId._id, entryId, entry.duration, entry.isLab
        );

        if (val.isValid) {
          recommendations.push({
            type: 'MOVE',
            description: `Move ${entry.subjectId.subject_code} to ${d} ${ts}`,
            payload: { newDay: d, newTimeSlot: ts },
            conflictRisk: 0,
            score: 95,
            reason: `Zero conflict move slot. Classroom and Faculty are free.`
          });
          if (recommendations.length >= 2) break;
        }
      }
      if (recommendations.length >= 2) break;
    }

    // Option 2: Replace Faculty (find eligible replacement teachers available in this slot)
    const alternativeTeachers = await Teacher.find({ department: entry.teacherId.department, _id: { $ne: entry.teacherId._id } });
    for (const teacher of alternativeTeachers) {
      const val = await validateTimetableEntry(
        entry.program, entry.className, entry.semester, entry.division, entry.day, entry.timeSlot, entry.subjectId._id, teacher._id, entryId, entry.duration, entry.isLab
      );
      if (val.isValid) {
        recommendations.push({
          type: 'REPLACE',
          description: `Replace with Prof. ${teacher.faculty_name}`,
          payload: { newTeacherId: teacher._id.toString() },
          conflictRisk: 0,
          score: 88,
          reason: `Prof. ${teacher.faculty_name} is fully available for this slot.`
        });
        break;
      }
    }

    // fallback recommendations if empty
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'MOVE',
        description: `Move to Saturday 09:30-10:25`,
        payload: { newDay: 'Saturday', newTimeSlot: '09:30-10:25' },
        conflictRisk: 0,
        score: 75,
        reason: 'Weekend slot represents the lowest general collision probability.'
      });
    }

    res.json({ success: true, recommendations: recommendations.slice(0, 3) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent audit logs
// @route   GET /api/timetable/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('userId', 'name username email')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Undo the most recent history action
// @route   POST /api/timetable/history/undo
// @access  Private (Admin)
exports.undoAction = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // Find highest index that is not undone
    const state = await HistoryState.findOne({ userId, isUndone: false }).sort({ actionIndex: -1 });

    if (!state) {
      return res.status(400).json({ error: 'No actions to undo.' });
    }

    await applyHistoryOperation(state.undoData);
    state.isUndone = true;
    await state.save();

    await AuditLog.create({
      userId,
      actionType: 'UNDO',
      details: `Reverted action: ${state.description}`
    });

    res.json({
      success: true,
      message: `Undo successful: ${state.description}`,
      actionIndex: state.actionIndex
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Redo the next undone action
// @route   POST /api/timetable/history/redo
// @access  Private (Admin)
exports.redoAction = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // Find lowest index that is undone
    const state = await HistoryState.findOne({ userId, isUndone: true }).sort({ actionIndex: 1 });

    if (!state) {
      return res.status(400).json({ error: 'No actions to redo.' });
    }

    await applyHistoryOperation(state.redoData);
    state.isUndone = false;
    await state.save();

    await AuditLog.create({
      userId,
      actionType: 'REDO',
      details: `Re-applied action: ${state.description}`
    });

    res.json({
      success: true,
      message: `Redo successful: ${state.description}`,
      actionIndex: state.actionIndex
    });
  } catch (error) {
    next(error);
  }
};

// Date helper
function getDateForWeekday(dayName) {
  const DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetIndex = DAYS_ORDER.indexOf(dayName);
  if (targetIndex === -1) return new Date();
  const today = new Date();
  const todayIndex = today.getDay();
  const diff = targetIndex - todayIndex;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
}

// 24. Get Student Timetable
exports.getStudentTimetable = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const User = require('../models/User');
    const user = await User.findOne({ 'student.student_id': student_id });
    
    if (!user || !user.student || !user.student.division_id) {
      return res.status(404).json({ error: 'Student profile or division not assigned' });
    }

    const division_id = user.student.division_id;

    const TimetableService = require('../services/timetableService');
    const timetable = await TimetableService.getDivisionTimetable(division_id);

    // Validate entries
    const invalidEntries = timetable.filter(entry => {
      // FREE and LIBRARY slots don't require subject and teacher
      if (['FREE', 'LIBRARY'].includes(entry.slot_type)) return false;
      return !entry.subject_id || !entry.teacher_id;
    });

    if (invalidEntries.length > 0) {
      return res.status(400).json({
        error: 'Incomplete timetable entry detected',
        missing: 'teacher_id or subject_id',
        invalidCount: invalidEntries.length
      });
    }

    res.json({
      success: true,
      timetable
    });
  } catch (error) {
    next(error);
  }
};
exports.getAvailableFaculty = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { day, timeSlot, semesterId, departmentId, division } = req.query;
    const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
    const Timetable = require('../models/Timetable'); 
    const Semester = require('../models/Semester');
    
    const assignmentQuery = { subject_id: subjectId };
    if (departmentId) assignmentQuery.department = departmentId;
    if (semesterId) assignmentQuery.semester = semesterId;
    if (division) {
      assignmentQuery.$or = [{ allowed_divisions: division }, { allowed_divisions: { $size: 0 } }];
    }

    const assignments = await TeacherSubjectMapping.find(assignmentQuery).populate('teacher_id');
    
    // Find busy teachers for this slot
    let busyTeacherIds = [];
    if (day && timeSlot) {
      const query = { day, timeSlot };
      
      // Filter out past academic years if semesterId is provided
      if (semesterId) {
        const currentSemester = await Semester.findById(semesterId);
        if (currentSemester && currentSemester.academic_year) {
          const activeSemesters = await Semester.find({ academic_year: currentSemester.academic_year });
          query.semester = { $in: activeSemesters.map(s => s._id.toString()) };
        }
      }

      const busyEntries = await Timetable.find(query);
      busyTeacherIds = busyEntries.map(e => e.teacher).filter(Boolean).map(id => id.toString());
    }

    if (assignments.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No teacher mapped to this subject. Go to Teacher Assignment page.'
      });
    }

    const availableTeachers = assignments
      .map(a => a.teacher_id)
      .filter(t => t) // remove nulls
      .map(t => {
        const totalHours = t.teaching_hours || 40;
        const assignedHours = t.assignedHours || t.current_assigned_hours || 0;
        
        let isAvailable = true;
        
        // Check slot conflict
        if (busyTeacherIds.includes(t._id.toString())) {
          isAvailable = false;
        }
        
        // Check workload conflict
        if (assignedHours >= totalHours) {
          isAvailable = false;
        }

        console.log({
          teacherId: t._id,
          name: t.name || t.faculty_name,
          requestedDay: day,
          requestedTime: timeSlot,
          existingEntries: busyTeacherIds.includes(t._id.toString()) ? 'BUSY' : 'FREE',
          workload: `${assignedHours}/${totalHours}`,
          isAvailable
        });

        return {
          _id: t._id,
          id: t._id,
          name: t.name || t.faculty_name,
          faculty_name: t.name || t.faculty_name,
          teacherID: t.teacher_id || t.teacherID,
          teacher_id: t.teacher_id,
          currentWorkload: assignedHours,
          workloadLimit: totalHours,
          availabilityStatus: isAvailable ? 'available' : 'busy',
          isAvailable
        };
      }); // DO NOT filter out busy teachers, so UI can show them as disabled
      
    // Deduplicate
    const uniqueTeachers = Array.from(new Map(availableTeachers.map(t => [t.id.toString(), t])).values());
      
    res.json(uniqueTeachers);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableRooms = async (req, res, next) => {
  try {
    const { day, timeSlot, semesterId, departmentId, divisionId, subjectType, isLab } = req.query;
    
    // Use the central roomAvailability service which handles strict division mapping
    const { getAvailableRooms: fetchAvailableRoomsService } = require('../services/roomAvailability');
    
    const result = await fetchAvailableRoomsService({
      departmentId,
      semesterId,
      division: divisionId,
      day,
      timeSlot,
      subjectType: subjectType || 'Theory', // Default to theory
      isLab: isLab === 'true' || isLab === true
    });
    
    // Map to the format expected by the frontend
    res.json(result.rooms.map(r => ({
      id: r._id,
      roomNumber: r.room_name || r.room_id || r.room_number,
      capacity: r.capacity
    })));
  } catch (error) {
    next(error);
  }
};
