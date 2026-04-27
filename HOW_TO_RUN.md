# How to Run D-Vote (Friend's Guide)

This folder contains the full Decentralized Voting project. Follow these steps to run it on another computer (e.g., your friend's laptop).

## 1. Prerequisites
Your friend needs to install:
1.  **Node.js** (Version 16 or higher): [Download Here](https://nodejs.org/)
2.  **MetaMask Extension**: For their browser (Chrome/Brave/Edge).

---

## 2. Setup (One-Time)
To avoid compatibility issues, it's best to reinstall the dependencies.

1.  Open this folder in VS Code or a Terminal.
2.  Run the following commands to install libraries:

```bash
# Install root dependencies (if any)
npm install

# Install Contracts dependencies
cd contracts
npm install

# Install Server dependencies
cd ../server
npm install

# Install Client dependencies
cd ../client
npm install
```

---

## 3. Running the App
You need to open **three separate terminals** to run the system.

### Terminal 1: The Blockchain
Starts the local blockchain network.
```bash
cd contracts
npx hardhat node
```
*Keep this terminal running!*

### Terminal 2: Deploy & Populate
Deploys the contracts and restores the elections from the saved data.
```bash
cd contracts
# Deploy new contract
npx hardhat run scripts/deploy.js --network localhost

# Restore elections and data
npx hardhat run scripts/seed-data.js --network localhost
```

### Terminal 3: The Backend
Runs the server ID and Database.
```bash
cd server
npm start
```

### Terminal 4: The Frontend
Runs the website.
```bash
cd client
npm run dev
```

---

## 4. Connecting MetaMask
1.  Open the website (`http://localhost:5173`).
2.  Open MetaMask.
3.  Add a **Network**:
    *   **RPC URL**: `http://127.0.0.1:8545`
    *   **Chain ID**: `1337`
    *   **Symbol**: `ETH`
4.  **Import Account**:
    *   Copy the **Private Key** of Account #0 from **Terminal 1** (The Blockchain).
    *   Import it into MetaMask.
5.  Refresh and Login!

## Notes on Data
*   **User Accounts & Face ID** are stored in `server/data/voting.db`. This file is portable! If you copy it, your friend gets the same registered users.
*   **Elections** are auto-saved to `contracts/data-seed.json`. The `seed-data.js` script restores them to the blockchain every time you restart.
