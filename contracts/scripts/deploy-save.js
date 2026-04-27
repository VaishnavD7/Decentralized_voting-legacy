const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    await voting.waitForDeployment();
    const addr = await voting.getAddress();
    console.log("DEPLOYED_TO:" + addr);
    fs.writeFileSync("deployed_addr.txt", addr);

    // Initial data
    await (await voting.createElection("Presidential Election 2026", 0, Math.floor(Date.now() / 1000) + 86400)).wait();
    await (await voting.addCandidate(1, "Alice", "Cyber Party")).wait();
}

main().catch(console.error);
