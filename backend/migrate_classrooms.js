const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edux_timetable';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Classroom = require('./models/Classroom');
    const Division = require('./models/Division');
    const Semester = require('./models/Semester');

    // 1. Fetch unmapped classrooms
    const unmappedClassrooms = await Classroom.find({ departmentId: { $exists: false } });
    console.log(`Found ${unmappedClassrooms.length} unmapped classrooms.`);
    
    if (unmappedClassrooms.length === 0) {
      console.log('No unmapped classrooms found. Exiting.');
      process.exit(0);
    }

    // 2. Fetch all divisions with their department and semester ObjectIds
    const divisions = await Division.find({}).populate('semester');
    console.log(`Found ${divisions.length} divisions.`);

    if (divisions.length === 0) {
      console.log('No divisions found to map to. Exiting.');
      process.exit(0);
    }

    let mappedCount = 0;
    
    // We have 30 classrooms and many divisions. Let's round-robin assign them.
    for (let i = 0; i < divisions.length; i++) {
      const division = divisions[i];
      const classroom = unmappedClassrooms[i % unmappedClassrooms.length];

      // Create a cloned record mapped strictly to the division
      const newRoomName = `${classroom.room_name} - ${division.division_name}`;
      
      const payload = {
        departmentId: division.department,
        semesterId: division.semester._id,
        divisionId: division._id,
        className: 'Mapped Class',
        academicYearId: '2026-27',
        capacity: classroom.capacity,
        type: classroom.type,
        available: true,
        room_id: `M_${classroom.room_id}_${i}`,
        room_name: newRoomName
      };

      await Classroom.create(payload);
      mappedCount++;
    }

    // Now delete the old floating classrooms so they don't clutter
    const unmappedIds = unmappedClassrooms.map(c => c._id);
    await Classroom.deleteMany({ _id: { $in: unmappedIds } });

    console.log(`Successfully mapped ${mappedCount} classrooms to divisions.`);
    
    // Test fetch IT Semester 3 Division A
    const itSem3DivA = await Division.findOne({ division_name: 'A' }).populate('department').populate('semester');
    if (itSem3DivA) {
      const mapped = await Classroom.findOne({ divisionId: itSem3DivA._id });
      console.log('Example mapped classroom for a division:', mapped);
    }
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
