const hre = require("hardhat");

async function main() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Testing with account:", owner.address);

    const Voting = await hre.ethers.getContractFactory("Voting");
    const contractAddress = require("../contract-address.json").address;
    const voting = await Voting.attach(contractAddress);

    console.log("Fetching initial elections...");
    try {
        const initialElections = await voting.getAllElections();
        console.log("Initial count:", initialElections.length);
        initialElections.forEach(e => console.log(`- ID: ${e.id}, Title: ${e.title}`));
    } catch (err) {
        console.error("Initial fetch failed:", err);
    }

    console.log("\nCreating new election 'DEBUG TEST ELECTION'...");
    try {
        const now = Math.floor(Date.now() / 1000);
        const tx = await voting.createElection("DEBUG TEST ELECTION", now, now + 86400);
        await tx.wait();
        console.log("Transaction successful.");
    } catch (err) {
        console.error("Creation failed:", err);
        return;
    }

    console.log("\nFetching updated elections...");
    try {
        const updatedElections = await voting.getAllElections();
        console.log("Updated count:", updatedElections.length);
        updatedElections.forEach(e => console.log(`- ID: ${e.id}, Title: ${e.title}`));
    } catch (err) {
        console.error("Updated fetch failed:", err);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
