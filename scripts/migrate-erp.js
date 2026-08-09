/**
 * EduX academic-year migration script.
 *
 * Usage: node scripts/migrate-erp.js
 */
require('dotenv').config();
const connectDB = require('../backend/config/db');
const AcademicYear = require('../backend/models/AcademicYear');

async function migrate() {
  await connectDB();
  console.log('🔄 Starting EduX academic-year migration...');

  let year = await AcademicYear.findOne({ isCurrent: true });
  if (!year) {
    const now = new Date();
    const start = new Date(now.getFullYear(), 5, 1);
    const end = new Date(now.getFullYear() + 1, 4, 31);
    year = await AcademicYear.create({
      name: `${now.getFullYear()}-${now.getFullYear() + 1}`,
      startDate: start,
      endDate: end,
      isCurrent: true,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      semesters: [
        { name: 'Semester 1', termNumber: 1, startDate: start, endDate: new Date(now.getFullYear(), 10, 30) },
        { name: 'Semester 2', termNumber: 2, startDate: new Date(now.getFullYear(), 11, 1), endDate: end },
      ],
    });
    console.log('✅ Created academic year:', year.name);
  }

  console.log('🎉 Migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
