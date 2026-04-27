const path = require('path');
const fs = require('fs');

// POLYMORPHIC DATABASE ADAPTER
// Supports: PostgreSQL (Production) and SQLite (Development)

const isProduction = !!process.env.DATABASE_URL;
let db;

if (isProduction) {
    const { Pool } = require('pg');
    console.log('[DB] Connecting to PostgreSQL...');
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for most cloud DBs (Render, Neon)
    });
} else {
    // SQLite Adapter
    const Database = require('better-sqlite3');
    const DB_PATH = process.env.DATABASE_PATH || './data/voting.db';

    // Ensure directory exists
    const dataDir = path.dirname(path.resolve(DB_PATH));
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log(`[DB] Connecting to SQLite: ${path.resolve(DB_PATH)}`);
    const sqlite = new Database(path.resolve(DB_PATH));

    // Async Wrapper to mimic PG API
    db = {
        query: async (text, params = []) => {
            try {
                // Convert PG syntax ($1, $2) to SQLite syntax (?, ?)
                let sqliteQuery = text;
                let paramIndex = 1;
                while (sqliteQuery.includes(`$${paramIndex}`)) {
                    sqliteQuery = sqliteQuery.replace(`$${paramIndex}`, '?');
                    paramIndex++;
                }

                const stmt = sqlite.prepare(sqliteQuery);

                // Determine if it's a SELECT or modifications with RETURNING
                const upperQuery = sqliteQuery.trim().toUpperCase();
                if (upperQuery.startsWith('SELECT') || upperQuery.includes('RETURNING')) {
                    const rows = stmt.all(params);
                    return { rows, rowCount: rows.length };
                } else {
                    const info = stmt.run(params);
                    // Standardize RETURNING clause simulation if needed, but for now:
                    // PG returns rows for INSERT/UPDATE if RETURNING is used.
                    // SQLite doesn't support RETURNING in older versions, but better-sqlite3 does in newer.
                    // We will assume basic usage for now.

                    // If the query has RETURNING, we might need to handle it differently in SQLite 
                    // or just use run() and expect the caller to handle ID retrieval via API logic if specific to SQLite.
                    // BUT, to be "Polymorphic", we should try to support RETURNING if possible or standardize on separate ID fetching.
                    // For MVP, we will rely on `info` for SQLite and `rows` for PG. 
                    // However, our refactor will try to use RETURNING for PG and `lastInsertRowid` for SQLite, 
                    // which means the controller logic might need a slight "if dialect" check or we unify it here.

                    // Unified Return Format:
                    return {
                        rows: [], // SQLite typically returns empty rows on run() unless using RETURNING
                        rowCount: info.changes,
                        lastID: info.lastInsertRowid // SQLite specific
                    };
                }
            } catch (err) {
                console.error('[DB-SQLite] Error:', err.message, '\nQuery:', text);
                throw err;
            }
        },
        // Direct access if really needed (discouraged)
        native: sqlite
    };
}

module.exports = {
    query: (text, params) => db.query(text, params),
    isProduction,
    // Helper to get last ID ensuring cross-db compatibility
    // Usage: const { rows, lastID } = await db.query(...);
    //        const id = rows[0]?.id || lastID; 
};
