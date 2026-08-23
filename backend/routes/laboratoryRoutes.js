const express = require('express');
const router = express.Router();
const {
  getLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
} = require('../controllers/laboratoryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getLaboratories)
  .post(protect(true), createLaboratory);

router.route('/:id')
  .get(getLaboratoryById)
  .put(protect(true), updateLaboratory)
  .delete(protect(true), deleteLaboratory);

module.exports = router;
