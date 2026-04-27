const { query } = require('../src/config/db');

async function clear() {
    console.log("Searching for 'Khadke'...");
    try {
        const { rows } = await query("SELECT * FROM voters WHERE name LIKE '%Khadke%' OR name LIKE '%Abhishek%'");

        if (rows.length === 0) {
            console.log("No matching users found.");
            return;
        }

        console.log("Found conflicting users:");
        rows.forEach(r => console.log(`- ID: ${r.id}, Name: ${r.name}, Wallet: ${r.wallet_address}`));

        console.log("Deleting conflicting users to allow re-registration...");
        for (const r of rows) {
            await query("DELETE FROM voters WHERE id = $1", [r.id]);
        }
        console.log("✅ Cleared conflicting records.");

    } catch (err) {
        console.error("Error:", err);
    }
}

clear();
