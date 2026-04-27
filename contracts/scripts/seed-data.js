const hre = require("hardhat");

async function main() {
    // 1. Connect to the deployed contract
    const fs = require("fs");
    const { address } = JSON.parse(fs.readFileSync("contract-address.json", "utf8"));
    const CONTRACT_ADDRESS = address;
    console.log(`Attaching to contract at: ${CONTRACT_ADDRESS}`);
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = Voting.attach(CONTRACT_ADDRESS);

    // 2. Get Signers (Simulated Wallets)
    const signers = await hre.ethers.getSigners();
    const admin = signers[0];
    const electionId2 = 0; // Default to first election

    // 3. Create Additional Elections (Restore from DB if available)
    console.log("Restoring Elections from Persistence Layer...");
    const path = require("path");
    const dataSeedPath = path.resolve(__dirname, "../data-seed.json");

    if (fs.existsSync(dataSeedPath)) {
        const elections = JSON.parse(fs.readFileSync(dataSeedPath, "utf8"));
        console.log(`Found ${elections.length} elections to restore.`);

        for (const election of elections) {
            console.log(` - Restoring '${election.title}'...`);
            // Check if election exists on chain? Hard to check without ID mapping.
            // For now, we just create them. 
            // Ideally, we should check if the blockchain count is < election.id
            // But since local chain resets, we assume we start from 0.

            // Note: Blockchain IDs are sequential. If DB IDs match 1, 2, 3... we are good.
            const tx = await voting.createElection(election.title, election.start_time, election.end_time);
            await tx.wait();

            // Add candidates
            if (election.candidates && election.candidates.length > 0) {
                for (const candidate of election.candidates) {
                    console.log(`   + Candidate: ${candidate.name}`);
                    await (await voting.addCandidate(election.id, candidate.name, candidate.party)).wait();
                }
            }
        }
    } else {
        console.log("No persistence file found. Creating default seed data.");
        const now = Math.round(Date.now() / 1000);
        // User's Persisted Election (Fallback)
        await (await voting.createElection("NATIONAL GOVERNANCE 2026", now, now + 604800)).wait();
        console.log(" - Created 'NATIONAL GOVERNANCE 2026'");
    }


    // 4. Cast Mock Votes (from the first 5 hardhat accounts)
    console.log("Casting Mock Votes...");
    const candidates = await voting.getCandidates(electionId2); // Get candidates for Election 2
    if (candidates.length > 0) {
        for (let i = 1; i <= 5; i++) {
            const voterWallet = signers[i];
            const candidateId = candidates[i % candidates.length].id; // Distribute votes

            try {
                console.log(` - Voter ${voterWallet.address.slice(0, 6)} voting for Candidate ${candidateId}`);
                await (await voting.connect(voterWallet).vote(electionId2, candidateId)).wait();
            } catch (e) {
                console.log(`   Skipped: ${e.message.split('\'')[1] || e.message}`);
            }
        }
    }

    console.log("✅ Seeding Complete! Blockchain state restored.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
