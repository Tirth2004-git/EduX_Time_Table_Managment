const express = require('express');
const router = express.Router();
const {
  saveGeneratedTimetable,
  validateGeneratedTimetable,
  getDivisionTimetable,
  getStudentTimetable: getStudentTimetableEntry,
  getTeacherTimetable,
  getAvailableStudentTimetables,
  getPublishedStudentTimetable
} = require('../controllers/timetableEntryController');
const {
  listTimetable,
  addTimetableEntry,
  deleteTimetableEntry,
  getGlobalTimetable,
  saveWeeklyTimetable,
  getWeeklyTimetable,
  resetTimetable,
  setHoliday,
  suggestSlot,
  validateTimetableRoute,
  autoGenerateRoute,
  smartGenerateRoute,
  getWeeklyConfig,
  getTimetablePreview,
  moveSlot,
  copyTimetable,
  updateTeacher,
  shareTimetable,
  getSharedTimetable,
  validateSlotChange,
  getReplacementFaculty,
  checkMoveSafety,
  suggestSlotFix,
  getAuditLogs,
  undoAction,
  redoAction,
  getStudentTimetable,
  getAvailableFaculty,
  getAvailableRooms
} = require('../controllers/timetableController');
const { protect } = require('../middleware/authMiddleware');
const { saveLimiter, generateLimiter } = require('../middleware/rateLimiter');

// Public read-only shared timetable
router.get('/shared/:token', getSharedTimetable);

// Auth required for all other timetable operations
router.use(protect());

// Student timetable is resolved from the authenticated user.  No student id
// from the browser is trusted for this endpoint.
router.get('/student/me', getStudentTimetableEntry);
router.get('/student/available', getAvailableStudentTimetables);
router.get('/student/view', getPublishedStudentTimetable);

// New DB Persistence Routes
router.post('/generate', protect(true), saveGeneratedTimetable);
// A draft uses the same validated persistence format as a generated timetable.
router.post('/draft', protect(true), saveGeneratedTimetable);
router.get('/division/:id', getDivisionTimetable);
router.get('/teacher/:id', getTeacherTimetable);

router.get('/list', listTimetable);
router.get('/global', getGlobalTimetable);
router.get('/preview', getTimetablePreview);
router.get('/weekly-config', getWeeklyConfig);

// Admin-only operations
router.post('/add', protect(true), addTimetableEntry);
router.delete('/delete', protect(true), deleteTimetableEntry);
router.route('/save')
  .get(protect(true), getWeeklyTimetable)
  .post(protect(true), saveLimiter, saveWeeklyTimetable);
router.delete('/reset', protect(true), resetTimetable);
router.post('/set-holiday', protect(true), setHoliday);
router.post('/suggest-slot', protect(true), suggestSlot);
router.post('/validate', protect(true), validateGeneratedTimetable);
router.post('/auto-generate', protect(true), generateLimiter, autoGenerateRoute);
router.post('/smart-generate', protect(true), generateLimiter, smartGenerateRoute);
router.patch('/move', protect(true), moveSlot);
router.post('/copy', protect(true), copyTimetable);
router.patch('/update-teacher', protect(true), updateTeacher);
router.post('/share', protect(true), shareTimetable);

// New Slot management routes
router.get('/available-faculty/:subjectId', protect(true), getAvailableFaculty);
router.get('/available-rooms', protect(true), getAvailableRooms);
router.post('/validate-change', protect(true), validateSlotChange);
router.post('/replacement-eligibility', protect(true), getReplacementFaculty);
router.post('/move-check', protect(true), checkMoveSafety);
router.post('/suggest-fix', protect(true), suggestSlotFix);
router.get('/audit-logs', protect(true), getAuditLogs);
router.post('/history/undo', protect(true), undoAction);
router.post('/history/redo', protect(true), redoAction);

module.exports = router;
