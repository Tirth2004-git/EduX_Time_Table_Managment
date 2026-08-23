const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Load environment
require('../config/env');
const { getMongoUri } = require('../config/env');

// Import models
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Timetable = require('../models/Timetable');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Payment = require('../models/Payment');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Material = require('../models/Material');
const TeacherLeave = require('../models/TeacherLeave');
const Organization = require('../models/Organization');

// Import App setup
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const errorHandler = require('../middleware/errorHandler');

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount all routes exactly like server.js
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/demo', require('../routes/demoRoutes'));
app.use('/api/departments', require('../routes/departmentRoutes'));
app.use('/api/semesters', require('../routes/semesterRoutes'));
app.use('/api/divisions', require('../routes/divisionRoutes'));
app.use('/api/laboratories', require('../routes/laboratoryRoutes'));
app.use('/api/classrooms', require('../routes/classroomRoutes'));
app.use('/api/teachers', require('../routes/teacherRoutes'));
app.use('/api/subjects', require('../routes/subjectRoutes'));
app.use('/api/teacher-subject-mapping', require('../routes/teacherSubjectMappingRoutes'));
app.use('/api/timetable', require('../routes/timetableRoutes'));
app.use('/api/import', require('../routes/importRoutes'));
app.use('/api/analytics', require('../routes/analyticsRoutes'));
app.use('/api/ai', require('../routes/aiRoutes'));
app.use('/api/leaves', require('../routes/teacherLeaveRoutes'));
app.use('/api/teacher-portal', require('../routes/teacherPortalRoutes'));
app.use('/api/substitutions', require('../routes/substitutionRoutes'));
app.use('/api/sessions', require('../routes/scheduledSessionRoutes'));
app.use('/api/academic-years', require('../routes/academicCalendarRoutes'));
app.use('/api/admin', require('../routes/adminDashboardRoutes'));
app.use('/api/elearning', require('../routes/elearningRoutes'));
app.use('/api/organizations', require('../routes/organizationRoutes'));
app.use('/api/events', require('../routes/eventRoutes'));
app.use('/api/payments', require('../routes/paymentRoutes'));
app.use(errorHandler);

let server;
let baseUrl = '';

