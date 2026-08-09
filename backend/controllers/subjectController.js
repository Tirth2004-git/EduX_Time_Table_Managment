const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Teacher = require('../models/Teacher');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');

async function syncTeacherAssignments(subject, teacherIds = []) {
  const ids = [...new Set(teacherIds.filter(Boolean).map(String))];
  await TeacherSubjectMapping.deleteMany({ subject_id: subject._id });
  await Subject.updateOne({ _id: subject._id }, { $set: { assignedTeachers: ids } });

  const previousTeachers = await Teacher.find({ subjects: subject._id }).select('_id').lean();
  const previousTeacherIds = previousTeachers.map((teacher) => teacher._id.toString());
  const teachersToRemove = previousTeacherIds.filter((teacherId) => !ids.includes(teacherId));

  if (teachersToRemove.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: teachersToRemove } },
      { $pull: { subjects: subject._id } }
    );
  }

  if (ids.length > 0) {
    await Teacher.updateMany(
      { _id: { $in: ids } },
      { $addToSet: { subjects: subject._id } }
    );

    const mappings = ids.map((teacherId, index) => ({
      mapping_id: `${subject.subject_code || 'SUB'}-${index + 1}`,
      teacher_id: teacherId,
      subject_id: subject._id,
      department: subject.department || subject.departmentId,
      semester: subject.semester || subject.semesterId,
      allowed_divisions: [],
      is_primary_teacher: index === 0,
      expertise_level: 'Intermediate',
      experience_with_subject: 0,
      replacement_priority: []
    }));

    await TeacherSubjectMapping.insertMany(mappings);
  }
}

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private (Admin)
exports.getSubjects = async (req, res, next) => {
  try {
    let { departmentId, semesterId, program, semester, type } = req.query;
    
    // Support legacy 'program' and 'semester' strings
    if (!departmentId && program) {
      if (program.match(/^[0-9a-fA-F]{24}$/)) {
        departmentId = program;
      } else {
        const dept = await Department.findOne({ $or: [{ department_name: program }, { short_name: program }] });
        if (dept) departmentId = dept._id.toString();
      }
    }
    
    if (!semesterId && semester) {
      if (semester.toString().match(/^[0-9a-fA-F]{24}$/)) {
        semesterId = semester;
      } else {
        const semMatch = semester.toString().match(/(\d+)/);
        const semNum = semMatch ? Number(semMatch[1]) : (isNaN(semester) ? null : Number(semester));
        if (semNum && departmentId) {
          const sem = await Semester.findOne({ semester_number: semNum, department: departmentId });
          if (sem) semesterId = sem._id.toString();
        }
      }
    }

    const query = {};
    if (departmentId) query.department = departmentId;
    if (semesterId) query.semester = semesterId;
    query.status = 'active';
    if (type) query.type = type;

    const subjects = await Subject.find(query)
      .populate('department', 'department_name short_name')
      .populate('semester', 'semester_number')
      .populate({
        path: 'assignedTeachers',
        populate: { path: 'department', select: 'department_name short_name' }
      })
      .sort({ subject_code: 1 });

    const subjectIds = subjects.map(s => s._id.toString());
    const Timetable = require('../models/Timetable');
    const allottedCounts = await Timetable.aggregate([
      { 
        $match: { 
          $or: [
            { subject_id: { $in: subjectIds } }, 
            { subject: { $in: subjectIds } }
          ] 
        } 
      },
      { 
        $group: { 
          _id: { $ifNull: ["$subject_id", "$subject"] }, 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const allottedMap = {};
    allottedCounts.forEach(c => {
      if (c._id) allottedMap[c._id.toString()] = c.count;
    });

    const mappedSubjects = subjects.map((subject) => {
      const obj = subject.toObject();
      const teachers = obj.assignedTeachers || [];
      
      const liveAllotted = allottedMap[subject._id.toString()] || 0;
      
      // Map new schema to old frontend expected properties
      obj.requiredPeriods = obj.weekly_periods || 0;
      obj.allottedPeriods = liveAllotted; 
      obj.remainingPeriods = obj.requiredPeriods - obj.allottedPeriods;
      obj.assignedTeacherCount = teachers.length;
      
      const primaryTeacher = teachers[0];
      if (primaryTeacher) {
        obj.teacherId = primaryTeacher._id; // Provide actual ID for UI components that check it
        obj.primaryTeacherName = primaryTeacher.name || primaryTeacher.faculty_name;
        obj.primaryTeacherData = primaryTeacher;
        obj.mappedTeachers = teachers;
      }
      
      // Map populated fields for frontend UI
      obj.department = subject.department?.short_name || subject.department?.department_name || '';
      obj.semester = subject.semester?.semester_number || '';
      obj.program = subject.department?.short_name || '';
      
      return obj;
    });

    res.json({ success: true, data: mappedSubjects });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private (Admin)
exports.getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(mongoose.Types.ObjectId.isValid(req.params.id) ? req.params.id : null).populate({
      path: 'assignedTeachers',
      select: 'teacher_id name department status',
      populate: { path: 'department', select: 'department_name short_name' }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private (Admin)
exports.createSubject = async (req, res, next) => {
  try {
    const data = { ...req.body };
    
    if (data.teacherId && data.teacherId.trim() === '') {
      data.teacherId = null;
    }
    
    const teacherIds = data.teacherIds || (data.teacherId ? [data.teacherId] : []);
    delete data.teacherIds;
    const subject = await Subject.create(data);
    await syncTeacherAssignments(subject, teacherIds);
    await subject.save();

    const populatedSubject = await Subject.findById(mongoose.Types.ObjectId.isValid(subject._id) ? subject._id : null)
      .populate({
        path: 'assignedTeachers',
        select: 'teacher_id name department status',
        populate: { path: 'department', select: 'department_name short_name' }
      });

    res.status(201).json({
      message: 'Subject created successfully',
      subject: populatedSubject
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    next(error);
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (Admin)
exports.updateSubject = async (req, res, next) => {
  try {
    const data = { ...req.body };
    
    if (data.teacherId && data.teacherId.trim() === '') {
      data.teacherId = null;
    }
    
    const teacherIds = data.teacherIds || (data.teacherId ? [data.teacherId] : []);
    delete data.teacherIds;
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { ...data, remainingPeriods: data.requiredPeriods - (data.allottedPeriods || 0) },
      { new: true, runValidators: true }
    ).populate({
      path: 'assignedTeachers',
      select: 'teacher_id name department status',
      populate: { path: 'department', select: 'department_name short_name' }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    await syncTeacherAssignments(subject, teacherIds);
    await subject.save();

    res.json({ message: 'Subject updated successfully', subject });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (Admin)
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};
