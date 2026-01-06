import connectDB from './mongodb';
import Timetable from '@/models/Timetable';
import Teacher from '@/models/Teacher';
import Subject from '@/models/Subject';
import WeeklyConfig from '@/models/WeeklyConfig';
import { computeTeacherWorkload, computeSubjectPeriods } from './workload-compute';
import { validateTimetableEntry } from './validation-engine';

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

export interface AutoGenerationResult {
  success: boolean;
  generated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  summary: {
    teachersReachedFullLoad: string[];
    subjectsFullyAllocated: string[];
    unassignedSubjects: string[];
  };
}

interface SubjectWithPriority {
  subject: any;
  remainingPeriods: number;
  scheduledCount: number;
  priority: number;
}

interface TeacherWithAvailability {
  teacher: any;
  remainingHours: number;
  scheduledCount: number;
}

// Hash function for deterministic randomization
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Shuffle array using deterministic hash-based seed
function hashShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const hashSeed = simpleHash(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (hashSeed + i) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Auto-generate timetable with randomized hash-based slot distribution
 */
export async function autoGenerateTimetable(
  program: string,
  className: string,
  semester: number,
  division: string,
  mode: 'fill' | 'full',
  createdBy: string
): Promise<AutoGenerationResult> {
  await connectDB();

  const result: AutoGenerationResult = {
    success: true,
    generated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    summary: {
      teachersReachedFullLoad: [],
      subjectsFullyAllocated: [],
      unassignedSubjects: [],
    },
  };

  try {
    // Get holidays for this division
    const weeklyConfig = await WeeklyConfig.findOne({
      program,
      className,
      semester,
      division,
    });
    const holidays = weeklyConfig?.holidays || [];

    // Phase 1: Clear holiday slots if they exist
    if (holidays.length > 0) {
      await Timetable.deleteMany({
        program,
        className,
        semester,
        division,
        day: { $in: holidays },
      });
    }

    // Load existing entries
    const existingEntries = await Timetable.find({
      program,
      className,
      semester,
      division,
    });

    // If full mode, clear existing entries
    if (mode === 'full') {
      await Timetable.deleteMany({
        program,
        className,
        semester,
        division,
      });
    }

    // Get subjects and teachers
    const subjects = await Subject.find({}).populate('teacherId');
    const teachers = await Teacher.find({});
    const validSubjects = subjects.filter((s) => s.teacherId);

    if (validSubjects.length === 0) {
      result.errors.push('No subjects with assigned teachers found');
      result.success = false;
      return result;
    }

    // Phase 2: Build randomized slot pool
    const allSlots: Array<{ day: string; timeSlot: string }> = [];

    for (const day of DAYS) {
      // Skip holiday days
      if (holidays.includes(day)) {
        continue;
      }

      for (const timeSlot of TIME_SLOTS) {
        // Skip break slots
        if (BREAK_SLOTS.includes(timeSlot)) {
          continue;
        }

        // Check if slot is already filled (for fill mode)
        const existing = existingEntries.find(
          (e) => e.day === day && e.timeSlot === timeSlot
        );

        if (mode === 'fill' && existing) {
          continue;
        }

        allSlots.push({ day, timeSlot });
      }
    }

    // Phase 3: Hash-shuffle slots for randomized distribution
    const seed = `${program}-${className}-${semester}-${division}`;
    const shuffledSlots = hashShuffle(allSlots, seed);

    // Phase 4: Compute subject priorities and teacher availability
    const subjectPriorities: SubjectWithPriority[] = [];
    const teacherAvailability: Map<string, TeacherWithAvailability> = new Map();

    for (const subject of validSubjects) {
      const periods = await computeSubjectPeriods(
        subject._id.toString(),
        program,
        className,
        semester,
        division
      );

      const scheduledCount = await Timetable.countDocuments({
        program,
        className,
        semester,
        division,
        subjectId: subject._id,
      });

      subjectPriorities.push({
        subject,
        remainingPeriods: periods.remainingPeriods,
        scheduledCount,
        priority: periods.remainingPeriods * 1000 - scheduledCount,
      });
    }

    subjectPriorities.sort((a, b) => b.priority - a.priority);

    for (const teacher of teachers) {
      const workload = await computeTeacherWorkload(
        teacher._id.toString(),
        program,
        className,
        semester,
        division
      );

      const scheduledCount = await Timetable.countDocuments({
        program,
        className,
        semester,
        division,
        teacherId: teacher._id,
      });

      teacherAvailability.set(teacher._id.toString(), {
        teacher,
        remainingHours: workload.remainingHours,
        scheduledCount,
      });
    }

    // Phase 5: Allocate subjects to randomized slots
    const daySubjectCount: Map<string, Map<string, number>> = new Map();

    for (const slot of shuffledSlots) {
      let allocated = false;

      // Initialize day tracking
      if (!daySubjectCount.has(slot.day)) {
        daySubjectCount.set(slot.day, new Map());
      }
      const dayMap = daySubjectCount.get(slot.day)!;

      for (const subjectPriority of subjectPriorities) {
        if (subjectPriority.remainingPeriods <= 0) continue;

        const subject = subjectPriority.subject;
        const teacher = subject.teacherId;
        if (!teacher) continue;

        const teacherId = teacher._id.toString();
        const teacherInfo = teacherAvailability.get(teacherId);
        if (!teacherInfo || teacherInfo.remainingHours <= 0) continue;

        // Check same-day subject repetition rule
        const subjectCountToday = dayMap.get(subject._id.toString()) || 0;
        if (subjectCountToday >= 2) continue; // Max 2 per day

        // Check consecutive slot rule
        const timeIndex = TIME_SLOTS.indexOf(slot.timeSlot);
        let consecutiveCount = 1;
        
        // Check backward
        for (let i = timeIndex - 1; i >= 0; i--) {
          if (BREAK_SLOTS.includes(TIME_SLOTS[i])) break;
          const prevEntry = await Timetable.findOne({
            program,
            className,
            semester,
            division,
            day: slot.day,
            timeSlot: TIME_SLOTS[i],
            subjectId: subject._id,
          });
          if (prevEntry) consecutiveCount++;
          else break;
        }
        
        // Check forward
        for (let i = timeIndex + 1; i < TIME_SLOTS.length; i++) {
          if (BREAK_SLOTS.includes(TIME_SLOTS[i])) break;
          const nextEntry = await Timetable.findOne({
            program,
            className,
            semester,
            division,
            day: slot.day,
            timeSlot: TIME_SLOTS[i],
            subjectId: subject._id,
          });
          if (nextEntry) consecutiveCount++;
          else break;
        }
        
        if (consecutiveCount >= 3) continue; // Max 2 consecutive

        // Check teacher conflict
        const teacherConflict = await Timetable.findOne({
          teacherId: teacher._id,
          day: slot.day,
          timeSlot: slot.timeSlot,
        });
        if (teacherConflict) continue;

        // Check class conflict
        const classConflict = await Timetable.findOne({
          program,
          className,
          semester,
          division,
          day: slot.day,
          timeSlot: slot.timeSlot,
        });
        if (classConflict) continue;

        // Validate entry
        const validation = await validateTimetableEntry(
          program,
          className,
          semester,
          division,
          slot.day,
          slot.timeSlot,
          subject._id.toString(),
          teacherId
        );
        if (!validation.isValid) continue;

        // Commit allocation
        try {
          await Timetable.create({
            program,
            className,
            semester,
            division,
            day: slot.day,
            timeSlot: slot.timeSlot,
            subjectId: subject._id,
            teacherId: teacher._id,
            status: 'valid',
            createdBy,
          });

          // Update counters
          dayMap.set(subject._id.toString(), subjectCountToday + 1);
          
          // Recompute workload
          const updatedTeacherWorkload = await computeTeacherWorkload(
            teacherId,
            program,
            className,
            semester,
            division
          );
          const updatedSubjectPeriods = await computeSubjectPeriods(
            subject._id.toString(),
            program,
            className,
            semester,
            division
          );

          subjectPriority.remainingPeriods = updatedSubjectPeriods.remainingPeriods;
          teacherInfo.remainingHours = updatedTeacherWorkload.remainingHours;
          teacherInfo.scheduledCount++;
          subjectPriority.scheduledCount++;

          result.generated++;
          allocated = true;
          break;
        } catch (error: any) {
          result.warnings.push(
            `Failed to allocate ${subject.subject_name} at ${slot.day} ${slot.timeSlot}: ${error.message}`
          );
        }
      }

      if (!allocated) {
        result.skipped++;
      }
    }

    // Generate summary
    for (const subjectPriority of subjectPriorities) {
      if (subjectPriority.remainingPeriods <= 0) {
        result.summary.subjectsFullyAllocated.push(subjectPriority.subject.subject_name);
      } else if (subjectPriority.scheduledCount === 0) {
        result.summary.unassignedSubjects.push(subjectPriority.subject.subject_name);
      }
    }

    for (const [teacherId, teacherInfo] of teacherAvailability.entries()) {
      if (teacherInfo.remainingHours <= 0 && teacherInfo.scheduledCount > 0) {
        result.summary.teachersReachedFullLoad.push(teacherInfo.teacher.faculty_name);
      }
    }

    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message || 'Auto-generation failed');
    return result;
  }
}

