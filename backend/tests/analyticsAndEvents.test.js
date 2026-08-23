const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Ensure all referenced models are registered
require('../models/Department');
require('../models/Semester');
require('../models/Division');
require('../models/Organization');
require('../models/Event');
require('../models/EventRegistration');
require('../models/Payment');
require('../models/User');
require('../models/Teacher');
require('../models/Subject');
require('../models/Classroom');
require('../models/Timetable');

const connectDB = require('../config/db');
const { getAnalytics } = require('../controllers/analyticsController');
const { getAdminEvents, getAdminEventStats } = require('../controllers/eventController');

test('Analytics and Events Management Verifications', async (t) => {
  try {
    await connectDB();
  } catch (err) {
    t.skip('MongoDB connection not available');
    return;
  }

  try {
    // 1. Test Analytics with semester 4
    await t.test('Analytics - Semester 4 Query', async () => {
      const mockReq = { query: { semester: '4' } };
      let jsonResult = null;
      let statusCode = 200;
      const mockRes = {
        status: (code) => { statusCode = code; return { json: (d) => { jsonResult = d; } }; },
        json: (d) => { jsonResult = d; }
      };
      let nextError = null;
      const mockNext = (err) => { nextError = err; };

      await getAnalytics(mockReq, mockRes, mockNext);
      assert.equal(nextError, null, 'Should not throw CastError or any unhandled error');
      assert.equal(statusCode, 200);
      assert.equal(jsonResult.success, true);
      assert.equal(jsonResult.semester, 4);
      assert.ok(Array.isArray(jsonResult.teacherWorkload));
    });

    // 2. Test Analytics with invalid semester
    await t.test('Analytics - Invalid Semester Validation', async () => {
      const mockReq = { query: { semester: 'invalid_sem_99' } };
      let jsonResult = null;
      let statusCode = 200;
      const mockRes = {
        status: (code) => { statusCode = code; return { json: (d) => { jsonResult = d; } }; },
        json: (d) => { jsonResult = d; }
      };
      let nextError = null;
      const mockNext = (err) => { nextError = err; };

      await getAnalytics(mockReq, mockRes, mockNext);
      assert.equal(nextError, null, 'Should return clean 400 validation error without unhandled CastError');
      assert.equal(statusCode, 400);
      assert.equal(jsonResult.success, false);
    });

    // 3. Test Events Admin list and stats aggregation
    await t.test('Events - Admin Events and Stats Aggregation', async () => {
      const mockReq = { query: {} };
      let eventsResult = null;
      const mockResEvents = { json: (d) => { eventsResult = d; } };
      await getAdminEvents(mockReq, mockResEvents, (err) => { throw err; });

      assert.equal(eventsResult.success, true);
      assert.ok(Array.isArray(eventsResult.data));

      let statsResult = null;
      const mockResStats = { json: (d) => { statsResult = d; } };
      await getAdminEventStats(mockReq, mockResStats, (err) => { throw err; });

      assert.equal(statsResult.success, true);
      assert.ok(typeof statsResult.data.totalEvents === 'number');
      assert.ok(typeof statsResult.data.totalRegistrations === 'number');
      assert.ok(typeof statsResult.data.totalRevenue === 'number');
    });

  } finally {
    await mongoose.disconnect();
  }
});
