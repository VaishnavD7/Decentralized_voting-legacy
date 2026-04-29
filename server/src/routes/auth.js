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
        
        // Delete in order to satisfy Foreign Key constraints
        await query('DELETE FROM messages');
        await query('DELETE FROM votes');
        await query('DELETE FROM candidates');
        await query('DELETE FROM elections');
        await query('DELETE FROM voters');
        await query('DELETE FROM otps');
        await query('DELETE FROM mobile_otps');
        await query('DELETE FROM admins');
        
        res.send("<h1>Database Purged Successfully</h1><p>All data has been wiped. You can now start fresh with a clean system.</p>");
    } catch (err) {
        console.error("Master Reset Error:", err);
        res.status(500).send("Reset failed: " + err.message);
    }
});

module.exports = router;
