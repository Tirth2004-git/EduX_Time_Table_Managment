const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const User = require('../models/User');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
const Timetable = require('../models/Timetable');
const TeacherLeave = require('../models/TeacherLeave');

function getDateForWeekday(dayName) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const target = days.indexOf(dayName);
  const date = new Date();
  date.setDate(date.getDate() + target - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

// GET /api/teachers/eligible?departmentId=&semesterId=&subjectId=&day=&timeSlot=
exports.getEligibleTeachers = async (req, res, next) => {
  try {
    const { departmentId, semesterId, division, subjectId, day, timeSlot, program, semester } = req.query;
    
    // Support legacy string values
    let finalDept = departmentId;
    let finalSem = semesterId;
    if (!finalDept && program) {
      if (program.match(/^[0-9a-fA-F]{24}$/)) finalDept = program;
      else {
        const Department = require('../models/Department');
        const dept = await Department.findOne({ $or: [{ department_name: program }, { short_name: program }] });
        if (dept) finalDept = dept._id.toString();
      }
    }
    if (!finalSem && semester) {
      if (semester.toString().match(/^[0-9a-fA-F]{24}$/)) finalSem = semester;
      else {
        const Semester = require('../models/Semester');
        const semNum = isNaN(semester) ? null : Number(semester);
        if (semNum && finalDept) {
          const semModel = await Semester.findOne({ semester_number: semNum, department: finalDept });
          if (semModel) finalSem = semModel._id.toString();
        }
      }
    }

    if (!subjectId || !day || !timeSlot) {
      return res.status(400).json({ error: 'subjectId, day, and timeSlot are required' });
    }
    
    const assignmentQuery = { subject_id: subjectId };
    if (finalDept) assignmentQuery.department = finalDept;
    if (finalSem) assignmentQuery.semester = finalSem;
    let finalDivName = division;
    if (division && division.toString().match(/^[0-9a-fA-F]{24}$/)) {
      const Division = require('../models/Division');
      const divModel = await Division.findById(division);
      if (divModel) finalDivName = divModel.division_name;
    }

    if (finalDivName) assignmentQuery.$or = [{ allowed_divisions: finalDivName }, { allowed_divisions: { $size: 0 } }];
    
    const assignments = await TeacherSubjectMapping.find(assignmentQuery)
      .populate({
        path: 'teacher_id',
        populate: { path: 'department' }
      })
      .populate({
        path: 'replacement_priority.teacher_id',
        populate: { path: 'department' }
      });
      
    const date = getDateForWeekday(day);
    const candidatesMap = new Map(); // to avoid duplicates
    
    // Helper to process a teacher
    const processTeacher = async (teacher, isPrimary, isReplacement) => {
      if (!teacher || candidatesMap.has(teacher._id.toString())) return;
      
      const isUnavailableByPreference = (teacher.preferences?.unavailableSlots || []).some(
        (slot) => slot.day === day && slot.timeSlot === timeSlot
      );
      
      const [busy, onLeave, weeklyLoad, dailyLoad] = await Promise.all([
        Timetable.exists({ teacher: teacher._id, day, timeSlot }),
        TeacherLeave.exists({ teacherId: teacher._id, status: 'Approved', startDate: { $lte: date }, endDate: { $gte: date } }),
        Timetable.countDocuments({ teacher: teacher._id }),
        Timetable.countDocuments({ teacher: teacher._id, day }),
      ]);
      
      const limit = teacher.preferences?.maxWorkload || teacher.max_hours_per_week || 40;
      const atLimit = weeklyLoad >= limit;
      
      let availabilityStatus = 'available';
      if (isUnavailableByPreference || busy) availabilityStatus = 'busy';
      else if (onLeave) availabilityStatus = 'on_leave';
      else if (atLimit) availabilityStatus = 'overloaded';
      
      candidatesMap.set(teacher._id.toString(), {
        ...teacher.toObject(),
        faculty_name: teacher.name, 
        teacherID: teacher.teacher_id,
        department: teacher.department?.department_name || teacher.department?.short_name || teacher.department?.short_name || '',
        yearsOfExperience: teacher.experience_years || 0,
        currentWorkload: weeklyLoad,
        dailyWorkload: dailyLoad,
        workloadLimit: limit,
        availabilityStatus,
        workloadWarning: weeklyLoad + 1 >= limit ? 'Approaching weekly workload limit' : null,
        is_primary_teacher: isPrimary,
        is_replacement: isReplacement
      });
    };

    for (const assignment of assignments) {
      if (assignment.teacher_id) {
        await processTeacher(assignment.teacher_id, assignment.is_primary_teacher, false);
      }
      
      if (assignment.replacement_priority && assignment.replacement_priority.length > 0) {
        for (const rp of assignment.replacement_priority) {
          if (rp.teacher_id) {
            await processTeacher(rp.teacher_id, false, true);
          }
        }
      }
    }
    
    const candidates = Array.from(candidatesMap.values());
    
    candidates.sort((a, b) => {
      if (a.is_primary_teacher && !b.is_primary_teacher) return -1;
      if (!a.is_primary_teacher && b.is_primary_teacher) return 1;
      return a.currentWorkload - b.currentWorkload || (a.faculty_name || '').localeCompare(b.faculty_name || '');
    });
    
    res.json({ success: true, data: candidates });
  } catch (error) { next(error); }
};

// @desc    Get all teachers (or filtered by departmentId/semesterId/subjectId)
// @route   GET /api/teachers
// @access  Private (Admin)
exports.getTeachers = async (req, res, next) => {
  const reqStart = Date.now();
  try {
    const { departmentId, semesterId, division, subjectId, day, timeSlot } = req.query;

    if (departmentId && semesterId && division) {
      const assignmentQuery = {
        department: departmentId,
        semester: semesterId,
        ...(subjectId ? { subject_id: subjectId } : {}),
      };
      if (division) {
        assignmentQuery.$or = [{ allowed_divisions: division }, { allowed_divisions: { $size: 0 } }];
      }

      const assignments = await TeacherSubjectMapping.find(assignmentQuery).populate('teacher_id');

      let validTeachers = [];

      for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i];
        if (!a.teacher_id) continue;
        const teacher = a.teacher_id;

        // Check global workload constraint
        const assignedHours = await Timetable.countDocuments({ teacher: teacher._id });
        const remainingHours = (teacher.max_hours_per_week || 0) - assignedHours;

        if (remainingHours <= 0) continue; // Teacher maxed out workload

        // Check slot context availability
        if (day && timeSlot) {
          const isBusy = await Timetable.exists({
            teacherId: teacher._id,
            day,
            timeSlot
          });
          if (isBusy) continue;
        }

        validTeachers.push({
          ...teacher.toObject(),
          remainingHours,
          assignedHours
        });
      }

      return res.json({ success: true, data: validTeachers });
    }

    const t0 = Date.now();
    const teachers = await Teacher.find().populate('subjects', 'subject_name subject_code').lean();
    const dbTeachersTime = Date.now() - t0;

    const User = require('../models/User');
    const Timetable = require('../models/Timetable');

    const teacherIds = teachers.map(t => t._id);
    const teacherIdStrings = teacherIds.map(id => id.toString());

    // Execute user accounts lookup and timetable aggregation in parallel
    const t1 = Date.now();
    const [linkedUsers, timetableCounts] = await Promise.all([
      User.find({
        $or: [
          { teacher_id: { $in: teacherIds } },
          { teacher_id: { $in: teacherIdStrings } }
        ]
      }).select('email username teacher_id').lean(),
      Timetable.aggregate([
        {
          $match: {
            $or: [
              { teacher: { $in: teacherIds } },
              { teacher: { $in: teacherIdStrings } }
            ]
          }
        },
        {
          $group: {
            _id: '$teacher',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    const parallelAggTime = Date.now() - t1;

    // Fast O(1) lookup maps
    const userMap = new Map();
    for (const u of linkedUsers) {
      if (u.teacher_id) {
        userMap.set(u.teacher_id.toString(), u);
      }
    }

    const assignedHoursMap = new Map();
    for (const item of timetableCounts) {
      if (item._id) {
        assignedHoursMap.set(item._id.toString(), item.count);
      }
    }

    for (let i = 0; i < teachers.length; i++) {
      const tidStr = teachers[i]._id.toString();
      teachers[i].userAccount = userMap.get(tidStr) || null;
      teachers[i].assignedSubjects = teachers[i].subjects || [];

      const assignedHours = assignedHoursMap.get(tidStr) || 0;
      teachers[i].assignedHours = assignedHours;
      teachers[i].max_hours_per_week = Number(teachers[i].max_hours_per_week) || Number(teachers[i].teaching_hours) || 0;
      teachers[i].teaching_hours = teachers[i].max_hours_per_week;
      teachers[i].remainingHours = Math.max(0, teachers[i].max_hours_per_week - assignedHours);

      // Ensure teacherID property exists for frontend
      teachers[i].teacherID = teachers[i].teacher_id;
      teachers[i].faculty_name = teachers[i].faculty_name || teachers[i].name;
    }

    const totalTime = Date.now() - reqStart;
    console.log(`[Teachers API] Loaded ${teachers.length} teachers in ${totalTime}ms (DB fetch: ${dbTeachersTime}ms, Aggregation: ${parallelAggTime}ms)`);

    res.json({ success: true, data: teachers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Private (Admin)
exports.getTeacherById = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ teacher });
  } catch (error) {
    next(error);
  }
};

exports.createTeacher = async (req, res, next) => {
  try {
    const { username, email, password, ...rest } = req.body;
    
    const User = require('../models/User');
    const Department = require('../models/Department');
    const mongoose = require('mongoose');

    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ error: 'User email already exists' });
      }
    }
    if (username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Normalize department
    let departmentId = rest.department || rest.departmentId;
    if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
      const deptDoc = await Department.findOne({
        $or: [{ department_name: departmentId }, { short_name: departmentId }]
      });
      if (deptDoc) departmentId = deptDoc._id;
    }

    const name = rest.name || rest.faculty_name || 'Faculty Member';
    const teacher_id = rest.teacher_id || rest.teacherID || (`T_${Date.now().toString().slice(-6)}`);
    const max_hours_per_week = Number(rest.max_hours_per_week || rest.teaching_hours || 20);
    const min_hours_per_week = Number(rest.min_hours_per_week || Math.floor(max_hours_per_week / 2) || 10);

    const teacherData = {
      ...rest,
      name,
      faculty_name: name,
      email: email ? email.toLowerCase() : rest.email,
      teacher_id,
      department: departmentId,
      max_hours_per_week,
      min_hours_per_week,
      teaching_hours: max_hours_per_week,
      status: rest.status || 'active'
    };

    const teacher = await Teacher.create(teacherData);

    // If login access details are provided, create corresponding User
    if (email) {
      await User.create({
        name,
        email: email.toLowerCase(),
        password: password || '123456',
        role: 'teacher',
        isVerified: true,
        teacher_id: teacher._id
      });
    }

    res.status(201).json({ message: 'Teacher created successfully', teacher, data: teacher });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Teacher ID or Email already exists' });
    }
    next(error);
  }
};

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private (Admin)
exports.updateTeacher = async (req, res, next) => {
  try {
    const { username, email, password, ...rest } = req.body;
    const Department = require('../models/Department');
    const mongoose = require('mongoose');

    let departmentId = rest.department || rest.departmentId;
    if (departmentId && !mongoose.Types.ObjectId.isValid(departmentId)) {
      const deptDoc = await Department.findOne({
        $or: [{ department_name: departmentId }, { short_name: departmentId }]
      });
      if (deptDoc) departmentId = deptDoc._id;
    }

    const updatePayload = { ...rest };
    if (rest.name || rest.faculty_name) {
      updatePayload.name = rest.name || rest.faculty_name;
      updatePayload.faculty_name = updatePayload.name;
    }
    if (rest.teacherID || rest.teacher_id) {
      updatePayload.teacher_id = rest.teacher_id || rest.teacherID;
    }
    if (email) {
      updatePayload.email = email.toLowerCase();
    }
    if (departmentId) {
      updatePayload.department = departmentId;
    }
    if (rest.teaching_hours || rest.max_hours_per_week) {
      updatePayload.max_hours_per_week = Number(rest.max_hours_per_week || rest.teaching_hours);
      updatePayload.teaching_hours = updatePayload.max_hours_per_week;
    }
    if (rest.min_hours_per_week) {
      updatePayload.min_hours_per_week = Number(rest.min_hours_per_week);
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Update or create linked User account
    const User = require('../models/User');
    let linkedUser = await User.findOne({ teacher_id: teacher._id });
    
    if (linkedUser) {
      if (email && email.toLowerCase() !== linkedUser.email) {
        const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: linkedUser._id } });
        if (emailExists) return res.status(400).json({ error: 'Email already in use' });
        linkedUser.email = email.toLowerCase();
      }
      if (updatePayload.name) {
        linkedUser.name = updatePayload.name;
      }
      if (password && password.trim() !== '') {
        linkedUser.password = password;
      }
      await linkedUser.save();
    } else if (email && password) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) return res.status(400).json({ error: 'Email already in use' });

      await User.create({
        name: updatePayload.name || teacher.name,
        username: username || email.split('@')[0],
        email: email.toLowerCase(),
        password,
        role: 'teacher',
        isVerified: true,
        teacher_id: teacher._id
      });
    }

    res.json({ message: 'Teacher updated successfully', teacher, data: teacher });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private (Admin)
