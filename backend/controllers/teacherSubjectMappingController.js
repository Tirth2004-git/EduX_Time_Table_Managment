const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');

exports.createMapping = async (req, res, next) => {
  try {
    const { subject_id, department, semester, teacher_ids, primary_teacher_id, allowed_divisions } = req.body;

    if (!subject_id || !department || !semester) {
      return res.status(400).json({ error: 'Subject, department and semester are required.' });
    }

    // Delete existing mappings for this subject to replace them
    await TeacherSubjectMapping.deleteMany({ subject_id });

    if (!teacher_ids || teacher_ids.length === 0) {
      return res.json({ message: 'Mappings cleared for subject.' });
    }

    const newMappings = [];
    let mapIdCounter = Date.now();

    for (const tid of teacher_ids) {
      newMappings.push({
        mapping_id: `MAP${mapIdCounter++}`,
        teacher_id: tid,
        subject_id,
        department,
        semester,
        allowed_divisions: allowed_divisions || [],
        is_primary_teacher: tid === primary_teacher_id,
        expertise_level: 'Intermediate',
        experience_with_subject: 0,
        replacement_priority: []
      });
    }

    const created = await TeacherSubjectMapping.insertMany(newMappings);
    res.status(201).json({ message: 'Mappings created successfully', mappings: created });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectMappings = async (req, res, next) => {
  try {
    const { subject_id } = req.params;
    const mappings = await TeacherSubjectMapping.find({ subject_id })
      .populate('teacher_id', 'name email experience_years department')
      .populate('subject_id', 'subject_name subject_code');

    res.json({ mappings });
  } catch (error) {
    next(error);
  }
};

exports.getTeacherMappings = async (req, res, next) => {
  try {
    const { teacher_id } = req.params;
    const mappings = await TeacherSubjectMapping.find({ teacher_id })
      .populate('subject_id', 'subject_name subject_code type');
      
    res.json({ mappings });
  } catch (error) {
    next(error);
  }
};

exports.deleteMapping = async (req, res, next) => {
  try {
    const { mapping_id } = req.params;
    const mapping = await TeacherSubjectMapping.findOneAndDelete({
      $or: [{ _id: mapping_id }, { mapping_id }]
    });
    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    next(error);
  }
};
