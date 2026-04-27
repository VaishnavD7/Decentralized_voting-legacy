const { db } = require('./src/config/database');
require('dotenv').config();

const adminWallet = process.env.ADMIN_WALLET;

if (!adminWallet) {
    console.error("ADMIN_WALLET not set in .env");
    process.exit(1);
}

console.log(`Promoting ${adminWallet} to ADMIN...`);

try {
    const stmt = db.prepare("UPDATE voters SET role = 'ADMIN', status = 'APPROVED' WHERE wallet_address = ?");
    const info = stmt.run(adminWallet.toLowerCase());

    if (info.changes > 0) {
        console.log("Success! User promoted to ADMIN.");
    } else {
        console.log("User not found in database. Please register first.");
    }
} catch (err) {
    console.error("Database error:", err);
}
