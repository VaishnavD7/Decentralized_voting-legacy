const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Get all messages (optional channel filter)
router.get('/messages', async (req, res) => {
    try {
        const { channel } = req.query;
        let queryText = `
            SELECT m.*, v.name 
            FROM messages m 
            JOIN voters v ON m.wallet_address = v.wallet_address 
        `;
        const params = [];

        if (channel) {
            queryText += ` WHERE m.channel = $1 `;
            params.push(channel);
        }

        queryText += ` ORDER BY m.timestamp DESC LIMIT 50 `;

        const { rows: messages } = await query(queryText, params);
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Post a new message
router.post('/messages', async (req, res) => {
    let { wallet_address, content, channel } = req.body;
    if (!wallet_address || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Normalize
    wallet_address = wallet_address.toLowerCase();
    const targetChannel = channel || 'General';

    try {
        const { rows } = await query(
            'INSERT INTO messages (wallet_address, content, channel) VALUES ($1, $2, $3) RETURNING id',
            [wallet_address, content, targetChannel]
        );
        res.status(201).json({ id: rows[0].id, status: 'Broadcast successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to broadcast message' });
    }
});

module.exports = router;
