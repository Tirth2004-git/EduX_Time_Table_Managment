const express = require('express');
const router = express.Router();
const {
  createMapping,
  getSubjectMappings,
  getTeacherMappings,
  deleteMapping,
} = require('../controllers/teacherSubjectMappingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect());

router.post('/create', createMapping);
router.get('/subject/:subject_id', getSubjectMappings);
router.get('/teacher/:teacher_id', getTeacherMappings);
router.delete('/:mapping_id', deleteMapping);

module.exports = router;
