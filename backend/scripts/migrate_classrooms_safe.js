const mongoose = require('mongoose');
require('dotenv').config();
const { getMongoUri } = require('../config/env');

const Classroom = require('../models/Classroom');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');

async function migrate() {
  try {
    await mongoose.connect(getMongoUri());
    console.log('Connected to MongoDB for safe classroom migration');

    // Find classrooms that likely use legacy fields (program/semester/division) or have wrong types
    const candidates = await Classroom.find({
      $or: [
        { departmentId: { $exists: false } },
        { departmentId: { $type: 'string' } },
        { semesterId: { $exists: false } },
        { semesterId: { $type: 'string' } }
      ]
    }).lean();

    console.log(`Found ${candidates.length} classroom documents to examine`);

    let updated = 0;
    for (const c of candidates) {
      try {
        // Extract legacy values
        const prog = c.program || c.department || c.department_name;
        const semRaw = c.semester || c.semester_number || c.semesterId;
        const divRaw = c.division || c.division_name || c.division_id || c.divisionId;

        if (!prog) {
          console.log(`Skipping ${c._id} - no program info`);
          continue;
        }

        // Find department by matching name, short_name, or code
        const dept = await Department.findOne({
          $or: [
            { department_name: prog },
            { short_name: prog },
            { name: prog },
            { code: prog }
          ]
        }).lean();

        if (!dept) {
          console.log(`No department found matching '${prog}' for classroom ${c._id}`);
          continue;
        }

        // Find semester for this department
        let semObj = null;
        if (semRaw) {
          // semRaw might be a number or string number
          const semNum = Number(semRaw);
          if (!Number.isNaN(semNum)) {
            semObj = await Semester.findOne({ department: dept._id, semester_number: semNum }).lean();
          }
        }
        // fallback: pick a reasonable semester if none matched (skip if not found)
        if (!semObj) {
          semObj = await Semester.findOne({ department: dept._id }).lean();
        }

        if (!semObj) {
          console.log(`No semester object found for dept ${dept._id} when migrating classroom ${c._id}`);
          continue;
        }

        // Find division matching
        let divObj = null;
        if (divRaw) {
          divObj = await Division.findOne({ department: dept._id, semester: semObj._id, $or: [ { division_name: divRaw }, { division_id: divRaw }, { _id: divRaw } ] }).lean();
        }
        if (!divObj) {
          // fallback to any division in that semester
          divObj = await Division.findOne({ department: dept._id, semester: semObj._id }).lean();
        }

        if (!divObj) {
          console.log(`No division found for dept ${dept._id} sem ${semObj._id} when migrating classroom ${c._id}`);
          continue;
        }

        // Build update payload
        const payload = {};
        if (!c.departmentId || String(c.departmentId) !== String(dept._id)) payload.departmentId = dept._id;
        if (!c.semesterId || String(c.semesterId) !== String(semObj._id)) payload.semesterId = semObj._id;
        if (!c.divisionId || String(c.divisionId) !== String(divObj._id)) payload.divisionId = divObj._id;
        if (!c.academicYearId && (c.year || c.academic_year)) payload.academicYearId = c.year || c.academic_year;

        if (Object.keys(payload).length === 0) {
          console.log(`No updates required for classroom ${c._id}`);
          continue;
        }

        await Classroom.findByIdAndUpdate(c._id, payload, { new: true, runValidators: false });
        updated++;
        console.log(`Updated classroom ${c._id} with dept ${dept._id}, sem ${semObj._id}, div ${divObj._id}`);

      } catch (err) {
        console.error(`Failed to migrate classroom ${c._id}:`, err.message);
      }
    }

    console.log(`Migration finished. Updated ${updated} classrooms.`);
  } catch (err) {
    console.error('Safe migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrate();
