const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getTimetable,
  getLeaves,
  applyLeave,
  cancelLeave,
  getWorkload,
  getNotifications,
  markNotificationRead,
  getProfile,
} = require('../controllers/teacherPortalController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Gate all routes under teacher role
router.use(protect());
router.use(authorizeRoles('teacher'));

router.get('/dashboard', getDashboard);
router.get('/timetable', getTimetable);
router.get('/workload', getWorkload);
router.get('/profile', getProfile);

router.route('/leaves')
  .get(getLeaves)
  .post(applyLeave);

router.delete('/leaves/:id', cancelLeave);


router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

module.exports = router;
