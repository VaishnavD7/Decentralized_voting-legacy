const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

// Load ABIs and Addresses
const forwarderAbi = require('../abi/Forwarder.json').abi;
const contractAddresses = require('../../../contracts/contract-address.json'); // Adjusted path based on structure

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
const adminWallet = new ethers.Wallet(process.env.ADMIN_WALLET_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider); // Default Hardhat Account #0

const forwarderContract = new ethers.Contract(contractAddresses.forwarder, forwarderAbi, adminWallet);

exports.relayVote = async (req, res) => {
    try {
        const { request, signature } = req.body;

        if (!request || !signature) {
            return res.status(400).json({ error: 'Missing request or signature' });
        }

        console.log("Relaying transaction for:", request.from);

        // Verify signature (Optional, contract does it, but good for saving gas if invalid)
        // const valid = await forwarderContract.verify(request, signature);
        // if (!valid) return res.status(400).json({ error: 'Invalid signature' });

        // Execute transaction
        // Execute transaction
        // ERC2771Forwarder v5 expects a single struct argument that includes signature
        const forwardRequestData = {
            ...request,
            signature: signature
        };

        const tx = await forwarderContract.execute(forwardRequestData, {
            gasLimit: 500000 // Ensure enough gas
        });

        console.log("Transaction sent:", tx.hash);

        // Wait for confirmation?
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            res.json({ success: true, txHash: tx.hash, blockNumber: receipt.blockNumber });
        } else {
            console.error("Relay transaction failed on-chain");
            res.status(500).json({ error: 'Transaction reverted on-chain' });
        }

    } catch (error) {
        console.error("Relayer Error:", error);
        res.status(500).json({ error: error.message || 'Relay failed' });
    }
};
