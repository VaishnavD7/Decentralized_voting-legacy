const { query } = require('../src/config/db');

async function fix() {
    console.log("Fixing 'govt_id' column...");

    // 1. Add column if missing (without UNIQUE)
    try {
        await query(`ALTER TABLE voters ADD COLUMN govt_id TEXT`);
        console.log("✅ Added 'govt_id' column.");
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log("⚠️ 'govt_id' column already exists.");
        } else {
            console.error("❌ Failed to add column:", err.message);
        }
    }

    // 2. Add Unique Index
    try {
        await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_voters_govt_id ON voters(govt_id)`);
        console.log("✅ Created UNIQUE INDEX on 'govt_id'.");
    } catch (err) {
        console.error("❌ Failed to create index:", err.message);
    }
}

fix();
