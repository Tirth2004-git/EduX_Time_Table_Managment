const express = require('express');
const router = express.Router();
const { suggestReplacement, explainTimetableDiagnostics } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Gated by admin role verification
router.post('/replacement', protect(true), suggestReplacement);
router.post('/explain', protect(true), explainTimetableDiagnostics);

module.exports = router;
