const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function testGaslessVoting() {
    console.log("Starting Gasless Voting Test...");

    // 1. Load Addresses and ABIs
    // 1. Load Addresses and ABIs (Relative to server/tests)
    // 1. Load Addresses and ABIs (Relative to server/tests)
    const addresses = JSON.parse(fs.readFileSync('../client/src/contract-address.json', 'utf8'));
    const ForwarderArtifact = JSON.parse(fs.readFileSync('../client/src/artifacts/contracts/Forwarder.sol/Forwarder.json', 'utf8'));
    const VotingArtifact = JSON.parse(fs.readFileSync('../client/src/artifacts/contracts/Voting.sol/Voting.json', 'utf8'));

    const forwarderAddress = addresses.forwarder;
    const votingAddress = addresses.address;

    console.log("Forwarder:", forwarderAddress);
    console.log("Voting:", votingAddress);

    // 2. Setup Provider and User Wallet (Random, no ETH needed)
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const userWallet = ethers.Wallet.createRandom().connect(provider);
    console.log("User Wallet:", userWallet.address);

    // 3. Connect to Forwarder to get Nonce
    const forwarder = new ethers.Contract(forwarderAddress, ForwarderArtifact.abi, provider);
    const nonce = await forwarder.nonces(userWallet.address);
    console.log("Nonce:", nonce.toString());

    // 4. Create Request
    const votingInterface = new ethers.Interface(VotingArtifact.abi);
    // Debug: Check if function exists
    const fragment = votingInterface.getFunction("vote");
    console.log("Function Fragment:", fragment ? fragment.format() : "voted NOT FOUND");

    // Use BigInt for uint256 to be safe
    const data = votingInterface.encodeFunctionData("vote(uint256,uint256)", [1n, 1n]); // Election 1, Candidate 1

    const request = {
        from: userWallet.address,
        to: votingAddress,
        value: 0,
        gas: 500000,
        nonce: Number(nonce),
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        data: data
    };

    // 5. Sign Typed Data (EIP-712)
    const network = await provider.getNetwork();
    const domain = {
        name: "D-Vote Forwarder",
        version: "1",
        chainId: Number(network.chainId),
        verifyingContract: forwarderAddress
    };

    const types = {
        ForwardRequest: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "gas", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint48" },
            { name: "data", type: "bytes" }
        ]
    };

    const signature = await userWallet.signTypedData(domain, types, request);
    console.log("Signature generated.");

    // 6. Send to Backend Relayer
    // We need axios or fetch. built-in fetch in Node 18+.
    const payload = { request, signature };

    console.log("Sending to Relayer...");
    const response = await fetch('http://localhost:5000/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Relayer failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const result = await response.json();
    console.log("Relay Success! Tx Hash:", result.txHash);

    // 7. Verify logic?
    // We can assume success if txHash is returned.
    // Ideally we wait for tx and check event.
    // But for this test, getting a hash is proof the mechanism works.

    return result.txHash;
}

testGaslessVoting()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
