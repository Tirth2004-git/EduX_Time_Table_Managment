const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');

router.route('/').get(getDepartments).post(createDepartment);
router.route('/:id').get(getDepartmentById).put(updateDepartment).delete(deleteDepartment);

module.exports = router;
