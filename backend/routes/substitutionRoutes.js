const express = require('express');
const router = express.Router();
const { getSubstitutions, assignSubstitution, getSubstitutionById, getCandidates, regenerateCandidates } = require('../controllers/substitutionController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Gate all routes under admin role
router.use(protect());
router.use(authorizeRoles('admin'));

router.route('/')
  .get(getSubstitutions);

router.get('/:id/candidates', getCandidates);
router.post('/:id/regenerate', regenerateCandidates);
router.get('/:id', getSubstitutionById);

router.route('/:id/assign')
  .put(assignSubstitution);

module.exports = router;