exports.deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Delete associated user account
    const User = require('../models/User');
    await User.deleteMany({ teacher_id: req.params.id });
    
    // Delete associated teacher assignments
    const TeacherAssignment = require('../models/TeacherAssignment');
    const Subject = require('../models/Subject');
    await TeacherAssignment.deleteMany({ teacherId: req.params.id });
    await TeacherSubjectMapping.deleteMany({ teacher_id: req.params.id });
    await Subject.updateMany(
      { assignedTeachers: req.params.id },
      { $pull: { assignedTeachers: req.params.id } }
    );

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign subjects to teacher
// @route   PUT /api/teachers/:id/subjects
// @access  Private (Admin)
exports.assignSubjectsToTeacher = async (req, res, next) => {
  try {
    const { subjects } = req.body; // Array of subject ObjectIds
    const teacherId = req.params.id;
    const Subject = require('../models/Subject');
    const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');
    
    // Validate teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    // Find all new subjects
    const newSubjects = await Subject.find({ _id: { $in: subjects } });
    const newSubjectIds = newSubjects.map(s => s._id.toString());
    
    // Get existing assignments
    const existingAssignments = await TeacherSubjectMapping.find({ teacher_id: teacherId });
    const existingSubjectIds = [...new Set(existingAssignments.map(a => a.subject_id?.toString()).filter(Boolean))];

    // Delete assignments for subjects that are no longer assigned
    const subjectsToRemove = existingSubjectIds.filter(id => !newSubjectIds.includes(id));
    if (subjectsToRemove.length > 0) {
      await TeacherSubjectMapping.deleteMany({ teacher_id: teacherId, subject_id: { $in: subjectsToRemove } });
      
      // Update Subject teacherIds array
      await Subject.updateMany(
        { _id: { $in: subjectsToRemove } },
        { $pull: { assignedTeachers: teacherId } }
      );
    }

    // Add assignments for new subjects
    const subjectsToAdd = newSubjects.filter(s => !existingSubjectIds.includes(s._id.toString()));
    if (subjectsToAdd.length > 0) {
      const newAssignments = subjectsToAdd.map((subject, index) => ({
        mapping_id: `MAP-${teacherId}-${subject._id}`,
        teacher_id: teacherId,
        subject_id: subject._id,
        department: subject.department,
        semester: subject.semester,
        allowed_divisions: [],
        is_primary_teacher: index === 0,
        expertise_level: 'Intermediate',
        experience_with_subject: 0,
        replacement_priority: []
      }));
      const createdMappings = await TeacherSubjectMapping.insertMany(newAssignments);

      // Update Subject teacherIds array
      await Subject.updateMany(
        { _id: { $in: subjectsToAdd.map(s => s._id) } },
        { $addToSet: { assignedTeachers: teacherId } }
      );

      await Teacher.updateOne(
        { _id: teacherId },
        { $addToSet: { subjects: { $each: subjectsToAdd.map(s => s._id) } } }
      );
    }

    res.json({ success: true, message: 'Subjects assigned successfully' });
  } catch (error) {
    next(error);
  }
};

