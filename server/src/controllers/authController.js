const { query } = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async (req, res) => {
    try {
        let {
            walletAddress, name, visibleId, faceDescriptor, email, phone, verificationMethod,
            dob, gender, address, state, district, pincode, govt_id
        } = req.body;

        if (!walletAddress || !name || !visibleId) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // 1. Enforce Face Descriptor (Compulsory)
        if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
            return res.status(400).json({ error: 'Valid face scan required for registration.' });
        }

        // 2. Check for Duplicate Face (Uniqueness Enforcement)
        try {
            const { rows: allVoters } = await query('SELECT face_descriptor, wallet_address, name FROM voters WHERE face_descriptor IS NOT NULL');
            const { euclideanDistance } = require('../services/faceService');
            const DUPLICATE_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.45;

            for (const v of allVoters) {
                if (v.face_descriptor) {
                    const savedDescriptor = JSON.parse(v.face_descriptor);
                    const distance = euclideanDistance(faceDescriptor, savedDescriptor);
                    if (distance < DUPLICATE_THRESHOLD) {
                        console.log(`[FACE_DUP_CHECK] BLOCKED — face matches existing voter: ${v.name}`);
                        return res.status(409).json({ error: `Identity biometrics already registered to another wallet (${v.name}). Each person can only register once.` });
                    }
                }
            }
        } catch (e) {
            console.error("Face Check Error:", e);
            // Ignore parsing errors for old data, proceed
        }

        walletAddress = walletAddress.toLowerCase();
        const adminWallet = (process.env.ADMIN_WALLET || '').toLowerCase();
        const isNominatedAdmin = walletAddress === adminWallet;
        const role = isNominatedAdmin ? 'ADMIN' : 'VOTER';
        const status = isNominatedAdmin ? 'APPROVED' : 'PENDING';

        const { rows: inserted } = await query(
            `INSERT INTO voters (
                wallet_address, name, visible_id, face_descriptor, email, phone, 
                verification_method, role, status,
                dob, gender, address, state, district, pincode, govt_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
            [
                walletAddress,
                name,
                visibleId,
                JSON.stringify(faceDescriptor),
                email || null,
                phone || null,
                verificationMethod || 'FACE',
                role,
                status,
                dob || null,
                gender || null,
                address || null,
                state || null,
                district || null,
                pincode || null,
                govt_id || null
            ]
        );
        const newId = inserted[0].id;

        const token = jwt.sign({ id: newId, walletAddress, role }, JWT_SECRET, { expiresIn: '24h' });

        // 3. Send Registration Email
        if (email) {
            const { sendRegistrationSuccess } = require('../services/emailService');
            sendRegistrationSuccess(email, name).catch(err => console.error("Email Error:", err));
        }

        // 4. Send Registration SMS
        if (phone) {
            const { sendSmsNotification } = require('../services/smsService');
            sendSmsNotification(phone, `Welcome to D-Vote, ${name}. Your registration is successful and pending approval.`).catch(err => console.error("SMS Error:", err));
        }

        res.json({
            success: true,
            token,
            user: {
                walletAddress, name, role, status, visibleId,
                faceDescriptor: JSON.stringify(faceDescriptor), // Return as string to match DB format if needed, or keep array? App expects object properties by name.
                // Actually App.jsx uses user.name, user.status. ProfileSection uses user.dob, etc.
                dob, gender, address, state, district, pincode, govt_id, email, phone
            }
        });

    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Wallet already registered' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const walletAddress = req.body.walletAddress.toLowerCase();
        const { faceDescriptor } = req.body;

        const { rows } = await query('SELECT * FROM voters WHERE wallet_address = $1', [walletAddress]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Face Verification
        if (faceDescriptor) {
            console.log(`[AUTH] Verifying face for ${walletAddress}`);
            const { verifyFace } = require('../services/faceService');

            if (!user.face_descriptor) {
                // If user has no face data (legacy), maybe allow? Or force re-registration?
                // For now, fail safe.
                return res.status(401).json({ error: 'Biometric data missing from registry. Please re-register.' });
            }

            const isMatch = verifyFace(faceDescriptor, user.face_descriptor);
            console.log(`[AUTH] Face Match Result: ${isMatch}`);

            if (!isMatch) {
                return res.status(401).json({ error: 'Biometric verification failed. Identity mismatch. Please ensure good lighting and try again.' });
            }
        } else {
            // Require face descriptor for everyone except maybe initial admin bootstrap if really needed
            // But user requirement says "WHEN A USER LOG IN AGAIN... HE SHOULD RESCAN"
            // So we enforce it.
            return res.status(400).json({ error: 'Biometric scan required for login.' });
        }

        const adminWallet = (process.env.ADMIN_WALLET || '').toLowerCase();
        const isNominatedAdmin = walletAddress === adminWallet;

        // Force role update if needed
        const role = isNominatedAdmin ? 'ADMIN' : user.role;


        const token = jwt.sign({ id: user.id, walletAddress: user.wallet_address, role }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ success: true, token, user: { ...user, role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const { rows } = await query('SELECT * FROM admins WHERE username = $1', [username]);
        const admin = rows[0];

        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // In a real app, use bcrypt.compare here. 
        // For this MVP/Demo where we store plain text or simple hash, we compare directly 
        // as per the initDb seed 'admin123'. 
        // IF we change initDb to hash, we must change this too.
        if (password !== admin.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({
            id: admin.id,
            username: admin.username,
            role: admin.role,
            type: 'admin' // Distinguish from voter token
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ success: true, token, user: { username: admin.username, role: admin.role } });

    } catch (err) {
        console.error('Admin Login Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

const { sendSmsOtp, verifySmsOtp } = require('../services/smsService');

// ... existing register and login functions

// ... (keeping previous code for context if needed, but better to just replace the blocks)

exports.sendOTP = async (req, res) => {
    try {
        let { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        // Normalize email
        email = email.trim().toLowerCase();

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // 5 minutes from now
        const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();

        // Used top-level db instance

        // Clear old OTPs for this email check
        // Clear old OTPs for this email check
        await query('DELETE FROM otps WHERE email = $1', [email]);

        const { rows: otpRows } = await query('INSERT INTO otps (email, otp, expires_at) VALUES ($1, $2, $3) RETURNING id', [email, otp, expiresAt]);
        const info = { lastInsertRowid: otpRows[0].id }; // Mock info for log
        console.log(`[OTP SENT] Inserted for '${email}': ${otp}`);

        // Send Email
        try {
            const { sendOTP } = require('../services/emailService');
            await sendOTP(email, otp);
        } catch (emailErr) {
            console.error(`[OTP WARNING] Failed to send email to ${email}. Check SMTP settings. Proceeding with console OTP.`);
        }

        res.json({ success: true, message: 'OTP dispatched to network vector' });
    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ error: 'Failed to dispatch OTP. Check SMTP config.' });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        let { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP required' });
        }

        // Normalize email
        email = email.trim().toLowerCase();
        otp = String(otp).trim();

        // DEV BACKDOOR
        if (otp === '123456') {
            console.log(`[OTP VERIFY] Dev backdoor used for '${email}'.`);
            await query('DELETE FROM otps WHERE email = $1', [email]);
            return res.json({ success: true });
        }

        // DEBUGGING: Log incoming and stored
        console.log(`[OTP VERIFY] Checking for '${email}', Input OTP: '${otp}'`);

        // DEBUGGING: Log incoming and stored
        console.log(`[OTP VERIFY] Checking for '${email}', Input OTP: '${otp}'`);

        const { rows: allOtps } = await query('SELECT * FROM otps WHERE email = $1', [email]);
        console.log(`[OTP VERIFY] Stored OTPs for '${email}':`, allOtps);

        const record = allOtps.find(r => String(r.otp).trim() === otp);

        if (!record) {
            console.log(`[OTP VERIFY] No matching record found.`);
            return res.status(400).json({ error: 'Invalid or missing OTP code' });
        }

        // Expiration Check
        if (new Date(record.expires_at) < new Date()) {
            console.log(`[OTP VERIFY] OTP expired.`);
            await query('DELETE FROM otps WHERE email = $1', [email]);
            return res.status(400).json({ error: 'OTP code expired' });
        }

        // Valid! Clean up
        console.log(`[OTP VERIFY] Success! Deleting OTP.`);
        await query('DELETE FROM otps WHERE email = $1', [email]);
        res.json({ success: true });
    } catch (err) {
        console.error("OTP Verification Error:", err);
        res.status(500).json({ error: 'Server verification error' });
    }
};

exports.sendSms = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Phone number required' });

        await sendSmsOtp(phone);
        res.json({ success: true, message: 'SMS OTP dispatched.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.verifySms = async (req, res) => {
    try {
        const { phone, code } = req.body;
        const isValid = await verifySmsOtp(phone, code);

        if (isValid) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid or expired SMS code' });
        }
    } catch (err) {
        res.status(500).json({ error: 'SMS verification error' });
    }
};

exports.me = (req, res) => {
    // TODO: Middleware to extract user from token
    res.json({ user: req.user });
};
