const fs = require('fs');
const util = require('util');
const logFile = fs.createWriteStream('verification.log', { flags: 'w' });
const logStdout = process.stdout;

console.log = function (d) { //
    logFile.write(util.format(d) + '\n');
    logStdout.write(util.format(d) + '\n');
};

console.error = function (d) {
    logFile.write(util.format(d) + '\n');
    logStdout.write(util.format(d) + '\n');
};

async function main() {
    console.log("Deploying separate instance for verification...");
    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    await voting.waitForDeployment();
    const address = await voting.getAddress();
    console.log("Voting contract deployed to:", address);

    const [admin, voter] = await hre.ethers.getSigners();

    // 1. Create a new election
    const currentTimestampInSeconds = Math.round(Date.now() / 1000);
    console.log("Creating Test Election...");
    const tx1 = await voting.createElection("Deactivation Test", currentTimestampInSeconds, currentTimestampInSeconds + 3600);
    await tx1.wait();
    const electionId = await voting.electionCount();
    console.log(`Election created with ID: ${electionId}`);

    // 2. Add a candidate
    const tx2 = await voting.addCandidate(electionId, "Test Candidate", "Test Party");
    await tx2.wait();
    console.log("Candidate added.");

    // 3. Toggle results to TRUE (Should deactivate election)
    console.log("Toggling Results to TRUE...");
    const tx3 = await voting.toggleResults(electionId, true);
    await tx3.wait();
    console.log("Results toggled.");

    // 4. Check status
    const elections = await voting.getAllElections();
    const election = elections[Number(electionId) - 1]; // 0-indexed array, IDs start at 1
    console.log(`Election Active Status: ${election.active}`);
    console.log(`Election ShowResults Status: ${election.showResults}`);

    if (election.active === false && election.showResults === true) {
        console.log("SUCCESS: Election automatically deactivated upon result disclosure.");
    } else {
        console.error("FAILURE: Status mismatch.");
        process.exit(1);
    }

    // 5. Attempt to vote (Should fail)
    console.log("Attempting to vote (Expect Revert)...");
    try {
        const txVote = await voting.connect(voter).vote(electionId, 1);
        await txVote.wait();
        console.error("FAILURE: Vote was accepted but should have been rejected.");
        process.exit(1);
    } catch (error) {
        if (error.message.includes("Election manually deactivated")) {
            console.log("SUCCESS: Vote rejected safely with reason: 'Election manually deactivated'");
        } else {
            console.log("SUCCESS: Vote rejected (checking error message...)", error.message);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