// GET /api/teachers/profile/:teacherId
exports.getTeacherProfile = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    
    // Check if the user is authorized to view this profile
    if (req.user.role !== 'admin' && req.user.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to view this profile' });
    }

    const teacher = await Teacher.findById(teacherId).populate('department', 'department_name short_name');
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Fetch assigned subjects
    const subjectsMapping = await TeacherSubjectMapping.find({ teacher_id: teacherId })
      .populate('subject_id', 'subject_name subject_code type credits')
      .populate('semester', 'semester_number')
      .populate('department', 'department_name short_name');
      
    // Reformat for the frontend
    const assignedSubjects = subjectsMapping.map(m => ({
      _id: m._id,
      subject_name: m.subject_id?.subject_name,
      subject_code: m.subject_id?.subject_code,
      semester: m.semester?.semester_number || 'N/A',
      department: m.department?.short_name || 'N/A',
      divisions: m.allowed_divisions || [],
      type: m.subject_id?.type
    }));

    // Reformat teacher data
    const profile = {
      teacher_id: teacher.teacher_id,
      name: teacher.faculty_name || teacher.name,
      email: teacher.email,
      mobile: teacher.mobile,
      department: teacher.department?.department_name || teacher.department?.short_name,
      designation: teacher.designation,
      experience: teacher.experience_years,
      weeklyWorkload: teacher.current_assigned_hours || 0,
      maxCapacity: teacher.preferences?.maxWorkload || teacher.max_hours_per_week || 40,
      availability: teacher.availability,
      assignedSubjects
    };

    res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};

