const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Timetable = require('../models/Timetable');
const classroomService = require('../services/classroomService');

// @desc    Get all Classrooms with filtering, search, and sorting
// @route   GET /api/classrooms
// @access  Private
exports.getClassrooms = async (req, res, next) => {
  try {
    const {
      search,
      building,
      floor,
      type,
      status,
      departmentId,
      academicYearId,
      available,
      sortBy = 'roomNumber',
      sortOrder = 'asc',
    } = req.query;

    const filter = { isActive: { $ne: false } };

    if (building && building !== 'all') {
      filter.building = building;
    }
    if (floor && floor !== 'all') {
      filter.floor = floor;
    }
    if (type && type !== 'all') {
      filter.type = type;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (departmentId && departmentId !== 'all') {
      filter.departmentId = departmentId;
    }
    if (academicYearId && academicYearId !== 'all') {
      filter.academicYearId = academicYearId;
    }
    if (available !== undefined) {
      filter.available = available === 'true';
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { roomNumber: searchRegex },
        { roomName: searchRegex },
        { building: searchRegex },
        { floor: searchRegex },
        { type: searchRegex },
        { facilities: searchRegex },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const classrooms = await Classroom.find(filter)
      .populate('departmentId', 'department_name short_name')
      .populate('semesterId', 'semester_number')
      .populate('divisionId', 'division_name')
      .sort(sort)
      .lean();

    // Map properties for UI, keeping values clean without fake N/A strings
    const mapped = classrooms.map((c) => {
      const roomNum = c.roomNumber || (c.room_name ? c.room_name.replace('Room ', '') : c.room_id || '—');
      return {
        _id: c._id,
        roomNumber: roomNum,
        roomName: c.roomName || c.room_name || `Room ${roomNum}`,
        building: c.building || 'Main Building',
        floor: c.floor || '1',
        type: c.type || 'Classroom',
        capacity: c.capacity || 60,
        status: c.status || (c.available ? 'Available' : 'Maintenance'),
        available: c.available !== false,
        isActive: c.isActive !== false,
        facilities: c.facilities || [],
        departmentId: c.departmentId?._id || null,
        program: c.departmentId?.short_name || c.departmentId?.department_name || null,
        semesterId: c.semesterId?._id || null,
        semester: c.semesterId?.semester_number || null,
        divisionId: c.divisionId?._id || null,
        division: c.divisionId?.division_name || null,
        className: c.className || null,
        academicYearId: c.academicYearId || '2026-27',
        year: c.academicYearId || '2026-27',
      };
    });

    res.json({ success: true, data: mapped, total: mapped.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Classroom Dashboard Statistics
// @route   GET /api/classrooms/stats
// @access  Private
exports.getClassroomStats = async (req, res, next) => {
  try {
    const stats = await classroomService.getClassroomStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Classroom Details
// @route   GET /api/classrooms/:id
// @access  Private
exports.getClassroomById = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate('departmentId', 'department_name short_name')
      .populate('semesterId', 'semester_number')
      .populate('divisionId', 'division_name');

    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Classroom not found' });
    }

    res.json({ success: true, data: classroom, classroom });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Classroom Weekly Schedule / Occupancy
// @route   GET /api/classrooms/:id/schedule
// @access  Private
exports.getClassroomSchedule = async (req, res, next) => {
  try {
    const result = await classroomService.getClassroomOccupancySchedule(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Classroom not found' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Classroom
// @route   POST /api/classrooms
// @access  Private (Admin only)
exports.createClassroom = async (req, res, next) => {
  try {
    const {
      roomNumber,
      room_number,
      room_id,
      roomName,
      room_name,
      building,
      floor,
      type,
      capacity,
      facilities,
      status,
      available,
      departmentId,
      program,
      semesterId,
      semester,
      divisionId,
      division,
      className,
      academicYearId,
      year,
    } = req.body;

    const normalizedRoomNum = (roomNumber || room_number || room_id || '').trim().toUpperCase();
    if (!normalizedRoomNum) {
      return res.status(400).json({ success: false, error: 'Room number is required' });
    }

    const normalizedBuilding = (building || 'Main Building').trim();
    const normalizedFloor = String(floor !== undefined && floor !== null ? floor : '1').trim();
    const normalizedType = type || 'Classroom';
    const numCapacity = Number(capacity);

    if (isNaN(numCapacity) || numCapacity <= 0) {
      return res.status(400).json({ success: false, error: 'Capacity must be a positive number' });
    }

    // Duplicate room check within the same building
    const existing = await Classroom.findOne({
      roomNumber: normalizedRoomNum,
      building: normalizedBuilding,
      isActive: { $ne: false },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Room ${normalizedRoomNum} already exists in ${normalizedBuilding}.`,
      });
    }

    // Resolve optional department reference
    let resolvedDeptId = departmentId || program || null;
    if (resolvedDeptId && !mongoose.Types.ObjectId.isValid(resolvedDeptId)) {
      const deptDoc = await Department.findOne({
        $or: [{ department_name: resolvedDeptId }, { short_name: resolvedDeptId }],
      });
      resolvedDeptId = deptDoc ? deptDoc._id : null;
    }

    // Resolve optional semester reference
    let resolvedSemId = semesterId || semester || null;
    if (resolvedSemId && !mongoose.Types.ObjectId.isValid(resolvedSemId)) {
      const semNum = Number(String(resolvedSemId).replace(/\D/g, ''));
      if (!isNaN(semNum)) {
        const semDoc = await Semester.findOne({
          ...(resolvedDeptId ? { department: resolvedDeptId } : {}),
          semester_number: semNum,
        });
        resolvedSemId = semDoc ? semDoc._id : null;
      } else {
        resolvedSemId = null;
      }
    }

    // Resolve optional division reference
    let resolvedDivId = divisionId || division || null;
    if (resolvedDivId && !mongoose.Types.ObjectId.isValid(resolvedDivId)) {
      const divDoc = await Division.findOne({ division_name: resolvedDivId });
      resolvedDivId = divDoc ? divDoc._id : null;
    }

    const normalizedStatus = status || (available === false ? 'Maintenance' : 'Available');
    const isRoomAvailable = normalizedStatus === 'Available';

    const classroom = new Classroom({
      roomNumber: normalizedRoomNum,
      roomName: (roomName || room_name || `Room ${normalizedRoomNum}`).trim(),
      building: normalizedBuilding,
      floor: normalizedFloor,
      type: normalizedType,
      capacity: numCapacity,
      facilities: Array.isArray(facilities) ? facilities.filter(Boolean) : [],
      status: normalizedStatus,
      available: isRoomAvailable,
      isActive: normalizedStatus !== 'Inactive',
      departmentId: resolvedDeptId,
      semesterId: resolvedSemId,
      divisionId: resolvedDivId,
      className: className || null,
      academicYearId: academicYearId || year || '2026-27',
      room_id: normalizedRoomNum,
      room_name: roomName || `Room ${normalizedRoomNum}`,
    });

    await classroom.save();

    const populated = await Classroom.findById(classroom._id)
      .populate('departmentId', 'department_name short_name')
      .populate('semesterId', 'semester_number')
      .populate('divisionId', 'division_name');

    res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: populated,
      classroom: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Classroom
// @route   PUT /api/classrooms/:id
// @access  Private (Admin only)
exports.updateClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Classroom not found' });
    }

    const {
      roomNumber,
      room_number,
      roomName,
      room_name,
      building,
      floor,
      type,
      capacity,
      facilities,
      status,
      available,
      departmentId,
      program,
      semesterId,
      semester,
      divisionId,
      division,
      className,
      academicYearId,
      year,
    } = req.body;

    const newRoomNum = roomNumber || room_number ? (roomNumber || room_number).trim().toUpperCase() : classroom.roomNumber;
    const newBuilding = building !== undefined ? building.trim() : classroom.building;

    // Check duplicate if roomNumber or building changed
    if (newRoomNum !== classroom.roomNumber || newBuilding !== classroom.building) {
      const duplicate = await Classroom.findOne({
        _id: { $ne: classroom._id },
        roomNumber: newRoomNum,
        building: newBuilding,
        isActive: { $ne: false },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: `Room ${newRoomNum} already exists in ${newBuilding}.`,
        });
      }
    }

    if (capacity !== undefined) {
      const numCap = Number(capacity);
      if (isNaN(numCap) || numCap <= 0) {
        return res.status(400).json({ success: false, error: 'Capacity must be a positive number' });
      }
      classroom.capacity = numCap;
    }

    if (roomNumber || room_number) classroom.roomNumber = newRoomNum;
    if (roomName !== undefined || room_name !== undefined) classroom.roomName = (roomName || room_name || '').trim();
    if (building !== undefined) classroom.building = newBuilding;
    if (floor !== undefined) classroom.floor = String(floor).trim();
    if (type !== undefined) classroom.type = type;
    if (facilities !== undefined && Array.isArray(facilities)) classroom.facilities = facilities.filter(Boolean);

    if (status !== undefined) {
      classroom.status = status;
      classroom.available = status === 'Available';
      classroom.isActive = status !== 'Inactive';
    } else if (available !== undefined) {
      classroom.available = Boolean(available);
      classroom.status = available ? 'Available' : 'Maintenance';
    }

    if (departmentId !== undefined || program !== undefined) {
      let dept = departmentId !== undefined ? departmentId : program;
      if (dept && !mongoose.Types.ObjectId.isValid(dept)) {
        const deptDoc = await Department.findOne({
          $or: [{ department_name: dept }, { short_name: dept }],
        });
        dept = deptDoc ? deptDoc._id : null;
      }
      classroom.departmentId = dept || null;
    }

    if (semesterId !== undefined || semester !== undefined) {
      let sem = semesterId !== undefined ? semesterId : semester;
      if (sem && !mongoose.Types.ObjectId.isValid(sem)) {
        const semNum = Number(String(sem).replace(/\D/g, ''));
        const semDoc = await Semester.findOne({
          ...(classroom.departmentId ? { department: classroom.departmentId } : {}),
          semester_number: semNum,
        });
        sem = semDoc ? semDoc._id : null;
      }
      classroom.semesterId = sem || null;
    }

    if (divisionId !== undefined || division !== undefined) {
      let div = divisionId !== undefined ? divisionId : division;
      if (div && !mongoose.Types.ObjectId.isValid(div)) {
        const divDoc = await Division.findOne({ division_name: div });
        div = divDoc ? divDoc._id : null;
      }
      classroom.divisionId = div || null;
    }

    if (className !== undefined) classroom.className = className || null;
    if (academicYearId !== undefined || year !== undefined) classroom.academicYearId = academicYearId || year || '2026-27';

    await classroom.save();

    const populated = await Classroom.findById(classroom._id)
      .populate('departmentId', 'department_name short_name')
      .populate('semesterId', 'semester_number')
      .populate('divisionId', 'division_name');

    res.json({
      success: true,
      message: 'Classroom updated successfully',
      data: populated,
      classroom: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete or Deactivate Classroom
// @route   DELETE /api/classrooms/:id
// @access  Private (Admin only)
exports.deleteClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Classroom not found' });
    }

    const { force, deactivate } = req.query;

    // If explicit deactivation requested
    if (deactivate === 'true') {
      classroom.status = 'Inactive';
      classroom.available = false;
      classroom.isActive = false;
      await classroom.save();
      return res.json({
        success: true,
        message: `Classroom ${classroom.roomNumber} has been deactivated. Historical schedules remain intact.`,
      });
    }

    // Check if classroom is used in any published or existing timetable schedules
    const timetableUsage = await Timetable.countDocuments({
      $or: [{ classroom: classroom._id }, { laboratory: classroom._id }],
    });

    if (timetableUsage > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        error: `Cannot delete classroom ${classroom.roomNumber}: it is assigned to ${timetableUsage} timetable period(s). Deactivate it instead of deleting it to preserve historical records.`,
        canDeactivate: true,
        timetableUsage,
      });
    }

    await Classroom.findByIdAndDelete(classroom._id);
    res.json({
      success: true,
      message: `Classroom ${classroom.roomNumber} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reconcile & Repair Classroom Records (Admin Maintenance)
// @route   POST /api/classrooms/reconcile
// @access  Private (Admin only)
exports.reconcileClassrooms = async (req, res, next) => {
  try {
    const result = await classroomService.reconcileClassroomData();
    const stats = await classroomService.getClassroomStats();
    res.json({
      success: true,
      message: 'Classrooms reconciled successfully',
      result,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Available Rooms for Timetable Scheduling
// @route   GET /api/classrooms/available
// @access  Private
exports.getAvailableRooms = async (req, res, next) => {
  try {
    const { day, timeSlot, type, isLab, departmentId, semesterId, division, academicYear } = req.query;
    const { getAvailableRooms } = require('../services/roomAvailability');

    const result = await getAvailableRooms({
      departmentId,
      semesterId,
      division,
      academicYear,
      day,
      timeSlot,
      subjectType: type,
      isLab,
    });

    res.json(result);
  } catch (error) {
    if (error.message && error.message.includes('required')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    next(error);
  }
};
