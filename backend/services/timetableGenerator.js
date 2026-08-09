const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const TimetableRule = require('../models/TimetableRule');
const { getAvailableRooms } = require('./roomAvailability');

// Shuffle array helper for randomized layout
function shuffleArray(array) {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

// Global teacher conflict check across ALL divisions
const isTeacherBusy = async (teacher, day, timeSlot) => {
  return !!(await Timetable.exists({ teacher, day, timeSlot }));
};

// Workload calculator (Max 36 hours constraint)
const getTeacherWorkload = async (teacher) => {
  const entries = await Timetable.find({ teacher }).lean();
  return entries.reduce((acc, curr) => acc + (curr.duration || 1), 0);
};

const MAX_TEACHER_HOURS = 36;

const generateTimetable = async ({ departmentId, semesterId, division, options, userId }) => {
  const result = {
    success: true,
    message: "Timetable generated successfully",
    assignedLectures: 0,
    freeSlots: 0,
    totalSlots: 0,
    remainingEmpty: 0,
    conflicts: 0,
    labs: 0,
    skippedSlots: 0,
    entries: [],
    errors: [],
    warnings: [],
    summary: { subjectsFullyAllocated: [], unassignedSubjects: [] },
    skippedDetails: [],
  };

  try {
    const rule = await TimetableRule.findOne() || {
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      period_slots: [
        { timeSlot: '09:30-10:25' }, { timeSlot: '10:25-11:20' },
        { timeSlot: '12:20-13:15' }, { timeSlot: '13:15-14:10' },
        { timeSlot: '14:30-15:25' }, { timeSlot: '15:25-16:20' }
      ]
    };
    
    const activeDays = rule.working_days;
    const periods = rule.period_slots
      .map(p => p.start && p.end ? `${p.start}-${p.end}` : (p.timeSlot || p.period))
      .filter(Boolean);
    
    const slotKey = (day, timeSlot) => `${day}_${timeSlot}`;
    const reserved = new Set(); // Slots taken in current division
    const generatedEntriesBuffer = [];

    // Smart Fill: Mark existing division slots as reserved
    if (options && options.mode !== 'full') {
      const existingEntries = await Timetable.find({ department: departmentId, semester: semesterId, division });
      for (const entry of existingEntries) {
        reserved.add(slotKey(entry.day, entry.timeSlot));
        if (entry.duration === 2) {
           const idx = periods.indexOf(entry.timeSlot);
           if (idx !== -1 && idx + 1 < periods.length) {
              reserved.add(slotKey(entry.day, periods[idx+1]));
           }
        }
      }
    }

    const allSlots = [];
    for (const d of activeDays) {
      for (const p of periods) {
        allSlots.push({ day: d, timeSlot: p });
      }
    }
    result.totalSlots = allSlots.length;

    // Load subjects
    const subjects = await Subject.find({ department: departmentId, semester: semesterId });
    const theorySubjects = [];
    const labSubjects = [];

    for (const sub of subjects) {
      const isLabType = sub.type === 'Laboratory' || sub.type === 'Lab';
      if (sub.requires_lab || isLabType) {
        if (!options.selectedLabSubjects || options.selectedLabSubjects.includes(sub._id.toString())) {
          labSubjects.push(sub);
        }
      }
      if (!isLabType) {
        if (!options.selectedTheorySubjects || options.selectedTheorySubjects.includes(sub._id.toString())) {
          theorySubjects.push(sub);
        }
      }
    }

    // Load teacher mappings
    const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
    const mappings = await TeacherSubjectMapping.find({ 
      subject_id: { $in: subjects.map(s => s._id) },
      department: departmentId,
      semester: semesterId
    }).populate('teacher_id').sort({ is_primary_teacher: -1 });

    const getEligibleTeacher = (subjectId) => {
      // Find the best teacher (primary first, due to sort)
      const mapping = mappings.find(m => m.subject_id && m.subject_id.toString() === subjectId.toString() && m.teacher_id);
      return mapping ? mapping.teacher_id._id : null;
    };

    const dynamicTeacherWorkload = {};

    // ==========================================
    // PHASE 1: Process Labs First (Hardest constraint)
    // ==========================================
    if (options.includeLabs !== false) {
      for (const lab of labSubjects) {
        const teacher = getEligibleTeacher(lab._id);
        if (!teacher) {
          result.warnings.push(`No faculty mapped to lab subject: ${lab.subject_name}`);
          result.skippedDetails.push(`${lab.subject_name}: Skipped completely — no teacher mapping found.`);
          continue;
        }

        let teacherLoad = (await getTeacherWorkload(teacher)) + (dynamicTeacherWorkload[teacher] || 0);
        const duration = lab.lab_duration_slots || 2;
        let sessionScheduled = false;

        const shuffledDays = shuffleArray([...activeDays]);
        for (const day of shuffledDays) {
          if (sessionScheduled) break;
          
          let validStarts = [];
          for (let i = 0; i <= periods.length - duration; i++) validStarts.push(i);
          validStarts = shuffleArray(validStarts);
          
          for (const i of validStarts) {
            let isValid = true;
            const seq = [];
            for (let j = 0; j < duration; j++) seq.push(periods[i+j]);
            
            // Check Teacher Workload
            if (teacherLoad + duration > MAX_TEACHER_HOURS) {
               result.skippedDetails.push(`${lab.subject_name}: Skipped — Teacher workload cap reached.`);
               break; 
            }

            // Check reservation & teacher conflict
            for (const ts of seq) {
              if (reserved.has(slotKey(day, ts))) { isValid = false; break; }
              if (await isTeacherBusy(teacher, day, ts)) { isValid = false; break; }
              // Also check buffer
              if (generatedEntriesBuffer.some(e => e.teacher?.toString() === teacher.toString() && e.day === day && e.timeSlot === ts)) {
                 isValid = false; break;
              }
            }
            if (!isValid) continue;

            // Check Room Availability
            let assignedLabId = null;
            let roomValidForAll = true;
            let testRoomId = null;

            // Get room for first slot
            let roomsAvailable = await getAvailableRooms({ departmentId, semesterId, division, day, timeSlot: seq[0], subjectType: 'Laboratory', isLab: true });
            if (roomsAvailable.rooms && roomsAvailable.rooms.length > 0) {
              for (const room of roomsAvailable.rooms) {
                 testRoomId = room._id;
                 roomValidForAll = true;
                 for (const ts of seq) {
                    const check = await getAvailableRooms({ departmentId, semesterId, division, day, timeSlot: ts, subjectType: 'Laboratory', isLab: true });
                    if (!check.rooms.find(r => r._id.toString() === testRoomId.toString())) {
                       roomValidForAll = false; break;
                    }
                    // Check buffer
                    if (generatedEntriesBuffer.some(e => e.laboratory?.toString() === testRoomId.toString() && e.day === day && e.timeSlot === ts)) {
                       roomValidForAll = false; break;
                    }
                 }
                 if (roomValidForAll) break; // found a valid room for this lab session
              }
            } else {
               roomValidForAll = false;
            }

            if (roomValidForAll) assignedLabId = testRoomId;
            else isValid = false;

            if (isValid) {
              try {
                const entry = {
                  department: departmentId, semester: semesterId, division: division,
                  day, timeSlot: seq[0], subject: lab._id, teacher: teacher, laboratory: assignedLabId,
                  slot_type: 'LAB', isLab: true, duration: duration, status: 'valid', generated_by: 'AI'
                };
                generatedEntriesBuffer.push(entry);
                result.entries.push(entry);
                for (const ts of seq) {
                  reserved.add(slotKey(day, ts));
                  result.assignedLectures++;
                }
                result.labs += duration;
                dynamicTeacherWorkload[teacher] = (dynamicTeacherWorkload[teacher] || 0) + duration;
                sessionScheduled = true;
                result.summary.subjectsFullyAllocated.push(lab.subject_name);
              } catch (err) {
                 result.errors.push(`Lab not saved: ${err.message}`);
              }
              break;
            }
          }
        }
        if (!sessionScheduled) {
           result.skippedSlots += duration;
           result.summary.unassignedSubjects.push(lab.subject_name);
           if (!result.skippedDetails.some(m => m.includes(lab.subject_name))) {
             result.skippedDetails.push(`${lab.subject_name}: Could not find ${duration} consecutive free slots without conflict.`);
           }
        }
      }
    }

    // ==========================================
    // PHASE 2: Process Theory Subjects (1 slot each)
    // ==========================================
    if (options.includeTheory !== false) {
      for (const theory of theorySubjects) {
        const teacher = getEligibleTeacher(theory._id);
        if (!teacher) {
          result.warnings.push(`No faculty mapped to theory subject: ${theory.subject_name}`);
          result.skippedDetails.push(`${theory.subject_name}: Skipped completely — no teacher mapping found.`);
          continue;
        }

        let teacherLoad = (await getTeacherWorkload(teacher)) + (dynamicTeacherWorkload[teacher] || 0);
        const periodsNeeded = theory.weekly_periods || 3;
        let scheduled = 0;

        const shuffledDays = shuffleArray([...activeDays]);
        for (const day of shuffledDays) {
          if (scheduled >= periodsNeeded) break;
          
          // Enforce 1 theory period per day for the same subject
          let dayHasSubject = generatedEntriesBuffer.some(e => e.subject?.toString() === theory._id.toString() && e.day === day);
          if (!dayHasSubject) {
             const existing = await Timetable.findOne({ department: departmentId, semester: semesterId, division, day, subject: theory._id });
             if (existing) dayHasSubject = true;
          }
          if (dayHasSubject) continue;

          const shuffledPeriods = shuffleArray([...periods]);
          for (const ts of shuffledPeriods) {
            if (scheduled >= periodsNeeded) break;
            const k = slotKey(day, ts);
            if (reserved.has(k)) continue;

            if (teacherLoad >= MAX_TEACHER_HOURS) {
               result.skippedDetails.push(`${theory.subject_name}: Only ${scheduled}/${periodsNeeded} periods allocated — Teacher workload cap (${MAX_TEACHER_HOURS} hrs) reached.`);
               break;
            }

            if (await isTeacherBusy(teacher, day, ts)) continue;
            if (generatedEntriesBuffer.some(e => e.teacher?.toString() === teacher.toString() && e.day === day && e.timeSlot === ts)) continue;

            const roomLookup = await getAvailableRooms({ departmentId, semesterId, division, day, timeSlot: ts, subjectType: 'Theory', isLab: false });
            if (roomLookup.rooms && roomLookup.rooms.length > 0) {
               let testRoom = null;
               for (const r of roomLookup.rooms) {
                 if (!generatedEntriesBuffer.some(e => e.classroom?.toString() === r._id.toString() && e.day === day && e.timeSlot === ts)) {
                    testRoom = r._id;
                    break;
                 }
               }
               if (!testRoom) continue;

               try {
                 const entry = {
                   department: departmentId, semester: semesterId, division: division,
                   day, timeSlot: ts, subject: theory._id, teacher: teacher, classroom: testRoom,
                   slot_type: 'LECTURE', isLab: false, duration: 1, status: 'valid', generated_by: 'AI'
                 };
                 generatedEntriesBuffer.push(entry);
                 result.entries.push(entry);
                 reserved.add(k);
                 scheduled++;
                 result.assignedLectures++;
                 teacherLoad++;
                 dynamicTeacherWorkload[teacher] = (dynamicTeacherWorkload[teacher] || 0) + 1;
               } catch (err) {
                 result.errors.push(`Theory not saved: ${err.message}`);
               }
               break; // Only 1 period per day per subject
            }
          }
          if (teacherLoad >= MAX_TEACHER_HOURS && scheduled < periodsNeeded) break;
        }
        
        if (scheduled < periodsNeeded) {
          result.summary.unassignedSubjects.push(theory.subject_name);
          result.skippedSlots += (periodsNeeded - scheduled);
          if (!result.skippedDetails.some(m => m.includes(theory.subject_name))) {
             result.skippedDetails.push(`${theory.subject_name}: Only ${scheduled}/${periodsNeeded} periods allocated — no more free slots without conflict.`);
          }
        } else {
          result.summary.subjectsFullyAllocated.push(theory.subject_name);
        }
      }
    }

    result.remainingEmpty = Math.max(0, result.totalSlots - reserved.size);

    console.log("===============================");
    console.log("GENERATED ENTRIES COUNT:", generatedEntriesBuffer.length);
    if (result.skippedDetails.length > 0) {
      console.log("SKIPPED DETAILS:", result.skippedDetails);
    }
    console.log("===============================");

    return result;
  } catch (error) {
    console.error("Generator Error:", error);
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
};

module.exports = { generateTimetable };
