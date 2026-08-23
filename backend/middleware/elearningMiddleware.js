const Subject = require('../models/Subject');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');

/**
 * Ensures the logged-in teacher is assigned to the subject in req.body.subject or req.params.subjectId
 */
const requireTeacherForSubject = async (req, res, next) => {
  try {
    const subjectId = req.body.subject || req.params.subjectId;
    if (!subjectId) {
      return res.status(400).json({ error: 'Subject ID is required' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (req.user.role === 'admin') {
      return next(); // Admins bypass
    }

    if (!req.user.teacherId) {
      return res.status(403).json({ error: 'Forbidden - User is not linked to a teacher record' });
    }

    const isAssignedDirect = Array.isArray(subject.assignedTeachers) && 
      subject.assignedTeachers.some(t => t.toString() === req.user.teacherId);
    
    const isAssignedMapping = await TeacherSubjectMapping.exists({ 
      teacher_id: req.user.teacherId, 
      subject_id: subjectId 
    });

    if (!isAssignedDirect && !isAssignedMapping) {
      return res.status(403).json({ error: 'Forbidden - You are not assigned to this subject' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error verifying subject access' });
  }
};

module.exports = { requireTeacherForSubject };
