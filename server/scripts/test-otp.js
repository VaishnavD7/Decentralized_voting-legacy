const axios = require('axios');

const API_BASE = 'http://localhost:5000/api/auth';
const TEST_EMAIL = 'test_user@example.com';
const TEST_PHONE = '+15555555555';

async function testEmailOTP() {
    console.log('--- Testing Email OTP ---');
    try {
        // 1. Send OTP
        const res1 = await axios.post(`${API_BASE}/send-otp`, { email: TEST_EMAIL });
        const data1 = res1.data;
        console.log('Send OTP Response:', data1);
        if (!data1.success) throw new Error('Send OTP Failed');

        // 2. Verify with Dev Backdoor
        const res2 = await axios.post(`${API_BASE}/verify-otp`, { email: TEST_EMAIL, otp: '123456' });
        const data2 = res2.data;
        console.log('Verify OTP (123456) Response:', data2);
        if (!data2.success) throw new Error('Verify OTP with 123456 Failed');

    } catch (e) {
        console.error('Email OTP Error:', e.response ? e.response.data : e.message);
    }
}

async function testSmsOTP() {
    console.log('\n--- Testing SMS OTP ---');
    try {
        // 1. Send SMS
        const res1 = await axios.post(`${API_BASE}/send-sms`, { phone: TEST_PHONE });
        const data1 = res1.data;
        console.log('Send SMS Response:', data1);
        if (!data1.success) throw new Error(`Send SMS Failed: ${data1.error}`);

        // 2. Verify with Dev Backdoor
        const res2 = await axios.post(`${API_BASE}/verify-sms`, { phone: TEST_PHONE, code: '123456' });
        const data2 = res2.data;
        console.log('Verify SMS (123456) Response:', data2);
        if (!data2.success) throw new Error('Verify SMS with 123456 Failed');

    } catch (e) {
        console.error('SMS OTP Error:', e.response ? e.response.data : e.message);
    }
}

async function main() {
    await testEmailOTP();
    await testSmsOTP();
}

main();
