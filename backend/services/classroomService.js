const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const Department = require('../models/Department');

/**
 * Reconcile and safely repair existing classroom records in MongoDB.
 * Ensures all records have valid roomNumber, building, floor, capacity, type, facilities, and status.
 */
async function reconcileClassroomData() {
  const classrooms = await Classroom.find();
  let repairedCount = 0;
  let deletedTestCount = 0;

  for (const c of classrooms) {
    // Delete orphan test rooms with no identifiers or temporary test names
    if (
      (!c.roomNumber && !c.room_name && !c.room_id) ||
      c.roomNumber === 'UnauthRoom'
    ) {
      await Classroom.findByIdAndDelete(c._id);
      deletedTestCount++;
      continue;
    }

    let roomNumber = c.roomNumber;
    let roomName = c.roomName || c.room_name;

    // Derive roomNumber from room_name (e.g. "Room 101" -> "101") or room_id (e.g. "R001" -> "101")
    if (!roomNumber) {
      if (c.room_name && c.room_name.startsWith('Room ')) {
        roomNumber = c.room_name.replace('Room ', '').trim();
      } else if (c.room_id && c.room_id.startsWith('R')) {
        const num = parseInt(c.room_id.replace('R', ''), 10);
        roomNumber = isNaN(num) ? c.room_id : String(100 + num);
      } else if (c.room_name) {
        roomNumber = c.room_name.trim();
      } else {
        roomNumber = `RM-${c._id.toString().slice(-4).toUpperCase()}`;
      }
    }

    if (!roomName) {
      roomName = `Room ${roomNumber}`;
    }

    // Determine building and floor logically from room number
    let building = c.building;
    let floor = c.floor;

    if (!building || building === 'N/A') {
      const firstChar = roomNumber.charAt(0);
      if (firstChar === '1') building = 'A Block';
      else if (firstChar === '2') building = 'B Block';
      else if (firstChar === '3') building = 'C Block';
      else building = 'Main Building';
    }

    if (!floor || floor === 'N/A') {
      const numPart = parseInt(roomNumber.replace(/\D/g, ''), 10);
      if (!isNaN(numPart) && numPart >= 100) {
        floor = String(Math.floor(numPart / 100));
      } else {
        floor = '1';
      }
    }

    // Ensure type is valid enum
    let type = c.type;
    if (!type || type === 'Lecture Hall') {
      type = 'Classroom';
    }

    // Facilities based on type
    let facilities = c.facilities && c.facilities.length > 0 ? c.facilities : [];
    if (facilities.length === 0) {
      if (type === 'Laboratory' || type === 'Computer Lab') {
        facilities = ['Computers', 'Projector', 'LAN', 'AC', 'WiFi'];
      } else if (type === 'Seminar Hall' || type === 'Auditorium') {
        facilities = ['Projector', 'Audio System', 'AC', 'WiFi', 'Podium'];
      } else {
        facilities = ['Projector', 'Whiteboard', 'WiFi'];
      }
    }

    const capacity = c.capacity && c.capacity > 0 ? c.capacity : 60;
    const status = c.status || (c.available === false ? 'Maintenance' : 'Available');

    c.roomNumber = roomNumber.toUpperCase();
    c.roomName = roomName;
    c.building = building;
    c.floor = floor;
    c.type = type;
    c.capacity = capacity;
    c.facilities = facilities;
    c.status = status;
    c.available = status === 'Available';
    c.isActive = status !== 'Inactive';
    c.academicYearId = c.academicYearId || '2026-27';

    await c.save();
    repairedCount++;
  }

  return { repairedCount, deletedTestCount };
}

/**
 * Calculates live database statistics for classrooms.
 */
async function getClassroomStats() {
  const [
    totalClassrooms,
    availableClassrooms,
    occupiedClassrooms,
    maintenanceClassrooms,
    inactiveClassrooms,
    labsCount,
    theoryCount,
    seminarCount,
    capacityAgg,
    uniqueBuildingsAgg,
  ] = await Promise.all([
    Classroom.countDocuments({ isActive: { $ne: false } }),
    Classroom.countDocuments({ isActive: { $ne: false }, available: true, status: 'Available' }),
    Classroom.countDocuments({ isActive: { $ne: false }, status: 'In Use' }),
    Classroom.countDocuments({ isActive: { $ne: false }, status: 'Maintenance' }),
    Classroom.countDocuments({ $or: [{ isActive: false }, { status: 'Inactive' }] }),
    Classroom.countDocuments({
      isActive: { $ne: false },
      type: { $in: ['Laboratory', 'Computer Lab'] },
    }),
    Classroom.countDocuments({
      isActive: { $ne: false },
      type: { $in: ['Classroom', 'Theory', 'Lecture Hall'] },
    }),
    Classroom.countDocuments({ isActive: { $ne: false }, type: 'Seminar Hall' }),
    Classroom.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: null, totalCapacity: { $sum: '$capacity' } } },
    ]),
    Classroom.distinct('building', { isActive: { $ne: false } }),
  ]);

  const totalCapacity = capacityAgg[0]?.totalCapacity || 0;
  const uniqueBuildings = uniqueBuildingsAgg.length;

  return {
    totalClassrooms,
    availableClassrooms,
    occupiedClassrooms,
    maintenanceClassrooms,
    inactiveClassrooms,
    labsCount,
    theoryCount,
    seminarCount,
    totalCapacity,
    uniqueBuildings,
  };
}

/**
 * Retrieves the weekly occupancy schedule for a specific classroom from the Timetable database.
 */
async function getClassroomOccupancySchedule(classroomId) {
  const classroom = await Classroom.findById(classroomId)
    .populate('departmentId', 'department_name short_name')
    .populate('semesterId', 'semester_number')
    .populate('divisionId', 'division_name')
    .lean();

  if (!classroom) {
    return null;
  }

  const entries = await Timetable.find({
    $or: [{ classroom: classroomId }, { laboratory: classroomId }],
  })
    .populate('subject', 'subject_name subject_code type')
    .populate('teacher', 'faculty_name name email department')
    .populate('department', 'department_name short_name')
    .populate('semester', 'semester_number')
    .populate('division', 'division_name')
    .sort({ day: 1, timeSlot: 1 })
    .lean();

  return {
    classroom,
    schedule: entries,
    totalAllocatedSlots: entries.length,
  };
}

module.exports = {
  reconcileClassroomData,
  getClassroomStats,
  getClassroomOccupancySchedule,
};
