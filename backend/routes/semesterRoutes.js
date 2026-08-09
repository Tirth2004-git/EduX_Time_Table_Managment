const express = require('express');
const router = express.Router();
const {
  getSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
} = require('../controllers/semesterController');

router.route('/').get(getSemesters).post(createSemester);
router.route('/:id').get(getSemesterById).put(updateSemester).delete(deleteSemester);

module.exports = router;
