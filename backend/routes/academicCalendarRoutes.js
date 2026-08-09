const express = require('express');
const router = express.Router();
const {
  getAcademicYears,
  createAcademicYear,
  getCurrentAcademicYear,
  updateAcademicYear,
} = require('../controllers/academicCalendarController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect());
router.use(authorizeRoles('admin'));

router.get('/current', getCurrentAcademicYear);
router.route('/').get(getAcademicYears).post(createAcademicYear);
router.put('/:id', updateAcademicYear);

module.exports = router;
