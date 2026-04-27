const hre = require("hardhat");

async function main() {
    const currentTimestampInSeconds = Math.round(Date.now() / 1000);
    const unlockTime = currentTimestampInSeconds + 60;

    const Forwarder = await hre.ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy("D-Vote Forwarder");
    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log("Forwarder deployed to:", forwarderAddress);

    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(forwarderAddress);
    await voting.waitForDeployment();

    const address = await voting.getAddress();
    console.log("Voting contract deployed to:", address);

    // Save address for seed script
    const fs = require("fs");
    const addressData = JSON.stringify({ address, forwarder: forwarderAddress }, null, 2);
    fs.writeFileSync("contract-address.json", addressData);
    console.log("Contract address saved to contract-address.json");

    // Save address for frontend
    const clientPath = "../client/src/contract-address.json";
    fs.writeFileSync(clientPath, addressData);
    console.log("Contract addresses saved to client/src/contract-address.json");

    // Create a sample election
    const tx = await voting.createElection("Presidential Election 2026", currentTimestampInSeconds, currentTimestampInSeconds + 86400);
    await tx.wait();
    console.log("Sample election created.");

    const tx2 = await voting.addCandidate(1, "Alice", "Party A");
    await tx2.wait();
    console.log("Candidate Alice added.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
