const db = require('better-sqlite3')('./data/voting.db');

try {
    const row = db.prepare('SELECT count(*) as count FROM voters').get();
    console.log(`Voter Count in DB: ${row.count}`);

    const users = db.prepare('SELECT name, wallet_address FROM voters LIMIT 3').all();
    console.log('Sample Voters:', users);
} catch (err) {
    console.error('Error reading DB:', err.message);
}
