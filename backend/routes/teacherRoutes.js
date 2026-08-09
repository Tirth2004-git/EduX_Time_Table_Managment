const express = require('express');
const router = express.Router();
const { getTeachers, getEligibleTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher, importTeachers, assignSubjectsToTeacher, getTeacherProfile } = require('../controllers/teacherController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: 'uploads/' });

// Protect routes
router.use(protect());

// Profile route can be accessed by the teacher themselves
router.get('/profile/:teacherId', getTeacherProfile);

// Require admin authentication for other CRUD operations
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to access this route' });
  }
  next();
});

router.post('/import', upload.single('file'), importTeachers);
router.get('/eligible', getEligibleTeachers);

router.route('/')
  .get(getTeachers)
  .post(createTeacher);

router.route('/:id')
  .get(getTeacherById)
  .put(updateTeacher)
  .delete(deleteTeacher);

router.put('/:id/subjects', assignSubjectsToTeacher);

module.exports = router;
