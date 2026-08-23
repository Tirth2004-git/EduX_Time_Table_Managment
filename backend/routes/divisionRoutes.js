const express = require('express');
const router = express.Router();
const {
  getDivisions,
  getDivisionById,
  createDivision,
  updateDivision,
  deleteDivision,
} = require('../controllers/divisionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getDivisions)
  .post(protect(true), createDivision);

router.route('/:id')
  .get(getDivisionById)
  .put(protect(true), updateDivision)
  .delete(protect(true), deleteDivision);

module.exports = router;
