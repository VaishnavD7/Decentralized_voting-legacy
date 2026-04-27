const hre = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    const provider = hre.ethers.provider;

    console.log("Checking code at:", CONTRACT_ADDRESS);
    const code = await provider.getCode(CONTRACT_ADDRESS);

    if (code === "0x") {
        console.error("ERROR: No contract code at this address.");
    } else {
        console.log("SUCCESS: Contract code found. Length:", code.length);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
