/**
 * Calculate the total capacity of a timetable and the currently occupied slots.
 *
 * @param {Array} workingDays - Array of working days (e.g., ['Monday', 'Tuesday', ...])
 * @param {Array} periodsPerDay - Array of period slots per day
 * @param {number} theorySlots - Total number of theory slots
 * @param {number} labSlots - Total number of lab slots
 * @param {number} librarySlots - Total number of library slots
 * @param {number} projectSlots - Total number of project slots
 * @param {number} seminarSlots - Total number of seminar slots
 * @returns {Object} - An object containing totalSlots, occupiedSlots, and remainingSlots
 */
export const calculateTimetableCapacity = (
  workingDays = [],
  periodsPerDay = [],
  { theorySlots = 0, labSlots = 0, librarySlots = 0, projectSlots = 0, seminarSlots = 0 } = {}
) => {
  const totalSlots = (workingDays?.length || 6) * (periodsPerDay?.length || 6); // Default 6 days * 6 periods = 36
  const occupiedSlots = theorySlots + labSlots + librarySlots + projectSlots + seminarSlots;
  const remainingSlots = Math.max(0, totalSlots - occupiedSlots);

  return {
    totalSlots,
    occupiedSlots,
    remainingSlots
  };
};
