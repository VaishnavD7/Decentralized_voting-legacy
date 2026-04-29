/**
 * D-Vote Backend API Test Suite
 * Tests all API endpoints, database operations, middleware, and services.
 * Runs against a temporary SQLite database (no external dependencies needed).
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

// ─── Test Config ────────────────────────────────────────
const TEST_DB = path.join(__dirname, 'test_voting.db');
const PORT = 5099;
const BASE = `http://localhost:${PORT}/api`;

// Set env BEFORE requiring app
process.env.PORT = PORT;
process.env.DATABASE_PATH = TEST_DB;
process.env.JWT_SECRET = 'test-secret-key';
process.env.ADMIN_WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
process.env.FACE_MATCH_THRESHOLD = '0.6';
process.env.NODE_ENV = 'test';
// Unset DATABASE_URL to force SQLite
delete process.env.DATABASE_URL;

// ─── Utilities ──────────────────────────────────────────
function request(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function generateFaceDescriptor() {
  return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
}

// ─── Test Framework ─────────────────────────────────────
let totalTests = 0, passed = 0, failed = 0;
const results = [];

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// ─── Test Runner ────────────────────────────────────────
async function runTests() {
  // Cleanup old test DB
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

  console.log('🔧 Starting test server...');

  // Import app (this triggers DB init)
  const app = require('../src/app');

  // Wait for DB init and server start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Ensure server is on our test port
  let server;
  try {
    server = app.listen(PORT, () => {});
  } catch (e) {
    // Server may already be listening from app.js
  }
  await new Promise(resolve => setTimeout(resolve, 500));

  let adminToken = null;
  let voterToken = null;
  const testWallet = '0x1234567890abcdef1234567890abcdef12345678';
  const testWallet2 = '0xabcdef1234567890abcdef1234567890abcdef12';
  const faceDescriptor1 = generateFaceDescriptor();
  const faceDescriptor2 = generateFaceDescriptor();

  console.log('\n═══════════════════════════════════════');
  console.log('  1. HEALTH & SETTINGS ENDPOINTS');
  console.log('═══════════════════════════════════════\n');

  await test('1.1 GET /api/health returns operational status', async () => {
    const res = await request('GET', `${BASE}/health`);
    // Health might be 503 if SMTP fails, but should return valid JSON
    assert(res.body.status !== undefined, 'Missing status field');
    assert(res.body.components !== undefined, 'Missing components field');
    assert(res.body.components.database !== undefined, 'Missing database component');
  });

  await test('1.2 GET /api/settings returns app settings', async () => {
    const res = await request('GET', `${BASE}/settings`);
    assertEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.admin_wallet !== undefined, 'Missing admin_wallet');
    assert(res.body.verification_mode !== undefined, 'Missing verification_mode');
  });

  await test('1.3 GET /api/auth/config returns admin wallet', async () => {
    const res = await request('GET', `${BASE}/auth/config`);
    assertEqual(res.status, 200);
    assert(res.body.adminWallet !== undefined, 'Missing adminWallet');
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  2. ADMIN AUTHENTICATION');
  console.log('═══════════════════════════════════════\n');

  await test('2.1 Admin login with correct credentials', async () => {
    const res = await request('POST', `${BASE}/auth/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });
    assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'Expected success: true');
    assert(res.body.token !== undefined, 'Missing token');
    adminToken = res.body.token;
  });

  await test('2.2 Admin login with wrong password REJECTS', async () => {
    const res = await request('POST', `${BASE}/auth/admin/login`, {
      username: 'admin',
      password: 'wrongpassword'
    });
    assertEqual(res.status, 401);
  });

  await test('2.3 Admin login with missing fields REJECTS', async () => {
    const res = await request('POST', `${BASE}/auth/admin/login`, {
      username: 'admin'
    });
    assertEqual(res.status, 400);
  });

  await test('2.4 Admin login with nonexistent user REJECTS', async () => {
    const res = await request('POST', `${BASE}/auth/admin/login`, {
      username: 'ghost',
      password: 'admin123'
    });
    assertEqual(res.status, 401);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  3. VOTER REGISTRATION');
  console.log('═══════════════════════════════════════\n');

  await test('3.1 Register voter with valid data', async () => {
    const res = await request('POST', `${BASE}/auth/register`, {
      walletAddress: testWallet,
      name: 'Test Voter',
      visibleId: 'VID-TEST-001',
      faceDescriptor: faceDescriptor1,
      email: 'test@example.com',
      verificationMethod: 'FACE'
    });
    assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'Expected success');
    assert(res.body.token !== undefined, 'Missing token');
    voterToken = res.body.token;
  });

  await test('3.2 Registration rejects missing wallet address', async () => {
    const res = await request('POST', `${BASE}/auth/register`, {
      name: 'Bad Voter',
      visibleId: 'VID-BAD-001',
      faceDescriptor: generateFaceDescriptor()
    });
    assertEqual(res.status, 400);
  });

  await test('3.3 Registration rejects missing name', async () => {
    const res = await request('POST', `${BASE}/auth/register`, {
      walletAddress: '0xdeadbeef',
      visibleId: 'VID-BAD-002',
      faceDescriptor: generateFaceDescriptor()
    });
    assertEqual(res.status, 400);
  });

  await test('3.4 Registration rejects missing face descriptor', async () => {
    const res = await request('POST', `${BASE}/auth/register`, {
      walletAddress: '0xdeadbeef1234',
      name: 'No Face',
      visibleId: 'VID-NOFACE-001'
    });
    assertEqual(res.status, 400);
  });

  await test('3.5 Registration rejects invalid face descriptor (wrong length)', async () => {
    const res = await request('POST', `${BASE}/auth/register`, {
      walletAddress: '0xdeadbeef5678',
      name: 'Bad Face',
      visibleId: 'VID-BADFACE-001',
      faceDescriptor: [1, 2, 3] // Should be 128 elements
    });
    assertEqual(res.status, 400);
  });

  await test('3.6 Registration rejects duplicate wallet address', async () => {
    const res = await request('POST', `${BASE}/auth/register`, {
      walletAddress: testWallet,
      name: 'Duplicate',
      visibleId: 'VID-DUP-001',
      faceDescriptor: generateFaceDescriptor()
    });
    assert(res.status === 409 || res.status === 500, `Expected 409 or 500, got ${res.status}`);
  });

  await test('3.7 Register second voter with different face', async () => {
    const res = await request('POST', `${BASE}/auth/register`, {
      walletAddress: testWallet2,
      name: 'Voter Two',
      visibleId: 'VID-TEST-002',
      faceDescriptor: faceDescriptor2,
      email: 'voter2@example.com',
      verificationMethod: 'FACE'
    });
    assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  4. VOTER LOGIN');
  console.log('═══════════════════════════════════════\n');

  await test('4.1 Login with correct face descriptor', async () => {
    const res = await request('POST', `${BASE}/auth/login`, {
      walletAddress: testWallet,
      faceDescriptor: faceDescriptor1
    });
    assertEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert(res.body.success === true, 'Expected success');
    assert(res.body.token !== undefined, 'Missing token');
    voterToken = res.body.token;
  });

  await test('4.2 Login rejects without face descriptor', async () => {
    const res = await request('POST', `${BASE}/auth/login`, {
      walletAddress: testWallet
    });
    assertEqual(res.status, 400);
  });

  await test('4.3 Login rejects unregistered wallet', async () => {
    const res = await request('POST', `${BASE}/auth/login`, {
      walletAddress: '0x0000000000000000000000000000000000000000',
      faceDescriptor: faceDescriptor1
    });
    assertEqual(res.status, 404);
  });

  await test('4.4 Login rejects mismatched face (different person)', async () => {
    const wrongFace = generateFaceDescriptor(); // Totally different face
    const res = await request('POST', `${BASE}/auth/login`, {
      walletAddress: testWallet,
      faceDescriptor: wrongFace
    });
    assertEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  5. VOTER MANAGEMENT (API)');
  console.log('═══════════════════════════════════════\n');

  await test('5.1 GET /api/voters returns all voters', async () => {
    const res = await request('GET', `${BASE}/voters`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
    assert(res.body.length >= 2, `Expected at least 2 voters, got ${res.body.length}`);
  });

  await test('5.2 GET /api/voters/:wallet returns specific voter', async () => {
    const res = await request('GET', `${BASE}/voters/${testWallet}`);
    assertEqual(res.status, 200);
    assert(res.body.name === 'Test Voter', `Expected 'Test Voter', got '${res.body.name}'`);
  });

  await test('5.3 GET /api/voters/:wallet returns 404 for unknown wallet', async () => {
    const res = await request('GET', `${BASE}/voters/0x0000000000000000000000000000000000099999`);
    assertEqual(res.status, 404, `Expected 404, got ${res.status}`);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  6. JWT AUTH MIDDLEWARE');
  console.log('═══════════════════════════════════════\n');

  await test('6.1 Protected route rejects without token', async () => {
    const res = await request('GET', `${BASE}/auth/me`);
    assertEqual(res.status, 401);
  });

  await test('6.2 Protected route rejects with invalid token', async () => {
    const res = await request('GET', `${BASE}/auth/me`, null, {
      'Authorization': 'Bearer invalidtoken123'
    });
    assertEqual(res.status, 400);
  });

  await test('6.3 Protected route accepts valid token', async () => {
    if (!voterToken) throw new Error('No voter token from previous test');
    const res = await request('GET', `${BASE}/auth/me`, null, {
      'Authorization': `Bearer ${voterToken}`
    });
    assertEqual(res.status, 200);
    assert(res.body.user !== undefined, 'Missing user in response');
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  7. OTP SYSTEM');
  console.log('═══════════════════════════════════════\n');

  await test('7.1 Send OTP requires email', async () => {
    const res = await request('POST', `${BASE}/auth/send-otp`, {});
    assertEqual(res.status, 400);
  });

  await test('7.2 Send OTP accepts valid email', async () => {
    const res = await request('POST', `${BASE}/auth/send-otp`, {
      email: 'otp-test@example.com'
    });
    // May fail if SMTP not configured, but should not be 400
    assert(res.status === 200 || res.status === 500, 
      `Expected 200 or 500 (SMTP), got ${res.status}`);
  });

  await test('7.3 Verify OTP with dev backdoor (123456)', async () => {
    const res = await request('POST', `${BASE}/auth/verify-otp`, {
      email: 'otp-test@example.com',
      otp: '123456'
    });
    assertEqual(res.status, 200);
    assert(res.body.success === true, 'Expected success');
  });

  await test('7.4 Verify OTP rejects wrong code', async () => {
    // Send a fresh OTP first
    await request('POST', `${BASE}/auth/send-otp`, { email: 'wrong-otp@test.com' });
    const res = await request('POST', `${BASE}/auth/verify-otp`, {
      email: 'wrong-otp@test.com',
      otp: '999999'
    });
    assertEqual(res.status, 400);
  });

  await test('7.5 Verify OTP rejects missing fields', async () => {
    const res = await request('POST', `${BASE}/auth/verify-otp`, {
      email: 'test@test.com'
    });
    assertEqual(res.status, 400);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  8. ELECTIONS API');
  console.log('═══════════════════════════════════════\n');

  await test('8.1 GET /api/elections returns array', async () => {
    const res = await request('GET', `${BASE}/elections`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  9. COMMUNITY MESSAGES');
  console.log('═══════════════════════════════════════\n');

  await test('9.1 GET /api/community/messages returns array', async () => {
    const res = await request('GET', `${BASE}/community/messages?channel=General`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('9.2 POST /api/community/messages sends a message', async () => {
    const res = await request('POST', `${BASE}/community/messages`, {
      wallet_address: testWallet,
      content: 'Hello from tests!',
      channel: 'General'
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  await test('9.3 GET community messages includes sent message', async () => {
    const res = await request('GET', `${BASE}/community/messages?channel=General`);
    assertEqual(res.status, 200);
    const found = res.body.find(m => m.content === 'Hello from tests!');
    assert(found, 'Sent message not found in response');
  });

  // ─── RESULTS ──────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log(`  RESULTS: ${passed}/${totalTests} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════\n');

  // Write results JSON
  fs.writeFileSync(
    path.join(__dirname, 'backend_test_results.json'),
    JSON.stringify({ total: totalTests, passed, failed, results }, null, 2)
  );

  // Cleanup
  if (server) server.close();
  // Note: SQLite DB file cleanup skipped to avoid EBUSY on Windows

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
