const Timetable = require('../models/Timetable');
const User = require('../models/User');
// Register referenced schemas before using populate. Some routes load these
// models lazily, which otherwise makes the student discovery endpoint fail.
require('../models/Department');
require('../models/Semester');
require('../models/Division');
require('../models/Subject');
require('../models/Teacher');
require('../models/Classroom');
require('../models/Laboratory');

const SLOT_TYPE_ALIASES = Object.freeze({
  THEORY: 'LECTURE',
  LECTURE: 'LECTURE',
  LAB: 'LAB',
  LIBRARY: 'LIBRARY',
  FREE: 'FREE',
});
const ALLOWED_SLOT_TYPES = Object.freeze(['LECTURE', 'LAB', 'LIBRARY', 'FREE']);

function normalizeSlotType(value) {
  return SLOT_TYPE_ALIASES[String(value || 'LECTURE').trim().toUpperCase()];
}

async function getPeriodOrder() {
  const TimetableRule = require('../models/TimetableRule');
  const rule = await TimetableRule.findOne().lean();
  const configured = (rule?.period_slots || []).map((period) =>
    period.start && period.end ? `${period.start}-${period.end}` : (period.timeSlot || period.period)
  ).filter(Boolean);
  return configured.length ? configured : ['09:30-10:25', '10:25-11:20', '12:20-13:15', '13:15-14:10', '14:30-15:25', '15:25-16:20'];
}

function occupiedSlots(entry, periodOrder) {
  const duration = entry.slot_type === 'LAB' ? Math.max(2, Number(entry.duration) || 2) : 1;
  const startIndex = periodOrder.indexOf(entry.timeSlot);
  return Array.from({ length: duration }, (_, index) => ({
    day: entry.day,
    timeSlot: startIndex >= 0 && periodOrder[startIndex + index] ? periodOrder[startIndex + index] : entry.timeSlot,
  }));
}

exports.validateGeneratedTimetable = async (req, res) => {
  try {
    const { departmentId, semesterId, division, divisionId, entries } = req.body;
    const targetDivision = division || divisionId;
    if (!departmentId || !semesterId || !targetDivision) {
      return res.status(400).json({ success: false, message: 'departmentId, semesterId, and division are required.' });
    }

    // Validate client-side grids defensively as well.  This keeps malformed
    // preview data from reaching the conflict checks (or causing a server error).
    if (entries !== undefined) {
      if (!Array.isArray(entries)) {
        return res.status(400).json({ success: false, message: 'Invalid timetable entries' });
      }
      for (const entry of entries) {
        const startTime = entry.startTime || entry.slot || entry.period || entry.timeSlot;
        const endTime = entry.endTime || startTime?.split('-')[1];
        const missing = [
          ['subject', entry.subjectId], ['teacher', entry.teacherId], ['classroom', entry.classroomId || entry.roomId],
          ['day', entry.day], ['start time', startTime], ['end time', endTime], ['type', entry.type],
        ].find(([, value]) => value === undefined || value === null || String(value).trim() === '');
        if (missing) {
          const slot = `${entry.day || 'Unknown day'} ${startTime || 'Unknown time'}`;
          return res.status(400).json({ success: false, message: `Missing ${missing[0]} assignment for ${slot} slot` });
        }
      }
    }

    const [periodOrder, persistedEntries] = await Promise.all([
      getPeriodOrder(),
      Timetable.find({ $or: [{ division: targetDivision }, { teacher: { $ne: null } }, { classroom: { $ne: null } }, { laboratory: { $ne: null } }] })
        .populate('teacher', 'faculty_name name')
        .populate('classroom', 'roomNumber room_number')
        .populate('laboratory', 'lab_name roomNumber room_number')
        .lean(),
    ]);

    const conflicts = [];
    const teacherSlots = new Map();
    const roomSlots = new Map();
    const divisionSlots = new Map();
    for (const entry of persistedEntries) {
      for (const slot of occupiedSlots(entry, periodOrder)) {
        const slotLabel = `${slot.day} ${slot.timeSlot}`;
        if (entry.teacher) {
          const key = `${entry.teacher._id || entry.teacher}:${slotLabel}`;
          const previous = teacherSlots.get(key);
          if (previous && (String(previous.division) === String(targetDivision) || String(entry.division) === String(targetDivision))) conflicts.push({ type: 'TEACHER_CONFLICT', teacher: entry.teacher.faculty_name || entry.teacher.name || String(entry.teacher._id), slot: slotLabel });
          teacherSlots.set(key, entry);
        }
        const room = entry.classroom || entry.laboratory;
        if (room) {
          const key = `${room._id || room}:${slotLabel}`;
          const previous = roomSlots.get(key);
          if (previous && (String(previous.division) === String(targetDivision) || String(entry.division) === String(targetDivision))) conflicts.push({ type: 'ROOM_CONFLICT', room: room.roomNumber || room.room_number || room.lab_name || String(room._id), slot: slotLabel });
          roomSlots.set(key, entry);
        }
        if (String(entry.division) === String(targetDivision)) {
          const previous = divisionSlots.get(slotLabel);
          if (previous && String(previous._id) !== String(entry._id)) conflicts.push({ type: 'DIVISION_CONFLICT', division: String(targetDivision), slot: slotLabel });
          divisionSlots.set(slotLabel, entry);
        }
      }
    }
    const uniqueConflicts = Array.from(new Map(conflicts.map((conflict) => [`${conflict.type}:${conflict.teacher || conflict.room || conflict.division}:${conflict.slot}`, conflict])).values());
    return res.json({ success: true, valid: uniqueConflicts.length === 0, isValid: uniqueConflicts.length === 0, conflicts: uniqueConflicts });
  } catch (error) {
    console.error('Error validating persisted timetable:', error);
    return res.status(500).json({ success: false, message: 'Server Error validating timetable' });
  }
};

