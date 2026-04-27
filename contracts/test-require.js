
try {
    const db = require('../../server/node_modules/better-sqlite3');
    console.log("Success");
} catch (e) {
    console.error(e.message);
}
