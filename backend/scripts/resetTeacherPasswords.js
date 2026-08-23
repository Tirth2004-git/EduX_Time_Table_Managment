const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Teacher = require('../models/Teacher');

async function resetTeacherPasswords() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // 1. Hash the requested development password "123456" with 10 salt rounds
    const plainPassword = '123456';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 2. Fetch all existing Teacher records and teacher User accounts
    const allTeachers = await Teacher.find().lean();
    const existingTeacherUsers = await User.find({ role: 'teacher' });

    console.log(`\nFound ${existingTeacherUsers.length} existing teacher User accounts in database.`);
    console.log(`Found ${allTeachers.length} total Teacher faculty profiles in database.`);

    let updatedCount = 0;
    let createdCount = 0;

    // 3. Update all existing User accounts with role: 'teacher'
    for (const teacherUser of existingTeacherUsers) {
      await User.updateOne(
        { _id: teacherUser._id },
        { $set: { password: hashedPassword, isVerified: true } }
      );
      updatedCount++;
      console.log(`  ✓ Updated password for teacher user: ${teacherUser.email} (${teacherUser.name})`);
    }

    // 4. Ensure every faculty profile in the Teacher collection has a corresponding User account
    for (const teacher of allTeachers) {
      const email = teacher.email || `${teacher.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@college.edu`;
      
      const userExists = await User.findOne({
        $or: [
          { teacher_id: teacher._id },
          { email: email.toLowerCase() }
        ]
      });

      if (!userExists) {
        await User.create({
          name: teacher.name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'teacher',
          teacher_id: teacher._id,
          isVerified: true
        });
        createdCount++;
        console.log(`  + Created new teacher user account for: ${email} (${teacher.name})`);
      }
    }

    const totalActiveTeacherAccounts = await User.countDocuments({ role: 'teacher' });

    console.log('\n==================================================');
    console.log('✅ TEACHER PASSWORDS RESET COMPLETE');
    console.log(`- Teacher accounts updated: ${updatedCount}`);
    if (createdCount > 0) {
      console.log(`- Teacher accounts provisioned: ${createdCount}`);
    }
    console.log(`- Total teacher accounts ready: ${totalActiveTeacherAccounts}`);
    console.log(`- Hashing method: bcrypt (10 rounds)`);
    console.log(`- Password field updated: password`);
    console.log(`- Common development teacher password: ${plainPassword}`);
    console.log('- Admin and student credentials remain completely untouched.');
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Error resetting teacher passwords:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

if (require.main === module) {
  resetTeacherPasswords();
}

module.exports = resetTeacherPasswords;
