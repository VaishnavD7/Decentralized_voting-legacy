const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', settingsController.getSettings);
router.patch('/', protect, adminOnly, settingsController.updateSettings);

module.exports = router;
