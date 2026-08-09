const express = require('express');
const router = express.Router();
const {
  getLaboratories,
  getLaboratoryById,
  createLaboratory,
  updateLaboratory,
  deleteLaboratory,
} = require('../controllers/laboratoryController');

router.route('/').get(getLaboratories).post(createLaboratory);
router.route('/:id').get(getLaboratoryById).put(updateLaboratory).delete(deleteLaboratory);

module.exports = router;
