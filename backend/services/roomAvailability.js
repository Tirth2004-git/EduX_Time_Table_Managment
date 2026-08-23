const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Laboratory = require('../models/Laboratory');
const Timetable = require('../models/Timetable');
const Division = require('../models/Division');

exports.getAvailableRooms = async ({
  departmentId,
  semesterId,
  division,
  academicYear,
  day,
  timeSlot,
  subjectType,
  isLab,
  minCapacity = 0,
}) => {
  if (!day || !timeSlot) {
    throw new Error('Day and timeSlot are required to check room availability');
  }

  const isLaboratory =
    subjectType === 'Laboratory' ||
    subjectType === 'Computer Lab' ||
    String(isLab) === 'true';

  // 1. Find all occupied classrooms and laboratories during this day and timeSlot
  const busyEntries = await Timetable.find({
    day,
    timeSlot,
    $or: [{ classroom: { $ne: null } }, { laboratory: { $ne: null } }],
  })
    .select('classroom laboratory')
    .lean();

  const busyRoomIds = new Set();
  busyEntries.forEach((t) => {
    if (t.classroom) busyRoomIds.add(t.classroom.toString());
    if (t.laboratory) busyRoomIds.add(t.laboratory.toString());
  });

  const busyArray = Array.from(busyRoomIds);

  if (isLaboratory) {
    // 1. LAB LOGIC: Fetch available laboratories and computer labs
    const [labsFromClassrooms, dedicatedLabs] = await Promise.all([
      Classroom.find({
        _id: { $nin: busyArray },
        isActive: { $ne: false },
        available: true,
        status: 'Available',
        type: { $in: ['Laboratory', 'Computer Lab'] },
        ...(minCapacity > 0 ? { capacity: { $gte: Number(minCapacity) } } : {}),
      }).lean(),
      Laboratory.find({
        _id: { $nin: busyArray },
        available: { $ne: false },
      }).lean(),
    ]);

    const formattedRooms = [
      ...labsFromClassrooms.map((r) => ({
        id: r._id,
        _id: r._id,
        roomNumber: r.roomNumber || r.room_name || r.room_id || 'Lab',
        roomName: r.roomName || r.room_name || `Lab ${r.roomNumber}`,
        building: r.building || 'Main Building',
        floor: r.floor || '1',
        type: r.type,
        capacity: r.capacity || 40,
        status: r.status || 'Available',
        facilities: r.facilities || [],
      })),
      ...dedicatedLabs.map((l) => ({
        id: l._id,
        _id: l._id,
        roomNumber: l.lab_id || l.lab_name,
        roomName: l.lab_name,
        building: 'Science & Tech Block',
        floor: '2',
        type: 'Laboratory',
        capacity: l.capacity || 40,
        status: 'Available',
        facilities: l.equipment || [],
      })),
    ];

    return { rooms: formattedRooms, type: 'Laboratory' };
  } else {
    // 2. THEORY / CLASSROOM LOGIC
    let availableRoomsQuery = {
      _id: { $nin: busyArray },
      isActive: { $ne: false },
      available: true,
      status: 'Available',
      type: { $in: ['Classroom', 'Theory', 'Lecture Hall', 'Seminar Hall', 'Tutorial Room', 'Auditorium', 'Other'] },
      ...(minCapacity > 0 ? { capacity: { $gte: Number(minCapacity) } } : {}),
    };

    // Check if there is a dedicated classroom explicitly mapped to this division
    if (departmentId && semesterId && division) {
      const queryPayload = {
        departmentId: departmentId,
        semesterId: semesterId,
        divisionId: division,
        isActive: { $ne: false },
        available: true,
        status: 'Available',
      };
      if (academicYear) queryPayload.academicYearId = academicYear;

      let specificRoom = await Classroom.findOne(queryPayload).lean();

      if (!specificRoom) {
        const ClassRoomMapping = require('../models/ClassRoomMapping');
        const idEquals = (left, right) => left != null && right != null && String(left) === String(right);
        const mappings = await ClassRoomMapping.find({ active: { $ne: false } }).lean();
        const mapping = mappings.find(
          (item) =>
            idEquals(item.department, departmentId) &&
            idEquals(item.semester, semesterId) &&
            idEquals(item.division_id, division) &&
            (!academicYear || item.academic_year === academicYear)
        );
        if (mapping?.classroom_id) {
          specificRoom = await Classroom.findOne({
            _id: mapping.classroom_id,
            isActive: { $ne: false },
            available: true,
            status: 'Available',
          }).lean();
        }
      }

      if (specificRoom) {
        if (!busyRoomIds.has(specificRoom._id.toString())) {
          return {
            rooms: [
              {
                id: specificRoom._id,
                _id: specificRoom._id,
                roomNumber: specificRoom.roomNumber || specificRoom.room_name || specificRoom.room_id,
                roomName: specificRoom.roomName || specificRoom.room_name,
                building: specificRoom.building,
                floor: specificRoom.floor,
                type: specificRoom.type,
                capacity: specificRoom.capacity,
                status: specificRoom.status,
                facilities: specificRoom.facilities || [],
              },
            ],
            type: 'Classroom',
          };
        } else {
          return { rooms: [], type: 'Classroom' };
        }
      }
    }

    const availableClassrooms = await Classroom.find(availableRoomsQuery).lean();

    const formattedRooms = availableClassrooms.map((r) => ({
      id: r._id,
      _id: r._id,
      roomNumber: r.roomNumber || (r.room_name ? r.room_name.replace('Room ', '') : r.room_id || '—'),
      roomName: r.roomName || r.room_name || `Room ${r.roomNumber}`,
      building: r.building || 'Main Building',
      floor: r.floor || '1',
      type: r.type || 'Classroom',
      capacity: r.capacity || 60,
      status: r.status || 'Available',
      facilities: r.facilities || [],
    }));

    return { rooms: formattedRooms, type: 'Classroom' };
  }
};
