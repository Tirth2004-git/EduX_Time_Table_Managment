import connectDB from './mongodb';
import Timetable from '@/models/Timetable';

/**
 * Compute teacher workload dynamically from timetable entries
 * No stored counters - always computed from actual timetable data
 */
export async function computeTeacherWorkload(
  teacherId: string,
  program: string,
  className: string,
  semester: number,
  division: string
): Promise<{ assignedHours: number; remainingHours: number; teaching_hours: number }> {
  await connectDB();

  // Import Teacher model dynamically to avoid circular dependencies
  const Teacher = (await import('@/models/Teacher')).default;
  const teacher = await Teacher.findById(teacherId);

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // Count timetable entries for this specific division context
  const assignedHours = await Timetable.countDocuments({
    teacherId,
    program,
    className,
    semester,
    division,
  });

  const teaching_hours = teacher.teaching_hours || 0;
  const remainingHours = Math.max(0, teaching_hours - assignedHours);

  return {
    assignedHours,
    remainingHours,
    teaching_hours,
  };
}

/**
 * Compute subject periods dynamically from timetable entries
 */
export async function computeSubjectPeriods(
  subjectId: string,
  program: string,
  className: string,
  semester: number,
  division: string
): Promise<{ allottedPeriods: number; remainingPeriods: number; requiredPeriods: number }> {
  await connectDB();

  // Import Subject model dynamically
  const Subject = (await import('@/models/Subject')).default;
  const subject = await Subject.findById(subjectId);

  if (!subject) {
    throw new Error('Subject not found');
  }

  // Count timetable entries for this specific division context
  const allottedPeriods = await Timetable.countDocuments({
    subjectId,
    program,
    className,
    semester,
    division,
  });

  const requiredPeriods = subject.requiredPeriods || 0;
  const remainingPeriods = Math.max(0, requiredPeriods - allottedPeriods);

  return {
    allottedPeriods,
    remainingPeriods,
    requiredPeriods,
  };
}

