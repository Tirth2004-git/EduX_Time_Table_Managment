/**
 * Repairs legacy curriculum data created before subjects carried their
 * program/semester context and before TeacherAssignment stored subjectId.
 *
 * It is safe to re-run. Context is only inferred when a subject's timetable
 * history names exactly one program; ambiguous records are reported, never
 * guessed. Run: npm run migrate-subject-assignments
 */
require('dotenv').config();
const connectDB = require('../backend/config/db');
const Subject = require('../backend/models/Subject');
const Timetable = require('../backend/models/Timetable');
const TeacherAssignment = require('../backend/models/TeacherAssignment');

async function ensureContextualSubjectIndex() {
  const indexes = await Subject.collection.indexes();
  const legacyIndex = indexes.find((index) =>
    index.name === 'subject_code_1' && index.unique && Object.keys(index.key).length === 1
  );
  if (legacyIndex) await Subject.collection.dropIndex(legacyIndex.name);
  const contextualIndex = indexes.find((index) =>
    index.name === 'program_1_semester_1_subject_code_1'
  );
  if (contextualIndex && !contextualIndex.unique) {
    await Subject.collection.dropIndex(contextualIndex.name);
  }
  await Subject.collection.createIndex(
    { program: 1, semester: 1, subject_code: 1 },
    { unique: true, name: 'program_1_semester_1_subject_code_1' }
  );
}

async function migrate() {
  await connectDB();
  await ensureContextualSubjectIndex();

  const subjects = await Subject.find({}).select('_id program department semester teacherId teacherIds');
  let contextsBackfilled = 0;
  let mappingsCreated = 0;
  const unresolved = [];

  for (const subject of subjects) {
    let program = subject.program || subject.department;
    if (!program) {
      const programs = await Timetable.distinct('program', { subjectId: subject._id, program: { $nin: [null, ''] } });
      if (programs.length === 1) {
        program = programs[0];
        subject.program = program;
        subject.department = program;
        await subject.save();
        contextsBackfilled += 1;
      } else {
        unresolved.push({ subjectId: subject._id.toString(), programs });
        continue;
      }
    }

    if (!subject.semester) {
      unresolved.push({ subjectId: subject._id.toString(), reason: 'missing semester' });
      continue;
    }

    const timetableTeachers = await Timetable.distinct('teacherId', {
      subjectId: subject._id,
      program,
      semester: subject.semester,
      teacherId: { $ne: null },
    });
    const teacherIds = [...new Set([
      ...(subject.teacherIds || []).map(String),
      ...(subject.teacherId ? [String(subject.teacherId)] : []),
      ...timetableTeachers.map(String),
    ])];

    if (teacherIds.length) {
      subject.teacherIds = teacherIds;
      subject.teacherId = teacherIds[0];
      await subject.save();
    }
    for (const teacherId of teacherIds) {
      const result = await TeacherAssignment.updateOne(
        { teacherId, subjectId: subject._id, program, semester: subject.semester, division: null },
        { $setOnInsert: { teacherId, subjectId: subject._id, program, semester: subject.semester, division: null } },
        { upsert: true }
      );
      mappingsCreated += result.upsertedCount;
    }
  }

  console.log(JSON.stringify({ contextsBackfilled, mappingsCreated, unresolved }, null, 2));
  process.exit(0);
}

migrate().catch((error) => {
  console.error('Subject curriculum migration failed:', error);
  process.exit(1);
});
