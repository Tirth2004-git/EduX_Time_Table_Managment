const express = require('express');
const router = express.Router();
const {
  getSessions,
  getTeacherSessions,
  getSessionById,
  cancelSession,
} = require('../controllers/scheduledSessionController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect());

router.get('/my', getTeacherSessions);
router.get('/teacher/:teacherId', authorizeRoles('admin'), getTeacherSessions);
router.get('/', authorizeRoles('admin'), getSessions);
router.patch('/:id/cancel', authorizeRoles('admin'), cancelSession);
router.get('/:id', getSessionById);

module.exports = router;
