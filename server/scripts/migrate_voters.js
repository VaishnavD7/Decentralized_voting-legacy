const { query } = require('../src/config/db');

async function migrate() {
    console.log("Migrating 'voters' table...");
    const columns = [
        "dob TEXT",
        "gender TEXT",
        "address TEXT",
        "state TEXT",
        "district TEXT",
        "pincode TEXT",
        "govt_id TEXT UNIQUE"
    ];

    for (const col of columns) {
        try {
            await query(`ALTER TABLE voters ADD COLUMN ${col}`);
            console.log(`✅ Added column: ${col}`);
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`⚠️ Column already exists: ${col.split(' ')[0]}`);
            } else {
                console.error(`❌ Failed to add ${col}:`, err.message);
            }
        }
    }
    console.log("Migration complete.");
}

migrate();
