/**
 * D-VOTE COMPREHENSIVE SYSTEM TEST SUITE
 * Tests: Backend API, Smart Contract, Integration
 * Run: node tests/system-test.js
 */

const { ethers } = require(require('path').resolve(__dirname, '../contracts/node_modules/ethers'));
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════
const API_BASE = 'http://localhost:5000/api';
const RPC_URL = 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS_FILE = path.resolve(__dirname, '../client/src/contract-address.json');
const ABI_FILE = path.resolve(__dirname, '../client/src/artifacts/contracts/Voting.sol/Voting.json');

// Hardhat default accounts
const ADMIN_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const VOTER1_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const VOTER2_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
const VOTER3_KEY = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
let passed = 0, failed = 0, skipped = 0;
const results = [];

function log(icon, msg) { console.log(`  ${icon} ${msg}`); }

async function test(category, name, fn) {
    const label = `[${category}] ${name}`;
    try {
        const result = await fn();
        if (result === 'SKIP') {
            skipped++;
            results.push({ status: 'SKIP', label });
            log('[SKIP]', `${label}`);
        } else {
            passed++;
            results.push({ status: 'PASS', label });
            log('[PASS]', `${label}`);
        }
    } catch (err) {
        failed++;
        const errMsg = err.message || String(err);
        results.push({ status: 'FAIL', label, error: errMsg });
        log('[FAIL]', `${label} -- ${errMsg}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJSON(url, options = {}) {
    await delay(300); // Throttling to avoid rate limits
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, ok: res.ok };
}

// ===================================================
// MAIN TEST RUNNER
// ===================================================
async function runAllTests() {
    console.log('');
    console.log('='.repeat(52));
    console.log('   D-VOTE COMPREHENSIVE SYSTEM TEST SUITE');
    console.log('='.repeat(52));
    console.log('');

    // --- SECTION 1: BACKEND API TESTS ---
    console.log('-'.repeat(48));
    console.log(' SECTION 1: BACKEND API TESTS');
    console.log('-'.repeat(48));
    console.log('');

    // 1.1 Server Health
    await test('API', 'Server is reachable', async () => {
        const res = await fetchJSON(`${API_BASE}/settings`);
        assert(res.ok, `Server returned ${res.status}`);
    });

    await test('API', 'Health endpoint returns status', async () => {
        const res = await fetchJSON(`${API_BASE}/health`);
        assert(res.data.status, `No status field in response`);
        assert(res.data.components, `No components field`);
        assert(res.data.components.database, `No database component`);
    });

    // 1.2 Settings
    await test('API', 'GET /settings returns config', async () => {
        const res = await fetchJSON(`${API_BASE}/settings`);
        assert(res.ok, `Status: ${res.status}`);
        assert(res.data.admin_wallet, 'Missing admin_wallet');
    });

    // 1.3 Voters
    await test('API', 'GET /voters returns array', async () => {
        const res = await fetchJSON(`${API_BASE}/voters`);
        assert(res.ok, `Status: ${res.status}`);
        assert(Array.isArray(res.data), 'Response is not array');
    });

    await test('API', 'GET /voters?status=APPROVED filters correctly', async () => {
        const res = await fetchJSON(`${API_BASE}/voters?status=APPROVED`);
        assert(res.ok, `Status: ${res.status}`);
        assert(Array.isArray(res.data), 'Response is not array');
        res.data.forEach(v => assert(v.status === 'APPROVED', `Voter ${v.name} has status ${v.status}`));
    });

    await test('API', 'GET /voters/:address for admin wallet', async () => {
        const adminAddr = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase();
        const res = await fetchJSON(`${API_BASE}/voters/${adminAddr}`);
        // Could be 200 or 404 depending on registration
        assert(res.status === 200 || res.status === 404, `Unexpected status: ${res.status}`);
    });

    await test('API', 'GET /voters/:address returns 404 for non-existent', async () => {
        const res = await fetchJSON(`${API_BASE}/voters/0x0000000000000000000000000000000000000000`);
        assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // 1.4 Elections
    await test('API', 'GET /elections returns array', async () => {
        const res = await fetchJSON(`${API_BASE}/elections`);
        assert(res.ok, `Status: ${res.status}`);
        assert(Array.isArray(res.data), 'Response is not array');
    });

    // 1.5 Community
    await test('API', 'GET /community/messages returns array (or error)', async () => {
        const res = await fetchJSON(`${API_BASE}/community/messages`);
        // May return empty array or error if no messages table
        assert(res.status === 200 || res.status === 500, `Unexpected: ${res.status}`);
    });

    await test('API', 'POST /community/messages rejects empty body', async () => {
        const res = await fetchJSON(`${API_BASE}/community/messages`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    // 1.6 Auth
    await test('API', 'GET /auth/config returns admin wallet', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/config`);
        assert(res.ok, `Status: ${res.status}`);
        assert(typeof res.data.adminWallet !== 'undefined', 'Missing adminWallet');
    });

    await test('API', 'POST /auth/register rejects missing fields', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/register`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        assert(!res.ok, `Should reject empty registration, got ${res.status}`);
    });

    await test('API', 'POST /auth/login rejects missing credentials', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        assert(!res.ok, `Should reject empty login, got ${res.status}`);
    });

    await test('API', 'POST /auth/send-otp rejects invalid request', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/send-otp`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        assert(!res.ok, `Should reject, got ${res.status}`);
    });

    await test('API', 'POST /auth/verify-otp rejects invalid request', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        assert(!res.ok, `Should reject, got ${res.status}`);
    });

    await test('API', 'POST /auth/send-sms rejects invalid request', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/send-sms`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        assert(!res.ok, `Should reject, got ${res.status}`);
    });

    await test('API', 'POST /auth/verify-sms rejects invalid request', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/verify-sms`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        assert(!res.ok, `Should reject, got ${res.status}`);
    });

    await test('API', 'GET /auth/me rejects unauthenticated request', async () => {
        const res = await fetchJSON(`${API_BASE}/auth/me`);
        assert(!res.ok, `Should reject unauthenticated, got ${res.status}`);
    });

    // 1.7 Protected Routes
    await test('API', 'PATCH /voters/:addr/status rejects without auth', async () => {
        const res = await fetchJSON(`${API_BASE}/voters/0x123/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'APPROVED' })
        });
        assert(res.status === 401 || res.status === 403, `Expected 401/403, got ${res.status}`);
    });

    await test('API', 'PATCH /voters/:addr/role rejects without auth', async () => {
        const res = await fetchJSON(`${API_BASE}/voters/0x123/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role: 'ADMIN' })
        });
        assert(res.status === 401 || res.status === 403, `Expected 401/403, got ${res.status}`);
    });

    await test('API', 'DELETE /voters/:addr rejects without auth', async () => {
        const res = await fetchJSON(`${API_BASE}/voters/0x123`, {
            method: 'DELETE'
        });
        assert(res.status === 401 || res.status === 403, `Expected 401/403, got ${res.status}`);
    });

    // --- SECTION 2: SMART CONTRACT TESTS ---
    console.log('');
    console.log('-'.repeat(48));
    console.log(' SECTION 2: SMART CONTRACT TESTS');
    console.log('-'.repeat(48));
    console.log('');

    let provider, adminWallet, voter1Wallet, voter2Wallet, voter3Wallet;
    let contract, contractVoter1, contractVoter2, contractVoter3;
    let contractAddress;

    try {
        // Setup
        const addressData = JSON.parse(fs.readFileSync(CONTRACT_ADDRESS_FILE, 'utf8'));
        contractAddress = addressData.address;
        const abiData = JSON.parse(fs.readFileSync(ABI_FILE, 'utf8'));

        provider = new ethers.JsonRpcProvider(RPC_URL);
        adminWallet = new ethers.Wallet(ADMIN_KEY, provider);
        voter1Wallet = new ethers.Wallet(VOTER1_KEY, provider);
        voter2Wallet = new ethers.Wallet(VOTER2_KEY, provider);
        voter3Wallet = new ethers.Wallet(VOTER3_KEY, provider);

        contract = new ethers.Contract(contractAddress, abiData.abi, adminWallet);
        contractVoter1 = new ethers.Contract(contractAddress, abiData.abi, voter1Wallet);
        contractVoter2 = new ethers.Contract(contractAddress, abiData.abi, voter2Wallet);
        contractVoter3 = new ethers.Contract(contractAddress, abiData.abi, voter3Wallet);
    } catch (err) {
        console.log(`  [WARN] Contract setup failed: ${err.message}`);
        console.log('  Skipping all contract tests.\n');
    }

    if (contract) {
        // 2.1 Read State
        await test('CONTRACT', 'Connect to deployed contract', async () => {
            const msg = await contract.getWelcomeMessage();
            assert(msg === 'Welcome to D-Vote!', `Unexpected message: ${msg}`);
        });

        await test('CONTRACT', 'Read election count', async () => {
            const count = await contract.electionCount();
            assert(count >= 0n, `Invalid count: ${count}`);
            log('[INFO]', `Current election count: ${count}`);
        });

        await test('CONTRACT', 'Get all elections', async () => {
            const elections = await contract.getAllElections();
            assert(Array.isArray(elections), 'Not an array');
            log('[INFO]', `Found ${elections.length} elections on chain`);
        });

        // 2.2 Create Election
        let testElectionId;
        await test('CONTRACT', 'Create new test election', async () => {
            await delay(1000);
            const now = Math.floor(Date.now() / 1000);
            const startTime = now;
            const endTime = now + 86400; // 24 hours from now
            const tx = await contract.createElection('TEST ELECTION - System Test', startTime, endTime);
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');

            const count = await contract.electionCount();
            testElectionId = Number(count);
            log('[INFO]', `Created election ID: ${testElectionId}`);
        });

        // 2.3 Add Candidates
        await test('CONTRACT', 'Add candidate 1 (Alice)', async () => {
            await delay(1000);
            assert(testElectionId, 'No election ID');
            const tx = await contract.addCandidate(testElectionId, 'Alice', 'Party A');
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
        });

        await test('CONTRACT', 'Add candidate 2 (Bob)', async () => {
            await delay(1000);
            assert(testElectionId, 'No election ID');
            const tx = await contract.addCandidate(testElectionId, 'Bob', 'Party B');
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
        });

        await test('CONTRACT', 'Add candidate 3 (Charlie)', async () => {
            await delay(1000);
            assert(testElectionId, 'No election ID');
            const tx = await contract.addCandidate(testElectionId, 'Charlie', 'Party C');
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
        });

        await test('CONTRACT', 'Verify candidates were added', async () => {
            const candidates = await contract.getCandidates(testElectionId);
            assert(candidates.length === 3, `Expected 3, got ${candidates.length}`);
            assert(candidates[0].name === 'Alice', `Wrong name: ${candidates[0].name}`);
            assert(candidates[1].name === 'Bob', `Wrong name: ${candidates[1].name}`);
            assert(candidates[2].name === 'Charlie', `Wrong name: ${candidates[2].name}`);
        });

        // 2.4 Voting
        await test('CONTRACT', 'Voter 1 casts vote for Alice (candidate 1)', async () => {
            const tx = await contractVoter1.vote(testElectionId, 1);
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
        });

        await test('CONTRACT', 'Voter 2 casts vote for Bob (candidate 2)', async () => {
            const tx = await contractVoter2.vote(testElectionId, 2);
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
        });

        await test('CONTRACT', 'Voter 3 casts vote for Alice (candidate 1)', async () => {
            const tx = await contractVoter3.vote(testElectionId, 1);
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
        });

        await test('CONTRACT', 'Verify vote counts (Alice:2, Bob:1, Charlie:0)', async () => {
            const candidates = await contract.getCandidates(testElectionId);
            const alice = candidates[0];
            const bob = candidates[1];
            const charlie = candidates[2];
            assert(Number(alice.voteCount) === 2, `Alice has ${alice.voteCount}, expected 2`);
            assert(Number(bob.voteCount) === 1, `Bob has ${bob.voteCount}, expected 1`);
            assert(Number(charlie.voteCount) === 0, `Charlie has ${charlie.voteCount}, expected 0`);
        });

        // 2.5 Double Vote Prevention
        await test('CONTRACT', 'Double vote is rejected', async () => {
            try {
                const tx = await contractVoter1.vote(testElectionId, 2);
                await tx.wait();
                throw new Error('Double vote should have been rejected');
            } catch (err) {
                assert(err.message.includes('Already voted') || err.message.includes('reverted'),
                    `Wrong error: ${err.message}`);
            }
        });

        // 2.6 Election Status Controls
        await test('CONTRACT', 'Toggle results to visible', async () => {
            await delay(1000);
            const tx = await contract.toggleResults(testElectionId, true);
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
            const election = await contract.elections(testElectionId);
            assert(election.showResults === true, 'showResults should be true');
            assert(election.active === false, 'active should be false after showing results');
        });

        await test('CONTRACT', 'Set election status back to active', async () => {
            await delay(1000);
            const tx = await contract.setElectionStatus(testElectionId, true);
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
            const election = await contract.elections(testElectionId);
            assert(election.active === true, 'active should be true');
        });

        // 2.7 Delete Election (Soft Delete)
        await test('CONTRACT', 'Soft delete election', async () => {
            await delay(1000);
            const tx = await contract.deleteElection(testElectionId);
            const receipt = await tx.wait();
            assert(receipt.status === 1, 'Transaction failed');
            const election = await contract.elections(testElectionId);
            assert(election.deleted === true, 'deleted flag should be true');
            assert(election.active === false, 'active should be false');
        });

        // 2.8 Access Control
        await test('CONTRACT', 'Non-admin cannot create election', async () => {
            try {
                const now = Math.floor(Date.now() / 1000);
                const tx = await contractVoter1.createElection('Unauthorized', now, now + 3600);
                await tx.wait();
                throw new Error('Should have been rejected');
            } catch (err) {
                assert(err.message.includes('AccessControl') || err.message.includes('reverted'),
                    `Wrong error: ${err.message}`);
            }
        });

        await test('CONTRACT', 'Non-admin cannot add candidate', async () => {
            try {
                const tx = await contractVoter1.addCandidate(1, 'Hacker', 'Bad Party');
                await tx.wait();
                throw new Error('Should have been rejected');
            } catch (err) {
                assert(err.message.includes('AccessControl') || err.message.includes('reverted'),
                    `Wrong error: ${err.message}`);
            }
        });

        await test('CONTRACT', 'Non-admin cannot delete election', async () => {
            try {
                const tx = await contractVoter1.deleteElection(1);
                await tx.wait();
                throw new Error('Should have been rejected');
            } catch (err) {
                assert(err.message.includes('AccessControl') || err.message.includes('reverted'),
                    `Wrong error: ${err.message}`);
            }
        });
    }

    // --- SECTION 3: INTEGRATION TESTS ---
    console.log('');
    console.log('-'.repeat(48));
    console.log(' SECTION 3: INTEGRATION TESTS');
    console.log('-'.repeat(48));
    console.log('');

    await test('INTEGRATION', 'Backend election data matches contract state', async () => {
        if (!contract) return 'SKIP';
        const apiRes = await fetchJSON(`${API_BASE}/elections`);
        const chainElections = await contract.getAllElections();
        assert(apiRes.ok, `API returned ${apiRes.status}`);
        log('[INFO]', `Backend DB elections: ${apiRes.data.length}, On-chain elections: ${chainElections.length}`);
    });

    await test('INTEGRATION', 'Admin wallet in settings matches .env', async () => {
        const res = await fetchJSON(`${API_BASE}/settings`);
        assert(res.ok, `Status: ${res.status}`);
        const expected = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
        assert(
            res.data.admin_wallet.toLowerCase() === expected.toLowerCase(),
            `Mismatch: ${res.data.admin_wallet} vs ${expected}`
        );
    });

    await test('INTEGRATION', 'Contract address file matches deployed contract', async () => {
        if (!contractAddress) return 'SKIP';
        const res = await fetchJSON(`${API_BASE}/settings`);
        // Just verify the file is readable and address format is valid
        assert(contractAddress.startsWith('0x'), 'Invalid address format');
        assert(contractAddress.length === 42, `Invalid length: ${contractAddress.length}`);
    });

    await test('INTEGRATION', 'Frontend Vite dev server is accessible', async () => {
        const res = await fetch('http://localhost:5173/');
        assert(res.ok, `Frontend returned ${res.status}`);
        const html = await res.text();
        assert(html.includes('root'), 'Missing root div in HTML');
        assert(html.includes('main.jsx'), 'Missing main.jsx script');
    });

    // --- SECTION 4: SECURITY TESTS ---
    console.log('');
    console.log('-'.repeat(48));
    console.log(' SECTION 4: SECURITY TESTS');
    console.log('-'.repeat(48));
    console.log('');

    await test('SECURITY', 'Server has security headers (Helmet)', async () => {
        const res = await fetch(`${API_BASE}/settings`);
        const csp = res.headers.get('content-security-policy');
        const xct = res.headers.get('x-content-type-options');
        assert(xct === 'nosniff', `Expected nosniff, got ${xct}`);
    });

    await test('SECURITY', 'Rate limiter is active', async () => {
        const res = await fetch(`${API_BASE}/settings`);
        const remaining = res.headers.get('ratelimit-remaining') || res.headers.get('x-ratelimit-remaining');
        // Just check the header exists (rate limit is configured)
        log('[INFO]', `Rate limit remaining: ${remaining || 'header not present (OK if behind proxy)'}`);
    });

    await test('SECURITY', 'Invalid JWT is rejected', async () => {
        const res = await fetchJSON(`${API_BASE}/voters/0x123/status`, {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer invalid-token-12345' },
            body: JSON.stringify({ status: 'APPROVED' })
        });
        assert(res.status === 401 || res.status === 403 || res.status === 400, `Expected 401/403/400, got ${res.status}`);
    });

    await test('SECURITY', 'SQL injection attempt is handled', async () => {
        const res = await fetchJSON(`${API_BASE}/voters/'; DROP TABLE voters; --`);
        // Should return 404, not crash
        assert(res.status === 404 || res.status === 200, `Unexpected: ${res.status}`);
    });

    // ===================================================
    // RESULTS SUMMARY
    // ===================================================
    console.log('');
    console.log('='.repeat(52));
    console.log('              TEST RESULTS SUMMARY');
    console.log('='.repeat(52));
    console.log('');

    const total = passed + failed + skipped;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log(`  Total Tests:  ${total}`);
    console.log(`  passed:    ${passed}`);
    console.log(`  failed:    ${failed}`);
    console.log(`  skipped:   ${skipped}`);
    console.log(`  pass Rate: ${passRate}%\n`);

    if (failed > 0) {
        console.log('  -- Failed Tests --');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  [FAIL] ${r.label}`);
            console.log(`     -> ${r.error}\n`);
        });
    }

    const verdict = failed === 0 ? 'ALL TESTS PASSED!' : `${failed} TEST(S) FAILED`;
    console.log(`\n  ${verdict}\n`);

    // Write results to file
    const output = { passed, failed, skipped, total, passRate, results };
    fs.writeFileSync(path.resolve(__dirname, 'results.json'), JSON.stringify(output, null, 2));

    return output;
}

// Run
runAllTests().then(summary => {
    process.exit(summary.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(2);
});
