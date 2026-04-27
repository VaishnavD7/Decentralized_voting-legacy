const express = require('express');
const router = express.Router();
const controller = require('../controllers/electionController');

router.post('/', controller.createElection);
router.get('/', controller.getElections);
router.post('/:id/votes', require('../middleware/authMiddleware').protect, controller.recordVote);
router.post('/candidates', controller.addCandidate);

module.exports = router;
