const express = require('express');
const router = express.Router();
const {
  getDivisions,
  getDivisionById,
  createDivision,
  updateDivision,
  deleteDivision,
} = require('../controllers/divisionController');

router.route('/').get(getDivisions).post(createDivision);
router.route('/:id').get(getDivisionById).put(updateDivision).delete(deleteDivision);

module.exports = router;
