const { query } = require('../config/db');

exports.getAllVoters = async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT id, wallet_address, name, visible_id, status, role, created_at, dob, gender, address, state, district, pincode, govt_id, email, phone FROM voters';
        let params = [];
        if (status) {
            sql += ' WHERE status = $1';
            params.push(status);
        }
        const { rows: voters } = await query(sql, params);
        res.json(voters);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateVoterStatus = async (req, res) => {
    try {
        const walletAddress = req.params.walletAddress.toLowerCase();
        const { status } = req.body;

        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const { rowCount } = await query('UPDATE voters SET status = $1 WHERE wallet_address = $2', [status, walletAddress]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Voter not found' });
        }

        // Send Approval Email & SMS
        if (status === 'APPROVED') {
            const { rows } = await query('SELECT email, phone, name FROM voters WHERE wallet_address = $1', [walletAddress]);
            const voter = rows[0];
            if (voter) {
                if (voter.email) {
                    const { sendApprovalNotification } = require('../services/emailService');
                    sendApprovalNotification(voter.email, voter.name).catch(err => console.error("Email Error:", err));
                }
                if (voter.phone) {
                    const { sendSmsNotification } = require('../services/smsService');
                    sendSmsNotification(voter.phone, `Congratulations ${voter.name}, your D-Vote identity has been APPROVED. You may now participate in elections.`).catch(err => console.error("SMS Error:", err));
                }
            }
        }

        res.json({ success: true, message: `Voter status updated to ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateVoterRole = async (req, res) => {
    try {
        const walletAddress = req.params.walletAddress.toLowerCase();
        const { role } = req.body;

        if (!['ADMIN', 'VOTER'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Prevent demoting the Main Admin (Env Defined)
        const adminWallet = (process.env.ADMIN_WALLET || '').toLowerCase();
        if (walletAddress === adminWallet && role !== 'ADMIN') {
            return res.status(403).json({ error: 'Cannot demote the Root Admin.' });
        }

        const { rowCount } = await query('UPDATE voters SET role = $1 WHERE wallet_address = $2', [role, walletAddress]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Voter not found' });
        }

        res.json({ success: true, message: `Voter role updated to ${role}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getVoter = async (req, res) => {
    const walletAddress = req.params.walletAddress.toLowerCase();
    console.log(`[IDENTITY] Fetch request for: ${walletAddress}`);
    try {
        const { rows } = await query('SELECT id, wallet_address, name, visible_id, status, role, created_at, dob, gender, address, state, district, pincode, govt_id, email, phone FROM voters WHERE wallet_address = $1', [walletAddress]);
        const voter = rows[0];

        if (!voter) {
            return res.status(404).json({ error: 'Voter not found' });
        }
        res.json(voter);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateVoterProfile = async (req, res) => {
    try {
        const walletAddress = req.params.walletAddress.toLowerCase();
        // Prevent updating critical fields like face_descriptor or wallet_address directly here
        const {
            name, dob, gender, address, state, district, pincode, govt_id, email, phone
        } = req.body;

        // Check if user exists
        const { rows } = await query('SELECT * FROM voters WHERE wallet_address = $1', [walletAddress]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields and RESET status to PENDING
        // We use COALESCE in SQL or just JS logic. Let's use JS logic to only update provided fields.
        // Actually, for a profile update form, we usually send all fields.
        // But to be safe, we only update what is sent, keeping old values if not sent? 
        // No, let's assume the form sends current state.

        // Construct dynamic query is safer but verbose.
        // Let's just update all profile fields.

        await query(
            `UPDATE voters SET 
                name = $1, dob = $2, gender = $3, address = $4, 
                state = $5, district = $6, pincode = $7, govt_id = $8, 
                email = $9, phone = $10,
                status = 'PENDING' -- CRITICAL: Reset status to pending for re-approval
            WHERE wallet_address = $11`,
            [
                name || rows[0].name,
                dob || rows[0].dob,
                gender || rows[0].gender,
                address || rows[0].address,
                state || rows[0].state,
                district || rows[0].district,
                pincode || rows[0].pincode,
                govt_id || rows[0].govt_id,
                email || rows[0].email,
                phone || rows[0].phone,
                walletAddress
            ]
        );

        res.json({ success: true, message: 'Profile updated. Status reset to PENDING for admin approval.' });

    } catch (err) {
        console.error("Profile Update Error:", err);
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Govt ID or Email already in use by another account.' });
        }
        res.status(500).json({ error: 'Server error during profile update' });
    }
};

exports.deleteVoter = async (req, res) => { // Admin only
    try {
        const walletAddress = req.params.walletAddress.toLowerCase();
        const { rowCount } = await query('DELETE FROM voters WHERE wallet_address = $1', [walletAddress]);

        if (rowCount === 0) {
            return res.status(404).json({ error: 'Voter not found' });
        }
        res.json({ success: true, message: 'Voter deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
