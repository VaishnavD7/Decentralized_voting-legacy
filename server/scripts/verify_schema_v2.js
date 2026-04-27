const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function run() {
    console.log("Running Tests against " + API_URL);

    try {
        console.log("\n--- 1. Admin Login ---");
        let adminToken;
        try {
            const res = await axios.post(`${API_URL}/auth/admin/login`, {
                username: 'admin',
                password: 'admin123'
            });
            console.log("Admin Login Success:", res.data.success);
            adminToken = res.data.token;
        } catch (e) {
            console.error("Admin Login Failed:", e.response?.data || e.message);
            process.exit(1);
        }

        console.log("\n--- 2. Create Election ---");
        const electionId = Date.now();
        await axios.post(`${API_URL}/elections`, {
            id: electionId,
            title: "Test Election V2",
            startTime: Math.floor(Date.now() / 1000),
            endTime: Math.floor(Date.now() / 1000) + 3600,
        });
        console.log("Election Created:", electionId);

        console.log("\n--- 3. Add Candidate with Symbol ---");
        const candidateId = 999;
        await axios.post(`${API_URL}/elections/candidates`, {
            electionId: electionId,
            id: candidateId,
            name: "Candidate One",
            party: "Party A",
            symbol: "🦅" // Eagle
        });
        console.log("Candidate Added with Symbol");

        // Verify Symbol
        const electionsRes = await axios.get(`${API_URL}/elections`);
        const election = electionsRes.data.find(e => e.id == electionId);
        const candidate = election.candidates.find(c => c.blockchain_id == candidateId);
        if (candidate.symbol === "🦅") {
            console.log("Symbol Verification Success: 🦅");
        } else {
            console.error("Symbol Verification FAILED: " + candidate.symbol);
            process.exit(1);
        }

        console.log("\n--- 4. Register Voter ---");
        const wallet = "0x" + Math.random().toString(16).slice(2, 42);
        let voterToken;
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                walletAddress: wallet,
                name: "Test Voter",
                visibleId: "V-" + Math.random().toString(36).slice(7),
                faceDescriptor: Array.from({ length: 128 }, () => Math.random()), // Random descriptor matches nothing
                verificationMethod: "FACE"
            });
            console.log("Voter Registered:", res.data.success);
            voterToken = res.data.token;
        } catch (e) {
            console.error("Voter Register Failed:", e.response?.data || e.message);
            process.exit(1);
        }

        console.log("\n--- 5. Record Vote ---");
        try {
            const voteRes = await axios.post(`${API_URL}/elections/${electionId}/votes`, {
                candidateId: candidateId,
                transactionHash: "0xHASH123",
                blockHash: "0xBLOCK123"
            }, {
                headers: { Authorization: `Bearer ${voterToken}` }
            });
            console.log("Vote Recorded:", voteRes.data.success);
        } catch (e) {
            console.error("Vote Record Failed:", e.response?.data || e.message);
        }

        console.log("\nVerification Complete.");

    } catch (e) {
        console.error("Test Failed:", e.message);
        if (e.response) {
            console.error("Response:", e.response.data);
            console.error("Status:", e.response.status);
        }
    }
}

run();
