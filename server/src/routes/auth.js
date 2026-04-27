const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/send-sms', authController.sendSms);
router.post('/verify-sms', authController.verifySms);
router.get('/me', protect, authController.me);
router.get('/config', (req, res) => {
    res.json({ adminWallet: process.env.ADMIN_WALLET || '' });
});

module.exports = router;
