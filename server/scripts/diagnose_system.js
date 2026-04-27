const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const API_URL = 'http://localhost:5000/api';
const DB_PATH = path.join(__dirname, '../data/voting.db');
const CONTRACT_DATA = require('../../client/src/contract-address.json');

async function checkBackend() {
    console.log("1. Checking Backend Health...");
    try {
        const res = await axios.get(`${API_URL}/health`);
        console.log("   ✅ Backend is running:", res.data);
        return true;
    } catch (error) {
        console.log("   ❌ Backend unreachable:", error.message);
        return false;
    }
}

function checkDatabase() {
    console.log("2. Checking Database...");
    if (fs.existsSync(DB_PATH)) {
        const stats = fs.statSync(DB_PATH);
        console.log(`   ✅ Database exists (${stats.size} bytes)`);
        return true;
    } else {
        console.log("   ❌ Database file missing at", DB_PATH);
        return false;
    }
}

async function checkBlockchain() {
    console.log("3. Checking Blockchain & Contract...");
    try {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const network = await provider.getNetwork();
        console.log(`   ✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

        // Check if contract has code
        const code = await provider.getCode(CONTRACT_DATA.address);
        if (code === '0x') {
            console.log("   ❌ No contract found at address:", CONTRACT_DATA.address);
            console.log("      (Did you run 'npx hardhat node' and 'deploy.js'?)");
            return false;
        } else {
            console.log("   ✅ Contract found at:", CONTRACT_DATA.address);
            return true;
        }
    } catch (error) {
        console.log("   ❌ Blockchain unreachable:", error.message);
        console.log("      (Is 'npx hardhat node' running?)");
        return false;
    }
}

async function runDiagnostics() {
    console.log("=== D-Vote System Diagnostics ===\n");
    const backendOk = await checkBackend();
    const dbOk = checkDatabase();
    const chainOk = await checkBlockchain();

    console.log("\n=== Summary ===");
    if (backendOk && dbOk && chainOk) {
        console.log("✅ All systems operational.");
        console.log("👉 If UI fails to load, the issue is likely in the Browser (e.g. MetaMask or Extension blocking).");
        console.log("👉 Check the Browser Console (F12) for detailed errors.");
    } else {
        console.log("⚠️ Some systems are down. Fix the errors above.");
    }
}

runDiagnostics();
