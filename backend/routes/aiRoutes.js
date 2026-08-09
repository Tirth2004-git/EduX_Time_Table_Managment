const express = require('express');
const router = express.Router();
const { suggestReplacement } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Gated by admin role verification
router.post('/replacement', protect(true), suggestReplacement);

module.exports = router;
