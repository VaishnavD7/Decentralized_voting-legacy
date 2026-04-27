const { query } = require('../config/db');

exports.getSettings = async (req, res) => {
    try {
        const { rows } = await query('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.key === 'maintenance_mode' ? row.value === 'true' : row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const updates = req.body;

        // Use sequential updates instead of transaction for simplicity in polymorphic adapter
        for (const [key, value] of Object.entries(updates)) {
            await query('UPDATE settings SET value = $1 WHERE key = $2', [String(value), key]);
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
