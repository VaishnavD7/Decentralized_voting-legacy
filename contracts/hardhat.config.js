require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        hardhat: {
            chainId: 1337,
            accounts: {
                count: 100,
            },
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 1337,
        },
        sepolia: {
            url: process.env.SEPOLIA_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
    paths: {
        artifacts: "../client/src/artifacts",
    },
};
