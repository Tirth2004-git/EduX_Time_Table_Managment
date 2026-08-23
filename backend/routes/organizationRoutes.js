const express = require('express');
const router = express.Router();
const {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} = require('../controllers/organizationController');
const { protect } = require('../middleware/authMiddleware');
const { uploadImage } = require('../config/cloudinary');

// All organization routes require authentication
router.get('/', protect(), getOrganizations);
router.get('/:id', protect(), getOrganizationById);

// Admin-only management endpoints
router.post('/', protect(true), uploadImage.single('logo'), createOrganization);
router.put('/:id', protect(true), uploadImage.single('logo'), updateOrganization);
router.delete('/:id', protect(true), deleteOrganization);

module.exports = router;
