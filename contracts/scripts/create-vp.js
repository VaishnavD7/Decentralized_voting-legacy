const hre = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";
    const Voting = await hre.ethers.getContractAt("Voting", CONTRACT_ADDRESS);
    const now = Math.round(Date.now() / 1000);

    console.log("Creating Vice-Presidential Election...");
    const tx = await Voting.createElection("Vice-Presidential Election 2026", now, now + 86400);
    await tx.wait();
    console.log("SUCCESS: Vice-Presidential Election created at " + CONTRACT_ADDRESS);

    console.log("Adding candidates...");
    await (await Voting.addCandidate(2, "Alpha Candidate", "Cyber Party")).wait();
    await (await Voting.addCandidate(2, "Beta Candidate", "Logic Shard")).wait();
    console.log("Candidates added for election ID 2.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