// Save Generated Timetable
exports.saveGeneratedTimetable = async (req, res) => {
  try {
    console.log('POST /api/timetable/generate payload:', JSON.stringify(req.body, null, 2));
    const department = req.body.department || req.body.departmentId;
    const semester = req.body.semester || req.body.semesterId;
    const divisionId = req.body.divisionId || req.body.division_id;
    const defaultClassroomId = req.body.classroomId || req.body.roomId;
    const entries = Array.isArray(req.body.entries) ? req.body.entries.map((entry) => ({
      ...entry,
      roomId: entry.roomId || entry.classroomId || defaultClassroomId,
      period: entry.period || entry.slot || entry.timeSlot,
    })) : req.body.entries;

    if (!department || !semester || !divisionId || !entries || !Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        message: 'departmentId, semesterId, divisionId, and an entries array are required.'
      });
    }

    for (const entry of entries) {
      const normalizedType = normalizeSlotType(entry.type);
      if (!normalizedType) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slot type',
          received: entry.type,
          allowed: ALLOWED_SLOT_TYPES,
        });
      }
      entry.type = normalizedType;
    }

    // Validation & Conflict checking
    const conflicts = [];
    const teacherPeriodMap = {};
    const roomPeriodMap = {};
    const divisionPeriodMap = {};

    // Auto-resolve mapped room for theory subjects
    const Classroom = require('../models/Classroom');
    let mappedTheoryRoomId = null;
    const academicYear = req.body.academicYear;
    let mappedRoom = await Classroom.findOne({
      departmentId: department,
      semesterId: semester,
      divisionId,
      ...(academicYear ? { academicYearId: academicYear } : {}),
      available: { $ne: false }
    }).lean();

    // Older imports stored the relationship in ClassRoomMapping.  Resolve it
    // with normalized ids so ObjectId instances and serialized ids compare alike.
    if (!mappedRoom) {
      const ClassRoomMapping = require('../models/ClassRoomMapping');
      const idEquals = (left, right) => left != null && right != null && String(left) === String(right);
      const legacyMappings = await ClassRoomMapping.find({ active: { $ne: false } }).lean();
      const legacyMapping = legacyMappings.find((mapping) =>
        idEquals(mapping.department, department) &&
        idEquals(mapping.semester, semester) &&
        idEquals(mapping.division_id, divisionId) &&
        (!academicYear || mapping.academic_year === academicYear)
      );
      if (legacyMapping?.classroom_id) {
        mappedRoom = await Classroom.findOne({ _id: legacyMapping.classroom_id, available: { $ne: false } }).lean();
      }
    }
    
    if (mappedRoom) {
      mappedTheoryRoomId = mappedRoom._id;
    }

    // Deep Validation: Check DB for cross-division conflicts globally
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const { subjectId, teacherId, day, period, type } = entry;

      if (type !== 'LAB' && !entry.roomId && mappedTheoryRoomId) {
        entry.roomId = mappedTheoryRoomId;
      }
      const roomId = entry.roomId;
      
      if (!subjectId || !teacherId || !roomId || !day || !period || !type) {
        conflicts.push(`Invalid timetable entry at ${day || 'unknown day'} ${period || 'unknown time'}: subject, teacher, classroom, day, slot, and type are required`);
        continue;
      }
      
      const isFreeOrLibrary = type === 'FREE' || type === 'LIBRARY';
      if (!isFreeOrLibrary) {
        if (!teacherId) {
           conflicts.push(`Missing teacher mapping for subject ${entry.subjectCode || subjectId}`);
        } else {
           // Global Teacher check across all divisions
           const tConflict = await Timetable.exists({ teacher: teacherId, day: day, timeSlot: period, division: { $ne: divisionId } });
           if (tConflict) {
              conflicts.push(`Global Teacher Conflict: Teacher ${teacherId} is already booked on ${day} period ${period} in another division.`);
           }
        }
        if (!roomId && type !== 'LAB') {
           conflicts.push(`Subject ${subjectId} on ${day} period ${period} missing classroom mapping`);
        } else if (roomId) {
           // Global Room check across all divisions
           const rConflict = await Timetable.exists({
             $or: [
               { classroom: roomId, day: day, timeSlot: period, division: { $ne: divisionId } },
               { laboratory: roomId, day: day, timeSlot: period, division: { $ne: divisionId } }
             ]
           });
           if (rConflict) {
              conflicts.push(`Global Room Conflict: Room ${roomId} is already booked on ${day} period ${period} in another division.`);
           }
        }
      }

      // Check intra-division conflict (same division cannot have same period twice)
      const divisionKey = `${divisionId}-${day}-${period}`;
      if (divisionPeriodMap[divisionKey]) {
         conflicts.push(`Division conflict: Division ${divisionId} already has a class scheduled on ${day} period ${period}`);
      }
      divisionPeriodMap[divisionKey] = true;
    }

    if (conflicts.length > 0) {
      return res.status(400).json({ success: false, message: conflicts[0], conflicts });
    }

    const mode = req.body.mode || 'full';
    const publicationStatus = req.path.endsWith('/draft') ? 'draft' : 'published';

    // Clear existing generated scheduled entries for this division only on full mode
    if (mode === 'full') {
      await Timetable.deleteMany({ division: divisionId, department, semester });
    }

    // Prepare for bulk insert
    const entriesToInsert = entries.map(entry => {
      const room = entry.type === 'LAB' ? undefined : (entry.roomId || mappedTheoryRoomId || undefined);
      const laboratory = entry.type === 'LAB' ? (entry.roomId || undefined) : undefined;
      console.log({ subject: entry.subjectId, teacher: entry.teacherId, room: room || laboratory, slot: `${entry.day} ${entry.period}` });
      return ({
      department,
      semester,
      division: divisionId,
      subject: entry.subjectId,
      teacher: entry.teacherId,
      classroom: room,
      laboratory,
      day: entry.day,
      timeSlot: entry.period,
      slot_type: entry.type,
      publicationStatus,
      isLab: entry.type === 'LAB',
      duration: entry.duration || (entry.type === 'LAB' ? 2 : 1),
      createdBy: 'AI'
    });
    });

    const result = await Timetable.insertMany(entriesToInsert);

    res.status(200).json({
      success: true,
      message: 'Timetable saved successfully',
      totalEntries: result.length
    });

  } catch (error) {
    console.error('Error saving timetable:', error);
    res.status(500).json({ success: false, message: 'Server Error saving timetable' });
  }
};

