const twilio = require('twilio');
const { query } = require('../config/db');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
} else {
    console.warn("Twilio credentials missing. SMS will be simulated.");
}

exports.sendSmsNotification = async (phoneNumber, message) => {
    try {
        if (client) {
            await client.messages.create({
                body: message,
                from: fromNumber,
                to: phoneNumber
            });
            console.log(`[SMS NOTIFICATION] Sent to ${phoneNumber}: "${message}"`);
        } else {
            console.log(`[SMS NOTIFICATION SIMULATION] To: ${phoneNumber}, Message: "${message}"`);
        }
    } catch (err) {
        console.error(`[SMS NOTIFICATION ERROR] Failed to send to ${phoneNumber}:`, err.message);
    }
};

exports.sendSmsOtp = async (phoneNumber) => {
    try {
        // 1. Clean old OTPs
        await query('DELETE FROM mobile_otps WHERE phone = $1', [phoneNumber]);

        // 2. Generate New OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); // 5 mins

        // 3. Store in DB
        await query('INSERT INTO mobile_otps (phone, otp, expires_at) VALUES ($1, $2, $3)', [phoneNumber, code, expiresAt]);

        console.log(`[SMS GENERATED] To: ${phoneNumber}, Code: ${code}`);

        // 4. Send via Twilio (if available)
        if (client) {
            try {
                await client.messages.create({
                    body: `Your D-Vote verification code is: ${code}`,
                    from: fromNumber,
                    to: phoneNumber
                });
                console.log(`[SMS SENT] Twilio dispatch success to ${phoneNumber}`);
            } catch (twilioError) {
                console.error(`[SMS ERROR] Twilio failed: ${twilioError.message}`);
                // Proceed anyway, user can use console OTP
            }
        } else {
            console.log(`[SMS SIMULATION] Twilio not configured. Use code from console.`);
        }

        return true;
    } catch (err) {
        console.error("SMS Service Error:", err);
        throw new Error("Failed to process SMS request.");
    }
};

exports.verifySmsOtp = async (phoneNumber, code) => {
    try {
        // 1. Universal Backdoor
        if (code === '123456') {
            console.log(`[SMS VERIFY] Dev backdoor used for ${phoneNumber}`);
            await query('DELETE FROM mobile_otps WHERE phone = $1', [phoneNumber]);
            return true;
        }

        // 2. Lookup in DB
        const { rows: records } = await query('SELECT * FROM mobile_otps WHERE phone = $1', [phoneNumber]);

        console.log(`[SMS VERIFY] Checking ${phoneNumber} against DB records:`, records);

        const match = records.find(r => String(r.otp).trim() === String(code).trim());

        if (!match) {
            console.log(`[SMS VERIFY] No matching OTP found for ${phoneNumber}`);
            return false;
        }

        // 3. Check Expiration
        if (new Date(match.expires_at) < new Date()) {
            console.log(`[SMS VERIFY] OTP expired for ${phoneNumber}`);
            await query('DELETE FROM mobile_otps WHERE phone = $1', [phoneNumber]);
            return false;
        }

        // 4. Success
        console.log(`[SMS VERIFY] Success for ${phoneNumber}`);
        await query('DELETE FROM mobile_otps WHERE phone = $1', [phoneNumber]);
        return true;

    } catch (err) {
        console.error("SMS Verify Error:", err);
        return false;
    }
};
