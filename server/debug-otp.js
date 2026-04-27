const { db } = require('./src/config/database');
const path = require('path');

console.log("Database File:", db.name);
console.log("Testing Insertion...");

try {
    const email = 'test@debug.com';
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();

    const stmt = db.prepare('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)');
    const info = stmt.run(email, otp, expiresAt);
    console.log("Insert Info:", info);

    const check = db.prepare('SELECT * FROM otps WHERE email = ?').all(email);
    console.log("Read Back:", check);

} catch (err) {
    console.error("Error:", err);
}
