const hre = require("hardhat");

async function main() {
    const addresses = [
        "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        "0xCf7Ed3ACca1393a539163340a42350c0c28Ad721"
    ];

    for (const addr of addresses) {
        const code = await hre.ethers.provider.getCode(addr);
        console.log(`ADDRESS: ${addr} CODE_LENGTH: ${code.length}`);
        if (code !== "0x") {
            try {
                const Voting = await hre.ethers.getContractAt("Voting", addr);
                const count = await Voting.electionCount();
                console.log(`VALID_CONTRACT: ${addr} ELECTION_COUNT: ${count.toString()}`);
            } catch (e) { }
        }
    }
}

main().catch(console.error);
