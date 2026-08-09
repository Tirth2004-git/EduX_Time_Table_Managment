const express = require('express');
const router = express.Router();
const { getLeaves, createLeave, deleteLeave, reviewLeave, getLeaveImpact } = require('../controllers/teacherLeaveController');
const { protect } = require('../middleware/authMiddleware');

// Lock all leaves routes behind admin permission
router.use(protect(true));

router.route('/')
  .get(getLeaves)
  .post(createLeave);

router.route('/:id')
  .delete(deleteLeave);

router.get('/:id/impact', getLeaveImpact);
router.put('/:id/review', reviewLeave);

module.exports = router;
