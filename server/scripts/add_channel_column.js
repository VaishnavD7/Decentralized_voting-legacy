const { query } = require('../src/config/db');

const migrate = async () => {
    try {
        console.log("Migrating messages table...");
        // Check if column exists (Postgres vs SQLite syntax differs, but ADD COLUMN IF NOT EXISTS is not standard SQL everywhere)
        // Simplest: Try to add it, ignore error if exists.

        try {
            await query("ALTER TABLE messages ADD COLUMN channel TEXT DEFAULT 'General'");
            console.log("Column 'channel' added.");
        } catch (e) {
            if (e.message.includes("duplicate column") || e.message.includes("exists")) {
                console.log("Column 'channel' already exists.");
            } else {
                throw e;
            }
        }

        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err);
    }
};

migrate();
