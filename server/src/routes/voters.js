const express = require('express');
const router = express.Router();
const voterController = require('../controllers/voterController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public routes (or protected?)
router.get('/', voterController.getAllVoters);
router.get('/:walletAddress', voterController.getVoter);

// Admin routes
// TODO: Add admin check middleware
router.patch('/:walletAddress/status', protect, adminOnly, voterController.updateVoterStatus);
router.patch('/:walletAddress/role', protect, adminOnly, voterController.updateVoterRole);
router.delete('/:walletAddress', protect, adminOnly, voterController.deleteVoter);
router.put('/:walletAddress', protect, voterController.updateVoterProfile); // Self-update allowed (but protected)

module.exports = router;
