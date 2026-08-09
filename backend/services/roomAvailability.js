const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Laboratory = require('../models/Laboratory');
const Timetable = require('../models/Timetable');
const Division = require('../models/Division');

exports.getAvailableRooms = async ({
  departmentId,
  semesterId, // could be ObjectId or a raw number, we'll handle both
  division,
  academicYear,
  day,
  timeSlot,
  subjectType,
  isLab
}) => {
  if (!day || !timeSlot) {
    throw new Error('Day and timeSlot are required to check room availability');
  }

  const isLaboratory = subjectType === 'Laboratory' || String(isLab) === 'true';

  if (isLaboratory) {
    // 1. LAB LOGIC
    // Find all occupied labs during this day and timeslot
    const busyLabs = await Timetable.find({ 
      day, 
      timeSlot, 
      laboratory: { $ne: null } 
    }).select('laboratory').lean();
    
    const busyLabIds = busyLabs.map(t => t.laboratory.toString());
    
    // Return labs that are active and NOT in the busy list
    const availableLabs = await Laboratory.find({
      _id: { $nin: busyLabIds },
      available: { $ne: false }
    });
    
    return { rooms: availableLabs, type: 'Laboratory' };
  } else {
    // 2. CLASSROOM (THEORY) LOGIC
    // Find all occupied classrooms during this day and timeslot
    const busyRooms = await Timetable.find({ 
      day, 
      timeSlot, 
      classroom: { $ne: null } 
    }).select('classroom').lean();
    
    const busyRoomIds = busyRooms.map(t => t.classroom.toString());
    
    // Base query: Room must be active and not occupied
    let availableRoomsQuery = { 
      _id: { $nin: busyRoomIds }, 
      available: { $ne: false }
    };

    if (departmentId && semesterId && division) {
      if (!mongoose.Types.ObjectId.isValid(semesterId) && semesterId.length !== 24) {
        // Ignoring strict ObjectId validation since string legacy IDs might be used in import
      }
      if (!mongoose.Types.ObjectId.isValid(departmentId) && departmentId.length !== 24) {
      }
      if (!mongoose.Types.ObjectId.isValid(division) && division.length !== 24) {
      }

      // First, see if there's a dedicated room specifically mapped to this exact batch
      const queryPayload = {
        departmentId: departmentId,
        semesterId: semesterId,
        divisionId: division,
        available: { $ne: false }
      };
      if (academicYear) queryPayload.academicYearId = academicYear;
      
      let specificRoom = await Classroom.findOne(queryPayload);

      // Support legacy mapping records while comparing ObjectIds as values,
      // rather than by JavaScript object identity.
      if (!specificRoom) {
        const ClassRoomMapping = require('../models/ClassRoomMapping');
        const idEquals = (left, right) => left != null && right != null && String(left) === String(right);
        const mappings = await ClassRoomMapping.find({ active: { $ne: false } }).lean();
        const mapping = mappings.find((item) =>
          idEquals(item.department, departmentId) &&
          idEquals(item.semester, semesterId) &&
          idEquals(item.division_id, division) &&
          (!academicYear || item.academic_year === academicYear)
        );
        if (mapping?.classroom_id) {
          specificRoom = await Classroom.findOne({ _id: mapping.classroom_id, available: { $ne: false } });
        }
      }

      if (specificRoom) {
        // If they have a dedicated room, and it's not busy, return ONLY their dedicated room!
        if (!busyRoomIds.includes(specificRoom._id.toString())) {
           return { rooms: [specificRoom], type: 'Classroom' };
        } else {
           // If their dedicated room is occupied, return empty to prevent using someone else's room
           return { rooms: [], type: 'Classroom' }; 
        }
      } else {
        // If this division has NO specific room assigned, we only allow them to pick unassigned/floating rooms
        // That means we must EXCLUDE all rooms that are explicitly dedicated to OTHER divisions
        const strictlyAssignedRooms = await Classroom.find({ 
          departmentId: { $ne: null },
          semesterId: { $ne: null },
          divisionId: { $ne: null }
        }).select('_id').lean();
        
        const strictlyAssignedRoomIds = strictlyAssignedRooms.map(r => r._id.toString());
        
        availableRoomsQuery._id = { 
          $nin: [...busyRoomIds, ...strictlyAssignedRoomIds] 
        };
      }
    }

    const availableRooms = await Classroom.find(availableRoomsQuery);
    return { rooms: availableRooms, type: 'Classroom' };
  }
};
