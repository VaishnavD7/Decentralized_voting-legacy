const { db } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

console.log("Exporting election data for seeding...");

try {
    const elections = db.prepare('SELECT * FROM elections WHERE deleted = 0').all();
    const candidatesStmt = db.prepare('SELECT * FROM candidates WHERE election_id = ?');

    const result = elections.map(e => ({
        ...e,
        candidates: candidatesStmt.all(e.id)
    }));

    const outputPath = path.resolve(__dirname, '../../contracts/data-seed.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`Exported ${result.length} elections to ${outputPath}`);
} catch (err) {
    console.error("Export failed:", err);
    process.exit(1);
}
