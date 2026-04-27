const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../server/data/voting.db');
const db = new Database(dbPath);

const info = db.pragma('table_info(voters)');
console.log("Voters Table Columns:");
info.forEach(col => console.log(`- ${col.name} (${col.type})`));
