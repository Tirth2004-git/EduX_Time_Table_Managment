const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getAdminNotifications,
  markAdminNotificationRead,
  seedAcademicData,
} = require('../controllers/adminDashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(protect());
router.use(authorizeRoles('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/notifications', getAdminNotifications);
router.put('/notifications/:id/read', markAdminNotificationRead);
router.post('/seed', seedAcademicData);

module.exports = router;
