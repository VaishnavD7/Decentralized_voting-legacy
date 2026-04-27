const express = require('express');
const router = express.Router();
const relayerController = require('../controllers/relayerController');

router.post('/', relayerController.relayVote);

module.exports = router;
