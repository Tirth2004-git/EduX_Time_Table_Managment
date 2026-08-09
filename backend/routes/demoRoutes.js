const express = require('express');
const { getDemoTeachers, loginAsDemoTeacher } = require('../controllers/demoController');

const router = express.Router();
router.get('/teachers', getDemoTeachers);
router.post('/teacher-login', loginAsDemoTeacher);

module.exports = router;