// Fetch Timetable API - Division
exports.getDivisionTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const entries = await Timetable.find({ division: id })
      .populate('subject', 'subject_name subject_code name type')
      .populate('teacher', 'name email teacherId user_id faculty_name')
      .populate('classroom', 'room_number roomNumber room_name room_id capacity')
      .populate('laboratory', 'room_number roomNumber room_name lab_name lab_id capacity')
      .lean();

    res.status(200).json({ success: true, entries });
  } catch (error) {
    console.error('Error fetching division timetable:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching timetable' });
  }
};

// Fetch Timetable API - Student
exports.getStudentTimetable = async (req, res) => {
  try {
    if (String(req.user?.role || '').toLowerCase() !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access is required.' });
    }

    const user = await User.findById(req.user.userId).populate({
      path: 'division_id',
      populate: [
        { path: 'department', select: 'department_name short_name' },
        { path: 'semester', select: 'semester_number academic_year' },
      ],
    });
    
    if (!user || user.role !== 'student') {
       return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const division = user.division_id;
    const divisionId = division?._id;
    if (!divisionId) {
      return res.status(200).json({
        success: true,
        entries: [],
        academicProfile: {
          studentId: user.student_id || null,
          name: user.name,
          email: user.email,
          department: null,
          semester: null,
          division: null,
        },
      });
    }

    const entries = await Timetable.find({ division: divisionId })
      .populate('subject', 'subject_name subject_code name type')
      .populate('teacher', 'name email teacherId user_id faculty_name')
      .populate('classroom', 'room_number roomNumber room_name room_id capacity')
      .populate('laboratory', 'room_number roomNumber room_name lab_name lab_id capacity')
      .lean();

    res.status(200).json({
      success: true,
      entries,
      academicProfile: {
        studentId: user.student_id || null,
        name: user.name,
        email: user.email,
        department: division?.department ? {
          id: division.department._id,
          name: division.department.department_name || division.department.short_name,
        } : null,
        semester: division?.semester ? {
          id: division.semester._id,
          number: division.semester.semester_number,
          academicYear: division.semester.academic_year,
        } : null,
        division: division ? { id: division._id, name: division.division_name } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching student timetable:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching timetable' });
  }
};

const requireStudent = (req, res) => {
  if (String(req.user?.role || '').toLowerCase() !== 'student') {
    res.status(403).json({ success: false, message: 'Student access is required.' });
    return false;
  }
  return true;
};

const publishedFilter = { publicationStatus: 'published' };
// Legacy imports stored semester/division as display values (for example, 4
// and "A"). They cannot be populated as the current reference-based schema.
// Student accounts created through the current registration flow use these
// three ObjectId references, so discovery intentionally uses the same shape.
const academicReferenceFilter = {
  department: { $regex: '^[a-fA-F0-9]{24}$' },
  semester: { $regex: '^[a-fA-F0-9]{24}$' },
  division: { $regex: '^[a-fA-F0-9]{24}$' },
};

// Read-only discovery data for the universal student timetable viewer.
exports.getAvailableStudentTimetables = async (req, res) => {
  try {
    if (!requireStudent(req, res)) return;
    const entries = await Timetable.find({ ...publishedFilter, ...academicReferenceFilter })
      .select('department semester division')
      .populate('department', 'department_name short_name')
      .populate('semester', 'semester_number academic_year')
      .populate('division', 'division_name')
      .lean();
    const combinations = [...new Map(entries.filter((entry) => entry.department && entry.semester && entry.division).map((entry) => {
      const item = {
        department: { id: String(entry.department._id), name: entry.department.department_name || entry.department.short_name },
        semester: { id: String(entry.semester._id), number: entry.semester.semester_number, academicYear: entry.semester.academic_year },
        division: { id: String(entry.division._id), name: entry.division.division_name },
      };
      return [`${item.department.id}:${item.semester.id}:${item.division.id}`, item];
    })).values()];
    res.json({ success: true, combinations });
  } catch (error) {
    console.error('Unable to discover published student timetables:', error);
    res.status(500).json({ success: false, message: 'Unable to load available timetables.' });
  }
};

exports.getPublishedStudentTimetable = async (req, res) => {
  try {
    if (!requireStudent(req, res)) return;
    const { department, semester, division } = req.query;
    if (!department || !semester || !division) return res.status(400).json({ error: 'Department, semester, and division are required.' });
    const entries = await Timetable.find({ ...publishedFilter, department, semester, division })
      .populate('subject', 'subject_name subject_code name type')
      .populate('teacher', 'name email faculty_name')
      .populate('classroom', 'roomNumber room_name')
      .populate('laboratory', 'roomNumber lab_name')
      .lean();
    res.json({ success: true, entries });
  } catch (error) {
    console.error('Unable to load published student timetable:', error);
    res.status(500).json({ success: false, message: 'Unable to load timetable.' });
  }
};

// Fetch Timetable API - Teacher
exports.getTeacherTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const entries = await Timetable.find({ teacher: id })
      .populate('subject', 'subject_name subject_code name type')
      .populate('division', 'division_id division_name')
      .populate('classroom', 'room_number roomNumber room_name room_id capacity')
      .populate('laboratory', 'room_number roomNumber room_name lab_name lab_id capacity')
      .lean();

    res.status(200).json({ success: true, entries });
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching timetable' });
  }
};
