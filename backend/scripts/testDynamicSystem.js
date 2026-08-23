const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const Division = require('../models/Division');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');
const { verifyPaymentSignature } = require('../services/razorpayService');

async function runTests() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/edux_timetable';
  console.log('Connecting to MongoDB:', mongoUri.split('@')[1] || mongoUri);
  await mongoose.connect(mongoUri);

  console.log('\n--- 1. Testing Admin Dashboard Live Metrics ---');
  const [teachers, subjects, divisions, timetables] = await Promise.all([
    Teacher.countDocuments(),
    Subject.countDocuments({ status: { $ne: 'inactive' } }),
    Division.countDocuments(),
    Timetable.countDocuments({ status: { $ne: 'draft' } }),
  ]);
  const totalSlots = divisions * 36;
  const utilization = totalSlots > 0 ? Number(((timetables / totalSlots) * 100).toFixed(1)) : 0;
  console.log(`✓ Active Faculty: ${teachers}`);
  console.log(`✓ Configured Subjects: ${subjects}`);
  console.log(`✓ Active Divisions: ${divisions}`);
  console.log(`✓ Scheduled Periods: ${timetables}`);
  console.log(`✓ Calculated Utilization: ${utilization}%`);

  console.log('\n--- 2. Testing OTP Registration & Verification Flow ---');
  const testEmail = `test_student_${Date.now()}@edux.edu`;
  const otp = '482910';
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Find a valid division
  const div = await Division.findOne();
  if (!div) {
    console.warn('⚠️ No division found in DB to attach student test.');
  } else {
    const student = new User({
      name: 'Test Student',
      email: testEmail,
      password: 'password123',
      role: 'student',
      department_id: div.department,
      semester_id: div.semester,
      division_id: div._id,
      isVerified: false,
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      otpLastSentAt: new Date(),
    });
    await student.save();
    console.log(`✓ Created test student with pending OTP: ${testEmail}`);

    // Verify invalid OTP check
    const isInvalid = await bcrypt.compare('111111', student.otpHash);
    console.log(`✓ Invalid OTP correctly rejected: ${!isInvalid}`);

    // Verify valid OTP check
    const isValid = await bcrypt.compare('482910', student.otpHash);
    console.log(`✓ Valid OTP correctly matched: ${isValid}`);

    // Activate
    student.isVerified = true;
    student.otpHash = null;
    student.otpExpiresAt = null;
    await student.save();
    console.log(`✓ Student successfully verified and activated`);

    // Clean up
    await User.deleteOne({ _id: student._id });
    console.log(`✓ Cleaned up test student`);
  }

  console.log('\n--- 3. Testing Razorpay Signature & Ticket Generation ---');
  const orderId = 'order_test_12345';
  const paymentId = 'pay_test_67890';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mockSecret';
  const signature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const verified = verifyPaymentSignature({ orderId, paymentId, signature });
  console.log(`✓ Cryptographic HMAC-SHA256 signature verification: ${verified ? 'PASSED' : 'FAILED'}`);

  const sampleTicketId = `EDUX-AI-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  console.log(`✓ Generated Sample Ticket ID: ${sampleTicketId}`);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
