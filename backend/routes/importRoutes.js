const express = require('express');
const router = express.Router();
const multer = require('multer');
const { importExcel } = require('../controllers/importController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Admin only route for bulk Excel upload
router.post('/excel', protect(true), upload.single('file'), importExcel);

module.exports = router;
