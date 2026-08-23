const express = require('express');
const router = express.Router();
const {
  getSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
} = require('../controllers/semesterController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getSemesters)
  .post(protect(true), createSemester);

router.route('/:id')
  .get(getSemesterById)
  .put(protect(true), updateSemester)
  .delete(protect(true), deleteSemester);

module.exports = router;
