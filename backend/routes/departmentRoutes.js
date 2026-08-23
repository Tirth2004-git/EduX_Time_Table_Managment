const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getDepartments)
  .post(protect(true), createDepartment);

router.route('/:id')
  .get(getDepartmentById)
  .put(protect(true), updateDepartment)
  .delete(protect(true), deleteDepartment);

module.exports = router;
