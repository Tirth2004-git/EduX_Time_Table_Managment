const Classroom = require('../models/Classroom');

exports.getClassrooms = async (req, res, next) => {
  try {
    const classrooms = await Classroom.find()
      .populate('departmentId', 'department_name short_name')
      .populate('semesterId', 'semester_number')
      .populate('divisionId', 'division_name');
    
    // Map properties strictly to the UI payload
    const mapped = classrooms.map(c => {
      return {
        _id: c._id,
        program: c.departmentId ? c.departmentId.short_name || c.departmentId.department_name : 'N/A',
        department_id: c.departmentId ? c.departmentId._id : null,
        className: c.className || 'N/A',
        semester: c.semesterId ? c.semesterId.semester_number : 'N/A',
        semester_id: c.semesterId ? c.semesterId._id : null,
        division: c.divisionId ? c.divisionId.division_name : 'N/A',
        division_id: c.divisionId ? c.divisionId._id : null,
        roomNumber: c.roomNumber || 'N/A',
        year: c.academicYearId || 'N/A',
        capacity: c.capacity,
        building: c.building || 'N/A',
        floor: c.floor || 'N/A',
        type: c.type || 'Lecture Hall',
        available: c.available
      };
    });

    res.json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};

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
      isLab
    });
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

exports.getClassroomById = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id);
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    res.json({ classroom });
  } catch (error) {
    next(error);
  }
};

exports.createClassroom = async (req, res, next) => {
  try {
    const { program, className, semester, division, roomNumber, year, ...rest } = req.body;
    
    const payload = {
      ...rest,
      roomNumber: roomNumber,
      departmentId: program,
      className: className,
      semesterId: semester,
      divisionId: division,
      academicYearId: year || '2026-27',
      capacity: rest.capacity || 60,
      type: rest.type || 'Lecture Hall'
    };

    const classroom = await Classroom.create(payload);
    res.status(201).json({ message: 'Created', classroom });
  } catch (error) {
    next(error);
  }
};

exports.updateClassroom = async (req, res, next) => {
  try {
    const { program, className, semester, division, roomNumber, year, ...rest } = req.body;
    
    const payload = {
      ...rest,
      departmentId: program,
      className: className,
      semesterId: semester,
      divisionId: division
    };
    if (roomNumber) payload.roomNumber = roomNumber;
    if (year) payload.academicYearId = year;

    const classroom = await Classroom.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    res.json({ message: 'Updated', classroom });
  } catch (error) {
    next(error);
  }
};

exports.deleteClassroom = async (req, res, next) => {
  try {
    const classroom = await Classroom.findByIdAndDelete(req.params.id);
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    
    res.json({ message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