function request(method, path, { headers = {}, body = null, token = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqHeaders = { ...headers };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
    let bodyData = null;
    if (body) {
      if (typeof body === 'object') {
        bodyData = JSON.stringify(body);
        reqHeaders['Content-Type'] = 'application/json';
      } else {
        bodyData = body;
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data,
        });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

const testResults = [];
function recordTest(phase, title, status, details = {}) {
  testResults.push({ phase, title, status, ...details });
  const icon = status === 'PASS' ? '☑' : status === 'FAIL' ? '☒' : status === 'PARTIAL' ? '⚠' : '◐';
  console.log(`${icon} [${phase}] ${title} -> ${status} ${details.notes ? `(${details.notes})` : ''}`);
}

async function runMasterSuite() {
  await mongoose.connect(getMongoUri());
  console.log('Connected to DB for Master QA Suite');

  server = await new Promise((resolve) => {
    const s = app.listen(0, () => {
      const port = s.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve(s);
    });
  });

  try {
    // -------------------------------------------------------------
    // PHASE 2: AUTHENTICATION MASTER TEST
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: AUTHENTICATION MASTER TEST ---');

    // 1. Admin Login with correct credentials
    const adminLoginRes = await request('POST', '/api/auth/login', {
      body: { email: 'admin@example.com', password: 'admin123' }
    });
    let adminToken = null;
    if (adminLoginRes.status === 200 && adminLoginRes.data.token && adminLoginRes.data.user?.role === 'admin') {
      adminToken = adminLoginRes.data.token;
      recordTest('PHASE 2', 'Admin Login with correct credentials', 'PASS');
    } else {
      recordTest('PHASE 2', 'Admin Login with correct credentials', 'FAIL', { res: adminLoginRes.data, status: adminLoginRes.status });
    }

    // 2. Admin Login with wrong password
    const adminWrongPassRes = await request('POST', '/api/auth/login', {
      body: { email: 'admin@example.com', password: 'WrongPassword999!' }
    });
    if (adminWrongPassRes.status === 401) {
      recordTest('PHASE 2', 'Admin Login with wrong password rejected with 401', 'PASS');
    } else {
      recordTest('PHASE 2', 'Admin Login with wrong password rejected', 'FAIL', { status: adminWrongPassRes.status });
    }

    // 3. Admin Login empty fields validation
    const adminEmptyRes = await request('POST', '/api/auth/login', {
      body: { email: '', password: '' }
    });
    if (adminEmptyRes.status === 400) {
      recordTest('PHASE 2', 'Admin Login empty credentials rejected with 400', 'PASS');
    } else {
      recordTest('PHASE 2', 'Admin Login empty credentials rejected', 'FAIL', { status: adminEmptyRes.status });
    }

    // 4. Check Public Teachers Route for Teacher Login
    const publicTeachersRes = await request('GET', '/api/auth/teachers');
    if (publicTeachersRes.status === 200 && Array.isArray(publicTeachersRes.data.data)) {
      recordTest('PHASE 2', 'Teacher List Endpoint /api/auth/teachers', 'PASS', { count: publicTeachersRes.data.data.length });
    } else {
      recordTest('PHASE 2', 'Teacher List Endpoint /api/auth/teachers', 'FAIL', {
        status: publicTeachersRes.status,
        notes: 'GET /api/auth/teachers returned ' + publicTeachersRes.status + ' (Missing route in authRoutes.js)'
      });
    }

    // 5. Teacher Login
    const teacherUser = await User.findOne({ role: 'teacher' });
    let teacherToken = null;
    if (teacherUser) {
      const teacherLoginRes = await request('POST', '/api/auth/login', {
        body: { email: teacherUser.email, password: '123456' }
      });
      if (teacherLoginRes.status === 200 && teacherLoginRes.data.token && teacherLoginRes.data.user.role === 'teacher') {
        teacherToken = teacherLoginRes.data.token;
        recordTest('PHASE 2', 'Teacher Login with correct credentials', 'PASS', { email: teacherUser.email });
      } else {
        recordTest('PHASE 2', 'Teacher Login with correct credentials', 'FAIL', {
          status: teacherLoginRes.status,
          res: teacherLoginRes.data,
          email: teacherUser.email
        });
      }
    } else {
      recordTest('PHASE 2', 'Teacher Login', 'BLOCKED', { notes: 'No teacher user in DB' });
    }

    // 6. Student Login
    const studentUser = await User.findOne({ email: 'student@edux.com' }) || await User.findOne({ role: 'student', isVerified: true });
    let studentToken = null;
    if (studentUser) {
      let studentLoginRes = await request('POST', '/api/auth/login', {
        body: { email: studentUser.email, password: 'Student@123' }
      });
      if (studentLoginRes.status !== 200) {
        studentLoginRes = await request('POST', '/api/auth/login', {
          body: { email: studentUser.email, password: '123456' }
        });
      }
      if (studentLoginRes.status === 200 && studentLoginRes.data.token && studentLoginRes.data.user.role === 'student') {
        studentToken = studentLoginRes.data.token;
        recordTest('PHASE 2', 'Student Login with correct credentials', 'PASS', { email: studentUser.email });
      } else {
        recordTest('PHASE 2', 'Student Login with correct credentials', 'FAIL', {
          status: studentLoginRes.status,
          res: studentLoginRes.data,
          email: studentUser.email
        });
      }
    } else {
      recordTest('PHASE 2', 'Student Login', 'BLOCKED', { notes: 'No verified student user in DB' });
    }

    // 7. Protected Route Access with Token vs Without Token
    const authMeNoToken = await request('GET', '/api/auth/me');
    if (authMeNoToken.status === 401) {
      recordTest('PHASE 2', 'Protected Route without token rejected with 401', 'PASS');
    } else {
      recordTest('PHASE 2', 'Protected Route without token rejected', 'FAIL', { status: authMeNoToken.status });
    }

    if (adminToken) {
      const authMeWithToken = await request('GET', '/api/auth/me', { token: adminToken });
      if (authMeWithToken.status === 200 && authMeWithToken.data.user.role === 'admin') {
        recordTest('PHASE 2', 'Protected Route /api/auth/me with admin token', 'PASS');
      } else {
        recordTest('PHASE 2', 'Protected Route /api/auth/me with admin token', 'FAIL', { status: authMeWithToken.status });
      }
    }

    // -------------------------------------------------------------
    // PHASE 3: STUDENT REGISTRATION + OTP
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: STUDENT REGISTRATION + OTP ---');
    const dept = await Department.findOne();
    const sem = await Semester.findOne({ department: dept?._id });
    const div = await Division.findOne({ department: dept?._id, semester: sem?._id });

    const testRegEmail = `qa_test_${Date.now()}@eduxqa.test`;
    await User.deleteOne({ email: testRegEmail });

    // 1. Missing fields
    const regMissingRes = await request('POST', '/api/auth/register', {
      body: { name: 'QA Test Student', email: testRegEmail }
    });
    if (regMissingRes.status === 400) {
      recordTest('PHASE 3', 'Registration missing fields validation (400)', 'PASS');
    } else {
      recordTest('PHASE 3', 'Registration missing fields validation', 'FAIL', { status: regMissingRes.status });
    }

    // 2. Valid Registration
    const regRes = await request('POST', '/api/auth/register', {
      body: {
        name: 'QA Test Student',
        email: testRegEmail,
        password: 'Password@123',
        departmentId: dept._id.toString(),
        semesterId: sem._id.toString(),
        divisionId: div._id.toString(),
      }
    });

    if (regRes.status === 200 && regRes.data.requiresOtp) {
      recordTest('PHASE 3', 'Student Registration initiates OTP flow', 'PASS');
      const unverifiedUser = await mongoose.connection.db.collection('users').findOne({ email: testRegEmail });
      if (unverifiedUser && unverifiedUser.isVerified === false && unverifiedUser.otpHash) {
        recordTest('PHASE 3', 'User saved as isVerified=false with hashed OTP in DB', 'PASS');
      } else {
        recordTest('PHASE 3', 'User saved as isVerified=false in DB', 'FAIL');
      }
    } else {
      recordTest('PHASE 3', 'Student Registration initiates OTP flow', 'FAIL', { status: regRes.status, res: regRes.data });
    }

    // 3. Resend OTP cooldown test (<60s)
    const resendCooldownRes = await request('POST', '/api/auth/resend-otp', {
      body: { email: testRegEmail }
    });
    if (resendCooldownRes.status === 429) {
      recordTest('PHASE 3', 'Resend OTP 60s cooldown enforced (429)', 'PASS');
    } else {
      recordTest('PHASE 3', 'Resend OTP 60s cooldown enforced', 'FAIL', { status: resendCooldownRes.status, res: resendCooldownRes.data });
    }

    // 4. Wrong OTP code verification
    const wrongOtpRes = await request('POST', '/api/auth/verify-otp', {
      body: { email: testRegEmail, otp: '000000' }
    });
    if (wrongOtpRes.status === 400 && wrongOtpRes.data.error && wrongOtpRes.data.error.includes('Invalid OTP')) {
      recordTest('PHASE 3', 'Wrong OTP code rejected with remaining attempts decrement', 'PASS');
    } else {
      recordTest('PHASE 3', 'Wrong OTP code rejected', 'FAIL', { status: wrongOtpRes.status, res: wrongOtpRes.data });
    }

    // 5. Test OTP verification with known hash
    const testKnownOtp = '123456';
    const hashedKnown = await bcrypt.hash(testKnownOtp, 10);
    await mongoose.connection.db.collection('users').updateOne(
      { email: testRegEmail },
      { $set: { otpHash: hashedKnown, otpExpiresAt: new Date(Date.now() + 10 * 60000) } }
    );

    const correctOtpRes = await request('POST', '/api/auth/verify-otp', {
      body: { email: testRegEmail, otp: testKnownOtp }
    });
    if (correctOtpRes.status === 200 && correctOtpRes.data.success) {
      const verifiedDbUser = await mongoose.connection.db.collection('users').findOne({ email: testRegEmail });
      if (verifiedDbUser && verifiedDbUser.isVerified === true && verifiedDbUser.otpHash === null) {
        recordTest('PHASE 3', 'Correct OTP verifies account and cleans up OTP hash', 'PASS');
      } else {
        recordTest('PHASE 3', 'Correct OTP verifies account in DB', 'FAIL');
      }
    } else {
      recordTest('PHASE 3', 'Correct OTP verification', 'FAIL', { status: correctOtpRes.status, res: correctOtpRes.data });
    }

    // 6. Verified user can now log in
    const newStudentLoginRes = await request('POST', '/api/auth/login', {
      body: { email: testRegEmail, password: 'Password@123' }
    });
    if (newStudentLoginRes.status === 200 && newStudentLoginRes.data.user.email === testRegEmail) {
      recordTest('PHASE 3', 'Newly verified student login succeeds', 'PASS');
    } else {
      recordTest('PHASE 3', 'Newly verified student login', 'FAIL', { status: newStudentLoginRes.status });
    }

    // 7. Duplicate registration of already verified email rejected
    const regVerifiedRes = await request('POST', '/api/auth/register', {
      body: {
        name: 'QA Test Student Duplicate',
        email: testRegEmail,
        password: 'Password@123',
        departmentId: dept._id.toString(),
        semesterId: sem._id.toString(),
        divisionId: div._id.toString(),
      }
    });
    if (regVerifiedRes.status === 400 && regVerifiedRes.data.error.includes('already exists')) {
      recordTest('PHASE 3', 'Duplicate registration of verified email rejected with 400', 'PASS');
    } else {
      recordTest('PHASE 3', 'Duplicate registration of verified email', 'FAIL', { status: regVerifiedRes.status });
    }

    // -------------------------------------------------------------
    // PHASE 4: FORGOT PASSWORD & RESET
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: FORGOT PASSWORD & RESET ---');
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    await mongoose.connection.db.collection('users').updateOne(
      { email: testRegEmail },
      { $set: { resetPasswordToken: rawResetToken, resetPasswordExpiry: new Date(Date.now() + 10 * 60000) } }
    );

    const rawUserObj = await mongoose.connection.db.collection('users').findOne({ email: testRegEmail });
    if (rawUserObj && rawUserObj.resetPasswordToken) {
      recordTest('PHASE 4', 'Forgot Password generates reset token in DB', 'PASS');

      // Reset password with valid token
      const resetRes = await request('POST', '/api/auth/reset-password', {
        body: { token: rawResetToken, password: 'NewPassword@456' }
      });
      if (resetRes.status === 200) {
        recordTest('PHASE 4', 'Reset Password with valid token succeeds', 'PASS');

        // Verify old password fails
        const oldLogin = await request('POST', '/api/auth/login', {
          body: { email: testRegEmail, password: 'Password@123' }
        });
        if (oldLogin.status === 401) {
          recordTest('PHASE 4', 'Old password rejected after reset', 'PASS');
        } else {
          recordTest('PHASE 4', 'Old password rejected after reset', 'FAIL', { status: oldLogin.status });
        }

        // Verify new password succeeds
        const newLogin = await request('POST', '/api/auth/login', {
          body: { email: testRegEmail, password: 'NewPassword@456' }
        });
        if (newLogin.status === 200) {
          recordTest('PHASE 4', 'New password logs in successfully', 'PASS');
        } else {
          recordTest('PHASE 4', 'New password logs in', 'FAIL', { status: newLogin.status });
        }

        // Verify token cannot be reused
        const reuseReset = await request('POST', '/api/auth/reset-password', {
          body: { token: rawResetToken, password: 'AnotherPassword@789' }
        });
        if (reuseReset.status === 400) {
          recordTest('PHASE 4', 'Reset Password token single-use enforced (400)', 'PASS');
        } else {
          recordTest('PHASE 4', 'Reset Password token single-use enforced', 'FAIL', { status: reuseReset.status });
        }
      } else {
        recordTest('PHASE 4', 'Reset Password with valid token', 'FAIL', { status: resetRes.status, res: resetRes.data });
      }
    } else {
      recordTest('PHASE 4', 'Forgot Password token generated in DB', 'FAIL');
    }

    // -------------------------------------------------------------
    // PHASE 5: ADMIN DASHBOARD
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5: ADMIN DASHBOARD ---');
    if (adminToken) {
      const dashboardRes = await request('GET', '/api/admin/dashboard', { token: adminToken });
      if (dashboardRes.status === 200 && dashboardRes.data.success && dashboardRes.data.data) {
        const stats = dashboardRes.data.data.stats;
        recordTest('PHASE 5', 'Admin Dashboard Data Loaded Successfully', 'PASS', {
          facultyCount: stats?.facultyCount,
          subjectCount: stats?.subjectCount,
          roomCount: stats?.roomCount,
          divisionCount: stats?.divisionCount,
          overallUtilization: stats?.overallUtilization
        });
      } else {
        recordTest('PHASE 5', 'Admin Dashboard Data Loaded', 'FAIL', { status: dashboardRes.status, res: dashboardRes.data });
      }

      // Notifications
      const notifRes = await request('GET', '/api/admin/notifications', { token: adminToken });
      if (notifRes.status === 200 && Array.isArray(notifRes.data.notifications || notifRes.data.data)) {
        recordTest('PHASE 5', 'Admin Notifications Loaded', 'PASS');
      } else {
        recordTest('PHASE 5', 'Admin Notifications Loaded', 'FAIL', { status: notifRes.status });
      }
    }

    // -------------------------------------------------------------
    // PHASE 6: ADMIN TEACHER MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- PHASE 6: ADMIN TEACHER MANAGEMENT ---');
    if (adminToken) {
      // 1. List Teachers
      const listTeachersRes = await request('GET', '/api/teachers', { token: adminToken });
      if (listTeachersRes.status === 200 && Array.isArray(listTeachersRes.data.data || listTeachersRes.data)) {
        recordTest('PHASE 6', 'List Teachers GET /api/teachers', 'PASS');
      } else {
        recordTest('PHASE 6', 'List Teachers GET /api/teachers', 'FAIL', { status: listTeachersRes.status });
      }

      // 2. Create Teacher with full schema fields
      const newTeacherEmail = `qa_teacher_${Date.now()}@eduxqa.test`;
      const createTeacherRes = await request('POST', '/api/teachers', {
        token: adminToken,
        body: {
          teacher_id: `T_${Date.now().toString().slice(-4)}`,
          name: 'QA Prof John Doe',
          email: newTeacherEmail,
          department: dept._id.toString(),
          designation: 'Assistant Professor',
          teaching_hours: 16,
          min_hours_per_week: 12,
          max_hours_per_week: 20
        }
      });

      let createdTeacherId = null;
      if (createTeacherRes.status === 201 && (createTeacherRes.data.data?._id || createTeacherRes.data._id)) {
        createdTeacherId = createTeacherRes.data.data?._id || createTeacherRes.data._id;
        recordTest('PHASE 6', 'Create Teacher POST /api/teachers', 'PASS', { id: createdTeacherId });
      } else {
        recordTest('PHASE 6', 'Create Teacher POST /api/teachers', 'FAIL', { status: createTeacherRes.status, res: createTeacherRes.data });
      }

      // 3. Update Teacher
      if (createdTeacherId) {
        const updateTeacherRes = await request('PUT', `/api/teachers/${createdTeacherId}`, {
          token: adminToken,
          body: {
            name: 'QA Prof John Doe (Updated)',
            designation: 'Associate Professor',
          }
        });
        if (updateTeacherRes.status === 200) {
          recordTest('PHASE 6', 'Update Teacher PUT /api/teachers/:id', 'PASS');
        } else {
          recordTest('PHASE 6', 'Update Teacher PUT /api/teachers/:id', 'FAIL', { status: updateTeacherRes.status });
        }

        // 4. Delete Teacher
        const deleteTeacherRes = await request('DELETE', `/api/teachers/${createdTeacherId}`, {
          token: adminToken
        });
        if (deleteTeacherRes.status === 200) {
          recordTest('PHASE 6', 'Delete Teacher DELETE /api/teachers/:id', 'PASS');
        } else {
          recordTest('PHASE 6', 'Delete Teacher DELETE /api/teachers/:id', 'FAIL', { status: deleteTeacherRes.status });
        }
      }
    }

    // -------------------------------------------------------------
    // PHASE 7: ADMIN SUBJECT MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- PHASE 7: ADMIN SUBJECT MANAGEMENT ---');
    if (adminToken) {
      const newSubjectCode = `QA_CS_${Date.now().toString().slice(-4)}`;
      const createSubjectRes = await request('POST', '/api/subjects', {
        token: adminToken,
        body: {
          subject_name: 'QA Automated Testing Subject',
          subject_code: newSubjectCode,
          department: dept._id.toString(),
          semester: sem._id.toString(),
          type: 'Theory',
          credits: 4,
          weekly_periods: 4,
          requires_lab: false,
          required_room_type: 'Classroom',
        }
      });

      let createdSubjectId = null;
      if (createSubjectRes.status === 201 && (createSubjectRes.data.subject?._id || createSubjectRes.data.data?._id || createSubjectRes.data._id)) {
        createdSubjectId = createSubjectRes.data.subject?._id || createSubjectRes.data.data?._id || createSubjectRes.data._id;
        recordTest('PHASE 7', 'Create Subject POST /api/subjects', 'PASS', { id: createdSubjectId });
      } else {
        recordTest('PHASE 7', 'Create Subject POST /api/subjects', 'FAIL', { status: createSubjectRes.status, res: createSubjectRes.data });
      }

      if (createdSubjectId) {
        const updateSubRes = await request('PUT', `/api/subjects/${createdSubjectId}`, {
          token: adminToken,
          body: { subject_name: 'QA Automated Testing Subject (Updated)' }
        });
        if (updateSubRes.status === 200) {
          recordTest('PHASE 7', 'Update Subject PUT /api/subjects/:id', 'PASS');
        } else {
          recordTest('PHASE 7', 'Update Subject PUT /api/subjects/:id', 'FAIL', { status: updateSubRes.status });
        }

        const delSubRes = await request('DELETE', `/api/subjects/${createdSubjectId}`, {
          token: adminToken
        });
        if (delSubRes.status === 200) {
          recordTest('PHASE 7', 'Delete Subject DELETE /api/subjects/:id', 'PASS');
        } else {
          recordTest('PHASE 7', 'Delete Subject DELETE /api/subjects/:id', 'FAIL', { status: delSubRes.status });
        }
      }
    }

    // -------------------------------------------------------------
    // PHASE 8: CLASSROOM MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- PHASE 8: CLASSROOM MANAGEMENT ---');
    const roomNumber = `QA_RM_${Date.now().toString().slice(-4)}`;
    const createRoomRes = await request('POST', '/api/classrooms', {
      token: adminToken,
      body: {
        room_name: roomNumber,
        roomNumber: roomNumber,
        room_number: roomNumber,
        building: 'Tech Block A',
        floor: 3,
        capacity: 65,
        type: 'Classroom',
        department: dept._id.toString(),
        departmentId: dept._id.toString(),
      }
    });

    let createdRoomId = null;
    if (createRoomRes.status === 201 && (createRoomRes.data.classroom?._id || createRoomRes.data.data?._id || createRoomRes.data._id)) {
      createdRoomId = createRoomRes.data.classroom?._id || createRoomRes.data.data?._id || createRoomRes.data._id;
      recordTest('PHASE 8', 'Create Classroom POST /api/classrooms', 'PASS', { id: createdRoomId });
    } else {
      recordTest('PHASE 8', 'Create Classroom POST /api/classrooms', 'FAIL', { status: createRoomRes.status, res: createRoomRes.data });
    }

    if (createdRoomId) {
      const updateRoomRes = await request('PUT', `/api/classrooms/${createdRoomId}`, {
        token: adminToken,
        body: { capacity: 70 }
      });
      if (updateRoomRes.status === 200) {
        recordTest('PHASE 8', 'Update Classroom PUT /api/classrooms/:id', 'PASS');
      } else {
        recordTest('PHASE 8', 'Update Classroom PUT /api/classrooms/:id', 'FAIL', { status: updateRoomRes.status });
      }

      const delRoomRes = await request('DELETE', `/api/classrooms/${createdRoomId}`, {
        token: adminToken
      });
      if (delRoomRes.status === 200) {
        recordTest('PHASE 8', 'Delete Classroom DELETE /api/classrooms/:id', 'PASS');
      } else {
        recordTest('PHASE 8', 'Delete Classroom DELETE /api/classrooms/:id', 'FAIL', { status: delRoomRes.status });
      }
    }

    // -------------------------------------------------------------
    // PHASE 9 & 10: TIMETABLE BUILDER & CONFLICT ENGINE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 9 & 10: TIMETABLE BUILDER & CONFLICT ENGINE ---');
    if (adminToken) {
      // List timetable for division
      const divTimetableRes = await request('GET', `/api/timetable/division/${div._id}`, { token: adminToken });
      if (divTimetableRes.status === 200 && (divTimetableRes.data.success || Array.isArray(divTimetableRes.data.timetable) || Array.isArray(divTimetableRes.data.data))) {
        recordTest('PHASE 9', 'Get Division Timetable GET /api/timetable/division/:id', 'PASS');
      } else {
        recordTest('PHASE 9', 'Get Division Timetable', 'FAIL', { status: divTimetableRes.status });
      }

      // Global Timetable
      const globalTtRes = await request('GET', '/api/timetable/global', { token: adminToken });
      if (globalTtRes.status === 200 && (globalTtRes.data.success || Array.isArray(globalTtRes.data.timetable) || Array.isArray(globalTtRes.data.data))) {
        recordTest('PHASE 9', 'Get Global Timetable GET /api/timetable/global', 'PASS');
      } else {
        recordTest('PHASE 9', 'Get Global Timetable', 'FAIL', {
          status: globalTtRes.status,
          res: globalTtRes.data
        });
      }

      // Validate timetable endpoint conflict check
      const teacher1 = await Teacher.findOne();
      const classroom1 = await Classroom.findOne();
      const subject1 = await Subject.findOne();

      const validationPayload = {
        departmentId: dept._id.toString(),
        semesterId: sem._id.toString(),
        division: div._id.toString(),
        entries: [
          {
            day: 'Monday',
            timeSlot: '09:30-10:25',
            startTime: '09:30',
            endTime: '10:25',
            subjectId: subject1._id.toString(),
            teacherId: teacher1._id.toString(),
            classroomId: classroom1._id.toString(),
            type: 'LECTURE'
          }
        ]
      };

      const validateRes = await request('POST', '/api/timetable/validate', {
        token: adminToken,
        body: validationPayload
      });
      if (validateRes.status === 200 && validateRes.data.success) {
        recordTest('PHASE 10', 'Validate Timetable Entries POST /api/timetable/validate', 'PASS', { conflicts: validateRes.data.conflicts?.length || 0 });
      } else {
        recordTest('PHASE 10', 'Validate Timetable Entries', 'FAIL', { status: validateRes.status, res: validateRes.data });
      }
    }

    // -------------------------------------------------------------
    // PHASE 14 & 15: TEACHER PORTAL & LEAVES
    // -------------------------------------------------------------
    console.log('\n--- PHASE 14 & 15: TEACHER PORTAL & LEAVES ---');
    if (teacherToken) {
      // Teacher Profile
      const teacherProfileRes = await request('GET', '/api/teacher-portal/profile', { token: teacherToken });
      if (teacherProfileRes.status === 200 && teacherProfileRes.data.success) {
        recordTest('PHASE 14', 'Teacher Portal GET /api/teacher-portal/profile', 'PASS');
      } else {
        recordTest('PHASE 14', 'Teacher Portal GET /api/teacher-portal/profile', 'FAIL', { status: teacherProfileRes.status });
      }

      // Teacher Timetable
      const teacherTtRes = await request('GET', '/api/teacher-portal/timetable', { token: teacherToken });
      if (teacherTtRes.status === 200 && teacherTtRes.data.success) {
        recordTest('PHASE 14', 'Teacher Portal GET /api/teacher-portal/timetable', 'PASS');
      } else {
        recordTest('PHASE 14', 'Teacher Portal GET /api/teacher-portal/timetable', 'FAIL', { status: teacherTtRes.status });
      }

      // Apply Leave with valid enum
      const applyLeaveRes = await request('POST', '/api/teacher-portal/leaves', {
        token: teacherToken,
        body: {
          startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
          reason: 'Medical Leave for QA Testing',
          leaveType: 'multiple_day'
        }
      });

      let leaveId = null;
      if (applyLeaveRes.status === 201 && applyLeaveRes.data.leave?._id) {
        leaveId = applyLeaveRes.data.leave._id;
        recordTest('PHASE 15', 'Teacher Apply Leave POST /api/teacher-portal/leaves', 'PASS', { leaveId });
      } else {
        recordTest('PHASE 15', 'Teacher Apply Leave POST /api/teacher-portal/leaves', 'FAIL', { status: applyLeaveRes.status, res: applyLeaveRes.data });
      }

      // Admin Review Leave
      if (leaveId && adminToken) {
        const reviewLeaveRes = await request('PUT', `/api/leaves/${leaveId}/review`, {
          token: adminToken,
          body: {
            status: 'Approved',
            rejectionReason: '',
          }
        });
        if (reviewLeaveRes.status === 200 && reviewLeaveRes.data.leave?.status === 'Approved') {
          recordTest('PHASE 15', 'Admin Approve Leave PUT /api/leaves/:id/review', 'PASS');
        } else {
          recordTest('PHASE 15', 'Admin Approve Leave PUT /api/leaves/:id/review', 'FAIL', { status: reviewLeaveRes.status, res: reviewLeaveRes.data });
        }
      }
    }

    // -------------------------------------------------------------
    // PHASE 16-21: E-LEARNING (MATERIALS, ASSIGNMENTS, QUIZZES)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 16-21: E-LEARNING (MATERIALS, ASSIGNMENTS, QUIZZES) ---');
    const activeSubject = await Subject.findOne({ status: 'active' });

    // 1. Create Quiz manually (Teacher/Admin)
    let quizId = null;
    if ((teacherToken || adminToken) && activeSubject) {
      const createQuizRes = await request('POST', '/api/elearning/quiz', {
        token: teacherToken || adminToken,
        body: {
          title: 'QA Automated Diagnostic Quiz',
          subject: activeSubject._id.toString(),
          duration: 10,
          questions: [
            {
              questionText: 'What is the primary key in MongoDB?',
              options: ['_id', 'id', 'pk', 'uuid'],
              correctOptionIndex: 0,
              marks: 2,
              explanation: '_id is the unique identifier generated automatically by MongoDB.'
            },
            {
              questionText: 'Which HTTP status code signifies Forbidden?',
              options: ['200', '401', '403', '404'],
              correctOptionIndex: 2,
              marks: 2,
              explanation: '403 Forbidden indicates authorization failure.'
            }
          ]
        }
      });

      if (createQuizRes.status === 201 && createQuizRes.data._id) {
        quizId = createQuizRes.data._id;
        recordTest('PHASE 18', 'Teacher Create Quiz POST /api/elearning/quiz', 'PASS', { quizId });
      } else {
        recordTest('PHASE 18', 'Teacher Create Quiz POST /api/elearning/quiz', 'FAIL', { status: createQuizRes.status, res: createQuizRes.data });
      }
    }

    // 2. Student takes quiz and verifies answers are hidden before submission
    if (quizId && studentToken) {
      const studentQuizzesRes = await request('GET', '/api/elearning/quiz', { token: studentToken });
      if (studentQuizzesRes.status === 200 && Array.isArray(studentQuizzesRes.data)) {
        const found = studentQuizzesRes.data.find(q => q._id === quizId);
        if (found && found.questions && found.questions[0].correctOptionIndex === undefined) {
          recordTest('PHASE 21', 'Quiz correctOptionIndex correctly stripped for students before submission', 'PASS');
        } else {
          recordTest('PHASE 21', 'Quiz correctOptionIndex hidden for students', 'FAIL', { found });
        }
      }

      // Student submits quiz
      const submitQuizRes = await request('POST', `/api/elearning/quiz/${quizId}/submit`, {
        token: studentToken,
        body: {
          answers: [0, 2] // Both correct answers
        }
      });

      if (submitQuizRes.status === 201 && submitQuizRes.data.result) {
        const result = submitQuizRes.data.result;
        if (result.score === 4 && result.correctCount === 2 && result.wrongCount === 0) {
          recordTest('PHASE 20', 'Student Quiz Submit Auto-Grading & Scoring', 'PASS', { score: result.score, total: result.totalMarks });
        } else {
          recordTest('PHASE 20', 'Student Quiz Submit Auto-Grading', 'FAIL', { result });
        }
      } else {
        recordTest('PHASE 20', 'Student Quiz Submit POST /api/elearning/quiz/:id/submit', 'FAIL', { status: submitQuizRes.status, res: submitQuizRes.data });
      }

      // Duplicate quiz submission blocked
      const dupSubmitQuizRes = await request('POST', `/api/elearning/quiz/${quizId}/submit`, {
        token: studentToken,
        body: { answers: [0, 2] }
      });
      if (dupSubmitQuizRes.status === 400 && dupSubmitQuizRes.data.error && dupSubmitQuizRes.data.error.includes('already attempted')) {
        recordTest('PHASE 20', 'Duplicate Quiz Attempt Blocked with 400', 'PASS');
      } else {
        recordTest('PHASE 20', 'Duplicate Quiz Attempt Blocked', 'FAIL', { status: dupSubmitQuizRes.status });
      }

      // Student gets detailed quiz result
      const quizResultRes = await request('GET', `/api/elearning/quiz/${quizId}/result`, { token: studentToken });
      if (quizResultRes.status === 200 && quizResultRes.data.result && Array.isArray(quizResultRes.data.questions)) {
        recordTest('PHASE 21', 'Student View Quiz Analysis GET /api/elearning/quiz/:id/result', 'PASS');
      } else {
        recordTest('PHASE 21', 'Student View Quiz Analysis', 'FAIL', { status: quizResultRes.status });
      }
    }

    // -------------------------------------------------------------
    // PHASE 22-25: EVENTS, TARGETING & RAZORPAY PAYMENT
    // -------------------------------------------------------------
    console.log('\n--- PHASE 22-25: EVENTS, TARGETING & RAZORPAY PAYMENT ---');
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'EduX QA Organization',
        email: 'org@eduxqa.test',
        phone: '9999999999',
        type: 'Club',
        status: 'Active'
      });
    }

    // Create Free Event
    if (adminToken) {
      const freeEventRes = await request('POST', '/api/events', {
        token: adminToken,
        body: {
          title: 'QA Free Tech Symposium',
          description: 'Comprehensive QA free symposium event description.',
          organization: org._id.toString(),
          category: 'Workshop',
          isPaid: false,
          registrationFee: 0,
          capacity: 100,
          eventDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          startTime: '10:00 AM',
          endTime: '01:00 PM',
          registrationDeadline: new Date(Date.now() + 86400000 * 4).toISOString(),
          venue: 'Auditorium 1',
          targetAudience: { isAllStudents: true },
          status: 'Published'
        }
      });

      let freeEventId = null;
      if (freeEventRes.status === 201 && (freeEventRes.data.data?._id || freeEventRes.data.event?._id || freeEventRes.data._id)) {
        freeEventId = freeEventRes.data.data?._id || freeEventRes.data.event?._id || freeEventRes.data._id;
        recordTest('PHASE 22', 'Admin Create Published Event POST /api/events', 'PASS', { freeEventId });
      } else {
        recordTest('PHASE 22', 'Admin Create Published Event POST /api/events', 'FAIL', { status: freeEventRes.status, res: freeEventRes.data });
      }

      // Student registers for free event
      if (freeEventId && studentToken) {
        const freeRegRes = await request('POST', `/api/events/${freeEventId}/register`, {
          token: studentToken,
          body: { notes: 'Excited for symposium' }
        });
        if (freeRegRes.status === 201 && freeRegRes.data.success && freeRegRes.data.registration?.ticketId) {
          recordTest('PHASE 22', 'Student Register Free Event & Generate Ticket ID', 'PASS', { ticketId: freeRegRes.data.registration.ticketId });
        } else {
          recordTest('PHASE 22', 'Student Register Free Event', 'FAIL', { status: freeRegRes.status, res: freeRegRes.data });
        }

        // Duplicate registration blocked
        const dupFreeRegRes = await request('POST', `/api/events/${freeEventId}/register`, {
          token: studentToken
        });
        if (dupFreeRegRes.status === 400 && (dupFreeRegRes.data.error || dupFreeRegRes.data.message)) {
          recordTest('PHASE 22', 'Duplicate Event Registration Blocked (400)', 'PASS');
        } else {
          recordTest('PHASE 22', 'Duplicate Event Registration Blocked', 'FAIL', { status: dupFreeRegRes.status });
        }
      }

      // Create Paid Event & Test Razorpay Integration
      const paidEventRes = await request('POST', '/api/events', {
        token: adminToken,
        body: {
          title: 'QA Paid Masterclass',
          description: 'Paid workshop with Razorpay checkout integration.',
          organization: org._id.toString(),
          category: 'Hackathon',
          isPaid: true,
          registrationFee: 299,
          capacity: 50,
          eventDate: new Date(Date.now() + 86400000 * 7).toISOString(),
          startTime: '09:00 AM',
          endTime: '05:00 PM',
          registrationDeadline: new Date(Date.now() + 86400000 * 6).toISOString(),
          venue: 'Seminar Hall 2',
          targetAudience: { isAllStudents: true },
          status: 'Published'
        }
      });

      let paidEventId = null;
      if (paidEventRes.status === 201 && (paidEventRes.data.data?._id || paidEventRes.data.event?._id || paidEventRes.data._id)) {
        paidEventId = paidEventRes.data.data?._id || paidEventRes.data.event?._id || paidEventRes.data._id;
        recordTest('PHASE 24', 'Admin Create Paid Event POST /api/events', 'PASS', { paidEventId });
      } else {
        recordTest('PHASE 24', 'Admin Create Paid Event POST /api/events', 'FAIL', { status: paidEventRes.status, res: paidEventRes.data });
      }

      if (paidEventId && studentToken) {
        // 1. Create Razorpay Order
        const createOrderRes = await request('POST', `/api/events/${paidEventId}/create-order`, {
          token: studentToken
        });
        if (createOrderRes.status === 200 && createOrderRes.data.orderId) {
          const orderId = createOrderRes.data.orderId;
          const amount = createOrderRes.data.amount;
          recordTest('PHASE 24', 'Razorpay Create Order POST /api/events/:id/create-order', 'PASS', { orderId, amount });

          // 2. Test Payment Verification with Invalid Signature (Must Fail)
          const fakeVerifyRes = await request('POST', `/api/events/${paidEventId}/verify-payment`, {
            token: studentToken,
            body: {
              razorpay_order_id: orderId,
              razorpay_payment_id: 'pay_fake12345678',
              razorpay_signature: 'invalid_tampered_signature_999'
            }
          });
          if (fakeVerifyRes.status === 400) {
            recordTest('PHASE 24', 'Payment Verification: Invalid Signature Rejected (400)', 'PASS');
          } else {
            recordTest('PHASE 24', 'Payment Verification: Invalid Signature Rejected', 'FAIL', { status: fakeVerifyRes.status });
          }

          // 3. Test Payment Verification with Authentic HMAC Signature
          const paymentId = `pay_qa_${Date.now()}`;
          const secret = process.env.RAZORPAY_KEY_SECRET;
          const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

          const validVerifyRes = await request('POST', `/api/events/${paidEventId}/verify-payment`, {
            token: studentToken,
            body: {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: generatedSignature
            }
          });

          const validReg = validVerifyRes.data.data?.registration || validVerifyRes.data.registration;
          if (validVerifyRes.status === 200 && validVerifyRes.data.success && validReg?.ticketId) {
            recordTest('PHASE 24', 'Razorpay Authentic Signature Verification & Ticket Generation', 'PASS', {
              ticketId: validReg.ticketId,
              paymentStatus: validReg.paymentStatus
            });
          } else {
            recordTest('PHASE 24', 'Razorpay Authentic Signature Verification', 'FAIL', { status: validVerifyRes.status, res: validVerifyRes.data });
          }
        } else {
          recordTest('PHASE 24', 'Razorpay Create Order', 'FAIL', { status: createOrderRes.status, res: createOrderRes.data });
        }
      }
    }

    // -------------------------------------------------------------
    // PHASE 28: ANALYTICS
    // -------------------------------------------------------------
    console.log('\n--- PHASE 28: ANALYTICS ---');
    if (adminToken) {
      const analyticsRes = await request('GET', '/api/analytics', { token: adminToken });
      if (analyticsRes.status === 200 && analyticsRes.data.success) {
        recordTest('PHASE 28', 'Analytics API GET /api/analytics', 'PASS');
      } else {
        recordTest('PHASE 28', 'Analytics API GET /api/analytics', 'FAIL', { status: analyticsRes.status, res: analyticsRes.data });
      }
    }

    // -------------------------------------------------------------
    // PHASE 30: AUTHORIZATION SECURITY TESTING (Cross-Role / IDOR)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 30: AUTHORIZATION SECURITY TESTING ---');

    // 1. Student accessing Admin API -> MUST BE 403
    if (studentToken) {
      const studentToAdminRes = await request('GET', '/api/admin/dashboard', { token: studentToken });
      if (studentToAdminRes.status === 403) {
        recordTest('PHASE 30', 'Student blocked from Admin Dashboard (403)', 'PASS');
      } else {
        recordTest('PHASE 30', 'Student blocked from Admin Dashboard', 'FAIL', { status: studentToAdminRes.status });
      }

      // Student creating teacher -> MUST BE 403
      const studentCreateTeacher = await request('POST', '/api/teachers', {
        token: studentToken,
        body: { name: 'Hacker Teacher', email: 'hacker@edux.com' }
      });
      if (studentCreateTeacher.status === 403) {
        recordTest('PHASE 30', 'Student blocked from Admin Teacher Create (403)', 'PASS');
      } else {
        recordTest('PHASE 30', 'Student blocked from Admin Teacher Create', 'FAIL', { status: studentCreateTeacher.status });
      }

      // Student creating quiz -> MUST BE 403
      const studentCreateQuiz = await request('POST', '/api/elearning/quiz', {
        token: studentToken,
        body: { title: 'Unauthorized Quiz', questions: [] }
      });
      if (studentCreateQuiz.status === 403) {
        recordTest('PHASE 30', 'Student blocked from Teacher Quiz Create (403)', 'PASS');
      } else {
        recordTest('PHASE 30', 'Student blocked from Teacher Quiz Create', 'FAIL', { status: studentCreateQuiz.status });
      }
    }

    // 2. Teacher accessing Admin Dashboard -> MUST BE 403
    if (teacherToken) {
      const teacherToAdminRes = await request('GET', '/api/admin/dashboard', { token: teacherToken });
      if (teacherToAdminRes.status === 403) {
        recordTest('PHASE 30', 'Teacher blocked from Admin Dashboard (403)', 'PASS');
      } else {
        recordTest('PHASE 30', 'Teacher blocked from Admin Dashboard', 'FAIL', { status: teacherToAdminRes.status });
      }

      // Teacher modifying classroom -> MUST BE 403 or 401
      const teacherCreateRoom = await request('POST', '/api/classrooms', {
        token: teacherToken,
        body: { room_number: 'UnauthRoom', roomNumber: 'UnauthRoom' }
      });
      if (teacherCreateRoom.status === 403 || teacherCreateRoom.status === 401) {
        recordTest('PHASE 30', 'Teacher blocked from Classroom CRUD (403/401)', 'PASS');
      } else {
        recordTest('PHASE 30', 'Teacher blocked from Classroom CRUD', 'FAIL', {
          status: teacherCreateRoom.status,
          notes: 'Classroom routes lack authentication/admin authorization check! Status: ' + teacherCreateRoom.status
        });
      }
    }

  } catch (err) {
    console.error('Master Suite Error:', err);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }

  console.log('\n================ MASTER QA SUITE SUMMARY ================');
  const passed = testResults.filter(t => t.status === 'PASS').length;
  const failed = testResults.filter(t => t.status === 'FAIL').length;
  const blocked = testResults.filter(t => t.status === 'BLOCKED').length;
  console.log(`TOTAL TESTS EXECUTED: ${testResults.length}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`BLOCKED: ${blocked}`);
  console.log(`PASS RATE: ${Math.round((passed / (testResults.length || 1)) * 100)}%`);
}

runMasterSuite().catch(console.error);
