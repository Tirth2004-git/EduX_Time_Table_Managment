const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const TeacherSubjectMapping = require('../models/TeacherSubjectMapping');

/**
 * Automap missing teacher-subject mappings.
 */
async function autoMapTeachersToSubjects() {
  const subjects = await Subject.find().lean();
  const teachers = await Teacher.find().lean();
  const existingMappings = await TeacherSubjectMapping.find().lean();

  const mappedSubjectIds = new Set(
    existingMappings
      .map(m => m.subject_id || m.subject || m.subjectId)
      .filter(Boolean)
      .map(id => id.toString())
  );

  const newMappings = [];
  let mapIdCounter = existingMappings.length + 1;

  for (const subject of subjects) {
    if (mappedSubjectIds.has(subject._id.toString())) {
      continue;
    }

    // Find teachers in the same department
    const eligibleTeachers = teachers.filter(t => t.department && t.department.toString() === subject.department.toString());
    
    // Sort teachers (this can be improved with expertise matching)
    eligibleTeachers.sort((a, b) => (a.assignedHours || 0) - (b.assignedHours || 0));

    if (eligibleTeachers.length > 0) {
      const primaryTeacher = eligibleTeachers[0];
      
      const mapping = {
        mapping_id: `MAP${String(mapIdCounter).padStart(5, '0')}`,
        teacher_id: primaryTeacher._id,
        subject_id: subject._id,
        department: subject.department,
        semester: subject.semester,
        allowed_divisions: ['A', 'B', 'C', 'D'], // default allowing common divisions
        is_primary_teacher: true,
        expertise_level: 'Expert',
        experience_with_subject: 0,
        replacement_priority: eligibleTeachers.slice(1, 3).map((t, idx) => ({
          teacher_id: t._id,
          priority_score: 90 - (idx * 5),
          reason: 'Same department matching'
        }))
      };

      newMappings.push(mapping);
      mapIdCounter++;

      await Subject.updateOne({ _id: subject._id }, { $addToSet: { assignedTeachers: primaryTeacher._id } });
      await Teacher.updateOne({ _id: primaryTeacher._id }, { $addToSet: { subjects: subject._id } });
    }
  }

  if (newMappings.length > 0) {
    await TeacherSubjectMapping.insertMany(newMappings);
    console.log(`Successfully mapped ${newMappings.length} subjects to teachers.`);
  } else {
    console.log(`No unmapped subjects found or no eligible teachers available for mapping.`);
  }

  return newMappings;
}

module.exports = { autoMapTeachersToSubjects };
