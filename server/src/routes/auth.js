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

// EMERGENCY WIPE (Specific Wallet)
router.get('/emergency-wipe/:wallet', async (req, res) => {
    const { query } = require('../config/db');
    const wallet = req.params.wallet.toLowerCase();
    await query('DELETE FROM voters WHERE wallet_address = $1', [wallet]);
    res.send(`Identity ${wallet} Purged from Matrix. You can now re-register.`);
});

// MASTER RESET (Delete All Data)
router.get('/master-reset-database', async (req, res) => {
    try {
        const { query } = require('../config/db');
        await query('DELETE FROM voters');
        await query('DELETE FROM otps');
        await query('DELETE FROM mobile_otps');
        // If there are elections, we keep the contract logic but clear the cache if any
        res.send("<h1>Database Purged Successfully</h1><p>All voters and temporary codes have been deleted. You can now start fresh.</p>");
    } catch (err) {
        res.status(500).send("Reset failed: " + err.message);
    }
});

module.exports = router;
