const { ethers } = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x9D5CeE69C6683559625a7e9e57B1236471914F5D";
  const NEW_MANAGER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  const Voting = await ethers.getContractFactory("Voting");
  const contract = await Voting.attach(CONTRACT_ADDRESS);
  
  const MANAGER_ROLE = await contract.ELECTION_MANAGER();
  
  console.log(`Granting ELECTION_MANAGER role to ${NEW_MANAGER}...`);
  const tx = await contract.grantRole(MANAGER_ROLE, NEW_MANAGER);
  await tx.wait();
  
  console.log("Success! Role granted on the blockchain.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
