const Timetable = require('../models/Timetable');
const Division = require('../models/Division');

/**
 * Service to fetch and populate timetable data
 */
class TimetableService {
  /**
   * Get fully populated timetable for a specific division.
   * Resolves the division from string (e.g., "IT_SEM5_DIV_A") to ObjectId if needed.
   */
  static async getDivisionTimetable(division_id) {
    let divisionQuery = division_id;

    // Check if it's not a valid ObjectId (means it's a string identifier)
    if (!division_id.match(/^[0-9a-fA-F]{24}$/)) {
      const divisionDoc = await Division.findOne({ division_id: division_id });
      if (!divisionDoc) {
        throw new Error(`Division with ID ${division_id} not found.`);
      }
      divisionQuery = divisionDoc._id;
    }

    return await Timetable.find({ division_id: divisionQuery })
      .populate('subject_id', 'subject_name subject_code type')
      .populate('teacher_id', 'faculty_name name email')
      .populate('room_id', 'roomNumber name')
      .populate('lab_id', 'labName roomNumber');
  }

  /**
   * Get fully populated timetable for a specific teacher.
   */
  static async getTeacherTimetable(teacher_id) {
    return await Timetable.find({ teacher_id: teacher_id })
      .populate('subject_id', 'subject_name subject_code type')
      .populate('teacher_id', 'faculty_name name email')
      .populate('room_id', 'roomNumber name')
      .populate('lab_id', 'labName roomNumber');
  }

  /**
   * Get fully populated timetable for a specific subject.
   */
  static async getSubjectTimetable(subject_id) {
    return await Timetable.find({ subject_id: subject_id })
      .populate('subject_id', 'subject_name subject_code type')
      .populate('teacher_id', 'faculty_name name email')
      .populate('room_id', 'roomNumber name')
      .populate('lab_id', 'labName roomNumber');
  }
}

module.exports = TimetableService;
