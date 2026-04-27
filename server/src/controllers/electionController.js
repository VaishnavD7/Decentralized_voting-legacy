const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

const exportData = async () => {
    try {
        const { rows: elections } = await query('SELECT * FROM elections WHERE deleted = 0');
        const { rows: candidates } = await query('SELECT * FROM candidates');

        const result = elections.map(e => ({
            ...e,
            candidates: candidates.filter(c => c.election_id === e.id)
        }));

        // Adjust path to point to contracts directory
        const outputPath = path.resolve(__dirname, '../../../contracts/data-seed.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log("Auto-exported election data to data-seed.json");
    } catch (err) {
        console.error("Auto-export failed:", err);
    }
};

exports.createElection = async (req, res) => {
    try {
        const { id, title, startTime, endTime, candidateCount } = req.body;
        // Upsert to avoid duplicates if called multiple times
        // Postgres Syntax: ON CONFLICT(id) DO UPDATE
        // Params: $1...$5
        await query(`
            INSERT INTO elections (id, title, start_time, end_time, candidate_count)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,
            start_time=excluded.start_time,
            end_time=excluded.end_time,
            candidate_count=excluded.candidate_count
        `, [id, title, startTime, endTime, candidateCount || 0]);

        await exportData();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.recordVote = async (req, res) => {
    try {
        const electionId = req.params.id;
        const { candidateId, transactionHash, blockHash } = req.body;
        const walletAddress = req.user.walletAddress;

        const { rows: voters } = await query('SELECT id FROM voters WHERE wallet_address = $1', [walletAddress]);
        if (!voters.length) return res.status(404).json({ error: 'Voter not found' });
        const voterId = voters[0].id;

        await query(`
            INSERT INTO votes (voter_id, election_id, candidate_id, transaction_hash, block_hash)
            VALUES ($1, $2, $3, $4, $5)
        `, [voterId, electionId, candidateId, transactionHash || '', blockHash || '']);

        await query('UPDATE candidates SET vote_count = vote_count + 1 WHERE id = $1', [candidateId]);

        res.json({ success: true, message: 'Vote recorded' });
    } catch (err) {
        console.error("Record Vote Error:", err);
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Already voted in this election' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};


exports.addCandidate = async (req, res) => {
    try {
        const { electionId, id, name, party, symbol } = req.body;
        await query(`
            INSERT INTO candidates (election_id, blockchain_id, name, party, symbol)
            VALUES ($1, $2, $3, $4, $5)
        `, [electionId, id, name, party, symbol || null]);

        // Update candidate count
        await query('UPDATE elections SET candidate_count = candidate_count + 1 WHERE id = $1', [electionId]);

        await exportData();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getElections = async (req, res) => {
    try {
        const { rows: elections } = await query('SELECT * FROM elections');
        const { rows: candidates } = await query('SELECT * FROM candidates');

        const result = elections.map(e => ({
            ...e,
            candidates: candidates.filter(c => c.election_id === e.id)
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
