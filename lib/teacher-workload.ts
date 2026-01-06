import Teacher, { IWorkloadEntry } from '@/models/Teacher';

/**
 * Get workload entry for a specific division context
 */
export function getWorkloadEntry(
  workload: IWorkloadEntry[],
  program: string,
  className: string,
  semester: number,
  division: string
): IWorkloadEntry | null {
  return (
    workload.find(
      (entry) =>
        entry.program === program &&
        entry.className === className &&
        entry.semester === semester &&
        entry.division === division
    ) || null
  );
}

/**
 * Get or create workload entry for a specific division context
 */
export function getOrCreateWorkloadEntry(
  teacher: any,
  program: string,
  className: string,
  semester: number,
  division: string
): IWorkloadEntry {
  const existingEntry = getWorkloadEntry(teacher.workload || [], program, className, semester, division);

  if (existingEntry) {
    return existingEntry;
  }

  // Create new workload entry
  const newEntry: IWorkloadEntry = {
    program,
    className,
    semester,
    division,
    assignedHours: 0,
    remainingHours: teacher.teaching_hours || 0,
  };

  return newEntry;
}

/**
 * Update teacher workload for a specific division context
 */
export async function updateTeacherWorkload(
  teacherId: string,
  program: string,
  className: string,
  semester: number,
  division: string,
  deltaHours: number
): Promise<void> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // Ensure workload array exists
  if (!teacher.workload) {
    teacher.workload = [];
  }

  // Find existing workload entry
  const workloadIndex = teacher.workload.findIndex(
    (entry) =>
      entry.program === program &&
      entry.className === className &&
      entry.semester === semester &&
      entry.division === division
  );

  if (workloadIndex >= 0) {
    // Update existing entry
    const entry = teacher.workload[workloadIndex];
    entry.assignedHours = Math.max(0, (entry.assignedHours || 0) + deltaHours);
    entry.remainingHours = Math.max(0, (teacher.teaching_hours || 0) - entry.assignedHours);
  } else {
    // Create new entry
    const newAssignedHours = Math.max(0, deltaHours);
    const newEntry: IWorkloadEntry = {
      program,
      className,
      semester,
      division,
      assignedHours: newAssignedHours,
      remainingHours: Math.max(0, (teacher.teaching_hours || 0) - newAssignedHours),
    };
    teacher.workload.push(newEntry);
  }

  await teacher.save();
}

/**
 * Get teacher workload for a specific division context
 */
export async function getTeacherWorkload(
  teacherId: string,
  program: string,
  className: string,
  semester: number,
  division: string
): Promise<{ assignedHours: number; remainingHours: number } | null> {
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return null;
  }

  const entry = getWorkloadEntry(teacher.workload || [], program, className, semester, division);

  if (entry) {
    return {
      assignedHours: entry.assignedHours,
      remainingHours: entry.remainingHours,
    };
  }

  // Return default values if no entry exists
  return {
    assignedHours: 0,
    remainingHours: teacher.teaching_hours || 0,
  };
}

