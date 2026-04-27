const hre = require("hardhat");

async function main() {
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.attach(contractAddress);

    console.log("Creating election: Student Council President 2026...");
    const now = Math.floor(Date.now() / 1000);
    const tx1 = await voting.createElection("Student Council President 2026", now, now + 86400);
    await tx1.wait();
    console.log("Election created!");

    console.log("Adding candidates...");
    const tx2 = await voting.addCandidate(1, "Alice Johnson", "Progressive Party");
    await tx2.wait();
    console.log("  Added: Alice Johnson - Progressive Party");

    const tx3 = await voting.addCandidate(1, "Bob Smith", "Unity Party");
    await tx3.wait();
    console.log("  Added: Bob Smith - Unity Party");

    const tx4 = await voting.addCandidate(1, "Charlie Lee", "Innovation Party");
    await tx4.wait();
    console.log("  Added: Charlie Lee - Innovation Party");

    console.log("\nDone! Election is live with 3 candidates.");
    console.log("Go to the app -> Elections tab to see it!");
}

main().catch(console.error);
