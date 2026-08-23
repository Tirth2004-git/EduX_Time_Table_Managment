const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const Classroom = require('../models/Classroom');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Division = require('../models/Division');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Timetable = require('../models/Timetable');

const classroomService = require('../services/classroomService');
const { getAvailableRooms } = require('../services/roomAvailability');
const {
  getClassrooms,
  getClassroomStats,
  getClassroomById,
  getClassroomSchedule,
  createClassroom,
  updateClassroom,
  deleteClassroom,
} = require('../controllers/classroomController');

test('Classroom Management & Timetable Integration Test Suite', async (t) => {
  let isConnected = false;
  try {
    await connectDB();
    isConnected = true;
  } catch (err) {
    t.skip('MongoDB connection not available');
    return;
  }

  // Test state
  let testDept;
  let testSem;
  let testDiv;
  let testTeacher;
  let testSubject;
  let createdRoomId;

  t.before(async () => {
    // Run reconciliation first
    await classroomService.reconcileClassroomData();

    // Create or find test references
    testDept =
      (await Department.findOne()) ||
      (await Department.create({
        department_name: 'QA Computer Science ' + Date.now(),
        short_name: 'QACS',
      }));

    testSem =
      (await Semester.findOne({ department: testDept._id })) ||
      (await Semester.create({
        department: testDept._id,
        semester_number: 1,
      }));

    testDiv =
      (await Division.findOne({ department: testDept._id })) ||
      (await Division.create({
        department: testDept._id,
        semester: testSem._id,
        division_name: 'QA-A',
        student_strength: 60,
      }));

    testTeacher =
      (await Teacher.findOne()) ||
      (await Teacher.create({
        faculty_name: 'Prof. QA Tester',
        email: `qa_prof_${Date.now()}@edux.test`,
        department: testDept.department_name,
      }));

    testSubject =
      (await Subject.findOne({ department: testDept._id })) ||
      (await Subject.create({
        subject_name: 'QA Software Engineering',
        subject_code: 'QASE101',
        department: testDept._id,
        semester: testSem._id,
        type: 'Theory',
      }));
  });

  t.after(async () => {
    // Clean up test created rooms
    await Classroom.deleteMany({ roomNumber: { $regex: /^QA_TEST_/ } });
  });

  await t.test('1. Database classrooms are reconciled and free of fake "N/A" strings', async () => {
    const classrooms = await Classroom.find().lean();
    assert.ok(classrooms.length >= 30, `Expected at least 30 classrooms, got ${classrooms.length}`);

    for (const room of classrooms) {
      assert.notEqual(room.roomNumber, 'N/A', 'roomNumber must not be N/A');
      assert.notEqual(room.building, 'N/A', 'building must not be N/A');
      assert.notEqual(room.floor, 'N/A', 'floor must not be N/A');
      assert.ok(typeof room.capacity === 'number' && room.capacity > 0, 'capacity must be positive number');
      assert.ok(['Available', 'In Use', 'Maintenance', 'Inactive'].includes(room.status), 'status must be valid enum');
    }
  });

  await t.test('2. getClassrooms controller returns clean objects without fake N/A', async () => {
    const req = { query: {} };
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await getClassrooms(req, res, next);
    assert.ok(jsonResult.success === true);
    assert.ok(Array.isArray(jsonResult.data));
    assert.ok(jsonResult.data.length > 0);

    const first = jsonResult.data[0];
    assert.notEqual(first.roomNumber, 'N/A');
    assert.notEqual(first.building, 'N/A');
    assert.notEqual(first.floor, 'N/A');
  });

  await t.test('3. getClassroomStats returns dynamic live aggregated statistics', async () => {
    const req = {};
    let jsonResult = null;
    const res = {
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await getClassroomStats(req, res, next);
    assert.ok(jsonResult.success === true);
    const stats = jsonResult.data;
    assert.ok(stats.totalClassrooms > 0);
    assert.ok(stats.availableClassrooms >= 0);
    assert.ok(stats.totalCapacity > 0);
    assert.ok(stats.theoryCount >= 0);
  });

  await t.test('4. createClassroom creates a valid classroom and enforces validation', async () => {
    const req = {
      body: {
        roomNumber: 'QA_TEST_301',
        roomName: 'QA Theory Room 301',
        building: 'Tech Block A',
        floor: '3',
        type: 'Classroom',
        capacity: 70,
        facilities: ['Projector', 'WiFi', 'AC'],
        status: 'Available',
      },
    };
    let jsonResult = null;
    let statusCode = 200;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await createClassroom(req, res, next);
    assert.equal(statusCode, 201);
    assert.ok(jsonResult.success === true);
    assert.equal(jsonResult.data.roomNumber, 'QA_TEST_301');
    assert.equal(jsonResult.data.capacity, 70);
    createdRoomId = jsonResult.data._id;
  });

  await t.test('5. createClassroom rejects duplicate room number in same building', async () => {
    const req = {
      body: {
        roomNumber: 'QA_TEST_301',
        building: 'Tech Block A',
        floor: '3',
        type: 'Classroom',
        capacity: 60,
      },
    };
    let jsonResult = null;
    let statusCode = 200;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await createClassroom(req, res, next);
    assert.equal(statusCode, 400);
    assert.ok(jsonResult.success === false);
    assert.ok(jsonResult.error.includes('already exists'));
  });

  await t.test('6. updateClassroom updates capacity, status, and facilities correctly', async () => {
    const req = {
      params: { id: createdRoomId },
      body: {
        capacity: 80,
        status: 'Maintenance',
        facilities: ['Projector', 'Smart Board', 'AC', 'WiFi'],
      },
    };
    let jsonResult = null;
    const res = {
      status: () => res,
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await updateClassroom(req, res, next);
    assert.ok(jsonResult.success === true);
    assert.equal(jsonResult.data.capacity, 80);
    assert.equal(jsonResult.data.status, 'Maintenance');
    assert.equal(jsonResult.data.available, false);
  });

  await t.test('7. getAvailableRooms excludes maintenance and occupied rooms', async () => {
    const result = await getAvailableRooms({
      day: 'Monday',
      timeSlot: '09:30-10:25',
      subjectType: 'Theory',
    });

    assert.ok(Array.isArray(result.rooms));
    // The maintenance room QA_TEST_301 must NOT appear in available rooms
    const foundMaintenance = result.rooms.find((r) => r.roomNumber === 'QA_TEST_301');
    assert.equal(foundMaintenance, undefined, 'Maintenance room must not be in available list');
  });

  await t.test('8. getClassroomSchedule returns accurate weekly timetable occupancy', async () => {
    const req = { params: { id: createdRoomId } };
    let jsonResult = null;
    const res = {
      status: () => res,
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await getClassroomSchedule(req, res, next);
    assert.ok(jsonResult.success === true);
    assert.ok(Array.isArray(jsonResult.data.schedule));
    assert.equal(jsonResult.data.totalAllocatedSlots, jsonResult.data.schedule.length);
  });

  await t.test('9. deleteClassroom prevents deletion when room is actively scheduled in timetable', async () => {
    // Create a temporary room and assign it in timetable
    const activeRoom = await Classroom.create({
      roomNumber: 'QA_TEST_IN_USE_99',
      building: 'Main Building',
      floor: '4',
      type: 'Classroom',
      capacity: 60,
    });

    const timetableEntry = await Timetable.create({
      department: testDept._id,
      semester: testSem._id,
      division: testDiv._id,
      day: 'Wednesday',
      timeSlot: '10:25-11:20',
      subject: testSubject._id,
      teacher: testTeacher._id,
      classroom: activeRoom._id,
      status: 'valid',
    });

    const req = { params: { id: activeRoom._id }, query: {} };
    let jsonResult = null;
    let statusCode = 200;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await deleteClassroom(req, res, next);
    assert.equal(statusCode, 400);
    assert.ok(jsonResult.success === false);
    assert.equal(jsonResult.canDeactivate, true);
    assert.ok(jsonResult.timetableUsage >= 1);

    // Clean up
    await Timetable.findByIdAndDelete(timetableEntry._id);
    await Classroom.findByIdAndDelete(activeRoom._id);
  });

  await t.test('10. deleteClassroom successfully deletes unassigned room or deactivates when requested', async () => {
    const unassignedRoom = await Classroom.create({
      roomNumber: 'QA_TEST_TEMP_DEL',
      building: 'Temp Block',
      floor: '1',
      type: 'Classroom',
      capacity: 30,
    });

    // Test deactivation query
    const deactReq = { params: { id: unassignedRoom._id }, query: { deactivate: 'true' } };
    let jsonResult = null;
    const res = {
      status: () => res,
      json: (data) => {
        jsonResult = data;
      },
    };
    const next = (err) => {
      if (err) throw err;
    };

    await deleteClassroom(deactReq, res, next);
    assert.ok(jsonResult.success === true);

    const checkDeactivated = await Classroom.findById(unassignedRoom._id);
    assert.equal(checkDeactivated.status, 'Inactive');
    assert.equal(checkDeactivated.isActive, false);

    // Test physical delete
    const delReq = { params: { id: unassignedRoom._id }, query: {} };
    await deleteClassroom(delReq, res, next);
    assert.ok(jsonResult.success === true);

    const checkDeleted = await Classroom.findById(unassignedRoom._id);
    assert.equal(checkDeleted, null);
  });
});
