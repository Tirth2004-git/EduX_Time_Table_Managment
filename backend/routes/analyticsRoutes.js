const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Gated by admin auth check
router.get('/', protect(true), getAnalytics);

module.exports = router;
