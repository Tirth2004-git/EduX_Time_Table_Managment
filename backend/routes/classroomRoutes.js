const express = require('express');
const router = express.Router();
const {
  getClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getAvailableRooms
} = require('../controllers/classroomController');

router.get('/available', getAvailableRooms);

router.route('/').get(getClassrooms).post(createClassroom);
router.route('/:id').get(getClassroomById).put(updateClassroom).delete(deleteClassroom);

module.exports = router;
