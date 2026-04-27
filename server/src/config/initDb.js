const { query, isProduction } = require('./db');

const initDb = async () => {
    console.log(`[DB] Initializing schemas (` + (isProduction ? 'PostgreSQL' : 'SQLite') + `)...`);

    // Dialect-specific types
    const SERIAL = isProduction ? 'SERIAL' : 'INTEGER';
    const PRIMARY_KEY = isProduction ? 'PRIMARY KEY' : 'PRIMARY KEY AUTOINCREMENT';
    const AUTO_ID = `${SERIAL} ${PRIMARY_KEY}`; // PG: SERIAL PRIMARY KEY, SQLite: INTEGER PRIMARY KEY AUTOINCREMENT

    // In Postgres, use TEXT or VARCHAR. SQLite loves TEXT.
    // In Postgres, DATETIME is TIMESTAMP. SQLite uses TEXT or INTEGER.
    const TIMESTAMP = isProduction ? 'TIMESTAMP' : 'DATETIME';

    try {
        // 1. Voters Table
        await query(`
            CREATE TABLE IF NOT EXISTS voters (
                id ${AUTO_ID},
                wallet_address TEXT UNIQUE NOT NULL,
                visible_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                dob TEXT, -- YYYY-MM-DD
                gender TEXT,
                address TEXT,
                state TEXT,
                district TEXT,
                pincode TEXT,
                govt_id TEXT UNIQUE, -- Aadhar/VoterID
                email TEXT,
                phone TEXT,
                verification_method TEXT DEFAULT 'FACE',
                face_descriptor TEXT,
                status TEXT DEFAULT 'PENDING',
                role TEXT DEFAULT 'VOTER',
                created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Messages Table
        await query(`
            CREATE TABLE IF NOT EXISTS messages (
                id ${AUTO_ID},
                wallet_address TEXT NOT NULL,
                content TEXT NOT NULL,
                channel TEXT DEFAULT 'General',
                timestamp ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wallet_address) REFERENCES voters(wallet_address)
            );
        `);

        // 3. OTPs Table
        await query(`
            CREATE TABLE IF NOT EXISTS otps (
                id ${AUTO_ID},
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at ${TIMESTAMP} NOT NULL,
                created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Mobile OTPs Table
        await query(`
            CREATE TABLE IF NOT EXISTS mobile_otps (
                id ${AUTO_ID},
                phone TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at ${TIMESTAMP} NOT NULL,
                created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Settings Table
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        // Seed Settings
        // Use Insert Or Ignore (SQLite) or Insert On Conflict Do Nothing (PG)
        // Syntax differs significantly here.
        if (isProduction) {
            await query(`INSERT INTO settings (key, value) VALUES ('verification_mode', 'FACE') ON CONFLICT DO NOTHING`);
            await query(`INSERT INTO settings (key, value) VALUES ('maintenance_mode', 'false') ON CONFLICT DO NOTHING`);
        } else {
            await query(`INSERT OR IGNORE INTO settings (key, value) VALUES ('verification_mode', 'FACE')`);
            await query(`INSERT OR IGNORE INTO settings (key, value) VALUES ('maintenance_mode', 'false')`);
        }

        // 6. Elections Table
        await query(`
            CREATE TABLE IF NOT EXISTS elections (
                id INTEGER PRIMARY KEY, -- Blockchain ID (manually set)
                title TEXT NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                active INTEGER DEFAULT 1,
                show_results INTEGER DEFAULT 0,
                deleted INTEGER DEFAULT 0,
                candidate_count INTEGER DEFAULT 0,
                created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP
            );
        `);


        // 7. Candidates Table
        await query(`
            CREATE TABLE IF NOT EXISTS candidates (
                id ${AUTO_ID},
                election_id INTEGER NOT NULL,
                blockchain_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                party TEXT NOT NULL,
                symbol TEXT,
                vote_count INTEGER DEFAULT 0,
                FOREIGN KEY (election_id) REFERENCES elections(id)
            );
        `);

        // Migration: Add symbol to candidates if missing (Idempotent)
        try {
            await query(`ALTER TABLE candidates ADD COLUMN symbol TEXT`);
        } catch (err) {
            // Ignore if column already exists
        }

        // 8. Votes Table (New)
        await query(`
            CREATE TABLE IF NOT EXISTS votes (
                id ${AUTO_ID},
                voter_id INTEGER NOT NULL,
                election_id INTEGER NOT NULL,
                candidate_id INTEGER NOT NULL,
                timestamp ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP,
                block_hash TEXT,
                transaction_hash TEXT,
                UNIQUE(voter_id, election_id),
                FOREIGN KEY (voter_id) REFERENCES voters(id),
                FOREIGN KEY (election_id) REFERENCES elections(id),
                FOREIGN KEY (candidate_id) REFERENCES candidates(id)
            );
        `);

        // 9. Admins Table (New)
        await query(`
            CREATE TABLE IF NOT EXISTS admins (
                id ${AUTO_ID},
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL, -- Hashed
                role TEXT DEFAULT 'ADMIN',
                permissions TEXT DEFAULT 'ALL',
                created_at ${TIMESTAMP} DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed Default Admin if not exists
        const defaultAdminUser = 'admin';
        const defaultAdminPass = 'admin123'; // In production, hash this!

        // Simple check to avoid duplicate complex logic
        try {
            await query(`INSERT INTO admins (username, password) VALUES ('${defaultAdminUser}', '${defaultAdminPass}')`);
        } catch (e) {
            // Ignore unique constraint violation
        }

        console.log('[DB] Schemas initialized successfully.');

    } catch (err) {
        console.error('[DB] Schema Initialization Error:', err);
        process.exit(1);
    }
};

module.exports = initDb;
