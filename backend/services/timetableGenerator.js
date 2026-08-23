const { generateTimetableSchedule } = require('./schedulingEngine');

/**
 * Universal Timetable Generator wrapper
 * Delegating directly to the deterministic Constraint Satisfaction Scheduling Engine
 */
const generateTimetable = async ({ departmentId, semesterId, division, options = {}, userId }) => {
  return generateTimetableSchedule({
    departmentId,
    semesterId,
    divisionId: division,
    options,
    userId,
  });
};

module.exports = {
  generateTimetable,
};