// @desc    Import teachers from CSV
// @route   POST /api/teachers/import
// @access  Private (Admin)
exports.importTeachers = async (req, res, next) => {
  const csv = require('csv-parser');
  const fs = require('fs');

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', async () => {
        try {
          const ops = results.map(row => {
            const allowedDivisions = row.allowedDivisions
              ? row.allowedDivisions.split(',').map(d => d.trim()).filter(Boolean)
              : [];
            
            return {
              updateOne: {
                filter: { teacherID: row.teacherID || row.teacherId || row.TeacherID },
                update: {
                  $set: {
                    teacherID: row.teacherID || row.teacherId || row.TeacherID,
                    faculty_name: row.faculty_name || row.facultyName || row.TeacherName || row.faculty_name,
                    department: row.department || row.Department,
                    teaching_hours: Number(row.teaching_hours || row.teachingHours || row.TeachingHours || 0),
                    teacher_number: row.teacher_number || row.teacherNumber || row.TeacherNumber || "N/A",
                    classroom: row.classroom || row.Classroom || "N/A",
                    allowedDivisions: allowedDivisions
                  }
                },
                upsert: true
              }
            };
          }).filter(op => op.updateOne.filter.teacherID);

          if (ops.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, error: 'No valid teacher rows found in CSV' });
          }

          const result = await Teacher.bulkWrite(ops);
          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            message: 'Teachers imported successfully',
            data: {
              inserted: result.upsertedCount,
              updated: result.modifiedCount
            }
          });
        } catch (dbErr) {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          next(dbErr);
        }
      })
      .on('error', (err) => {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, error: 'Failed to parse CSV file' });
      });
  } catch (error) {
    next(error);
  }
};
