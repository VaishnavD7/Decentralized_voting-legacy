const http = require('http');
require('dotenv').config();

const ADMIN_WALLET = process.env.ADMIN_WALLET;
const PORT = process.env.PORT || 5000;

function request(path, method, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log(`Test Admin: ${ADMIN_WALLET}`);

    // 1. Login
    console.log("1. Logging in...");
    const login = await request('/auth/login', 'POST', { walletAddress: ADMIN_WALLET });

    if (login.status !== 200) {
        console.error("Login Failed:", login);
        return;
    }

    console.log("Login Success. Role:", login.body.user.role);
    const token = login.body.token;

    // 2. Approve
    console.log("2. Approving...");
    const target = "0xe77478d9e136d3643cfc6fef578abf63f9ab91b1";
    const approve = await request(`/voters/${target}/status`, 'PATCH', { status: 'APPROVED' }, {
        'Authorization': `Bearer ${token}`
    });

    console.log("Approve Response:", approve.status, approve.body);
}

run();
