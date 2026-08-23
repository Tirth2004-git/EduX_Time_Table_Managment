const express = require('express');
const router = express.Router();
const {
  getClassrooms,
  getClassroomStats,
  getClassroomById,
  getClassroomSchedule,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  reconcileClassrooms,
  getAvailableRooms,
} = require('../controllers/classroomController');
const { protect } = require('../middleware/authMiddleware');

// Specific endpoints before parameter routes
router.get('/stats', protect(), getClassroomStats);
router.get('/available', protect(), getAvailableRooms);
router.post('/reconcile', protect(true), reconcileClassrooms);

router
  .route('/')
  .get(protect(), getClassrooms)
  .post(protect(true), createClassroom);

router.get('/:id/schedule', protect(), getClassroomSchedule);

router
  .route('/:id')
  .get(protect(), getClassroomById)
  .put(protect(true), updateClassroom)
  .delete(protect(true), deleteClassroom);

module.exports = router;
