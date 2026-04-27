# 🗳️ Decentralized Voting System (D-Vote)

Welcome to **D-Vote**, a cutting-edge hybrid voting application that combines the **immutability of blockchain** with the **usability of biometric identity verification**. 

This system ensures that:
1.  **One Person = One Vote**: Using facial recognition to prevent Sybil attacks (fake accounts).
2.  **Tamper-Proof Results**: All votes are recorded on the Ethereum blockchain and cannot be altered or deleted.
3.  **Transparency**: Anyone can verify the election results directly from the blockchain.

---

## 🏗️ System Architecture

The project follows a **3-Tier Architecture**:

### 1. Client (Frontend)
-   **Role**: User Interface & Biometric Capture.
-   **Tech**: React, Vite, Tailwind CSS.
-   **Key Libraries**:
    -   `face-api.js`: AI model for scanning faces directly in the browser.
    -   `ethers.js`: Library to talk to the Blockchain (MetaMask).
    -   `axios`: HTTP client to talk to the Admin Server.

### 2. Server (Backend)
-   **Role**: Identity Authority & Admin API.
-   **Tech**: Node.js, Express.
-   **Database**: SQLite (`voting.db`).
-   **Responsibilities**:
    -   Stores `Wallet Address` <-> `Face Descriptor` mappings.
    -   Prevents duplicate registrations (Uniqueness Check).
    -   Manages Admin features (Creating elections, adding candidates).
    -   Provides detailed API for app metadata.

### 3. Blockchain (Smart Contracts)
-   **Role**: The Trust Layer.
-   **Tech**: Hardhat, Solidity.
-   **Contract**: `Voting.sol`.
-   **Responsibilities**:
    -   Stores the "State of Truth" for elections (Titles, Start/End Times).
    -   Records votes (Who voted for Whom).
    -   Calculates results.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19 | Modern UI library with Hooks. |
| | Vite | Blazing fast build tool. |
| | Tailwind CSS | Utility-first styling framework. |
| | face-api.js | TensorFlow.js based face recognition. |
| **Backend** | Node.js / Express | Robust REST API server. |
| | SQLite | Lightweight, file-based SQL database. |
| | JWT | JSON Web Tokens for secure authentication. |
| **Blockchain** | Solidity 0.8.20 | Smart Contract language. |
| | Hardhat | Ethereum development environment. |
| | Ethers.js v6 | Blockchain interaction library. |

---

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

1.  **Node.js** (v16.x or higher)
    -   Check version: `node -v`
2.  **Git**
    -   Check version: `git --version`
3.  **MetaMask Wallet** (Browser Extension)
    -   [Install Here](https://metamask.io/)

---

## 🚀 Installation & Setup

Follow these steps to set up the project on your local machine.

### 1. Clone the Repository
```bash
git clone <repository_url>
cd decentralized-voting
```

### 2. Install Dependencies
You need to install dependencies for **all three** parts of the project.

**Root (Optional tools)**
```bash
npm install
```

**Contracts (Blockchain)**
```bash
cd contracts
npm install
```

**Server (Backend)**
```bash
cd ../server
npm install
```

**Client (Frontend)**
```bash
cd ../client
npm install
```

---

## 🏃‍♂️ Execution Guide

Use **three separate terminals** to run the full stack.

### Terminal 1: The Blockchain Network
Start your local Ethereum network.
```bash
cd contracts
npx hardhat node
```
> **Output:** You will see a list of 20 Accounts with Private Keys. **Keep this running.**

### Terminal 2: Deployment & Server
Deploy contracts and start the backend.

**Step A: Deploy & Seed**
In a new terminal inside `contracts/`:
```bash
# 1. Deploy the Voting Contract
npx hardhat run scripts/deploy.js --network localhost

# 2. (Optional) Seed Sample Data
npx hardhat run scripts/seed-data.js --network localhost
```

**Step B: Start Backend**
Navigate to `server/`:
```bash
cd ../server

# Start the Express Server
npm start
```
> **Output:** `Server running on port 5000`

### Terminal 3: Frontend Client
Start the React application.
```bash
cd client
npm run dev
```
> **Output:** `Local: http://localhost:5173/`

---

## 🎮 Usage Workflows

### 1. Configure MetaMask
1.  Open MetaMask -> Settings -> Networks -> Add Network -> "Add a network manually".
2.  **Network Name**: Localhost 8545
3.  **RPC URL**: `http://127.0.0.1:8545`
4.  **Chain ID**: `1337`
5.  **Currency Symbol**: `ETH`
6.  **Import Account**: Copy a **Private Key** from Terminal 1 (Account #0 or #1) and import it into MetaMask.

### 2. User Registration (The "Voter")
1.  Go to `http://localhost:5173`.
2.  Click **"Connect Wallet"**.
3.  Navigate to **Registration**.
4.  **Face Scan**: The camera will activate. Look at the camera to generate your unique Face ID.
5.  **Submit**: Your wallet + face hash are sent to the server.
    -   *Security Note*: If you try to register again with a different wallet but the same face, the server will **BLOCK** you.

### 3. Admin Dashboard
1.  Go to the Admin Login page (or use API).
    -   **Default User**: `admin`
    -   **Default Pass**: `admin123`
2.  **Create Election**: Set Title, Start Time, End Time.
3.  **Add Candidates**: Add Name, Party, and **Symbol** (e.g., 🦅, 🍎).
4.  **Manage Voters**: Approve or Reject pending registrations.

### 4. Voting
1.  Login as a registered Voter.
2.  Go to **Active Elections**.
3.  Click **"Vote"** on your preferred candidate.
4.  **Confirm Transaction**: MetaMask will pop up. Sign the transaction.
    -   *Gas Fee*: Paid in test ETH (free on local network).
5.  **Success**: Your vote is mined and the result count updates globally.

---

## 📡 API Documentation (Backend)

Base URL: `http://localhost:5000/api`

### Auth
-   `POST /auth/register`: Register new voter (Body: `walletAddress`, `faceDescriptor`, `name`).
-   `POST /auth/login`: Login voter (Body: `walletAddress`, `faceDescriptor`).
-   `POST /auth/admin/login`: Admin login (Body: `username`, `password`).

### Elections
-   `GET /elections`: List all elections.
-   `POST /elections`: Create new election (Admin).
-   `POST /elections/candidates`: Add candidate (Admin).
-   `POST /elections/:id/votes`: Record a vote transaction hash (Authenticated).

### Voters
-   `GET /voters`: List all voters (Admin).
-   `GET /voters/:walletAddress`: Get specific voter details.

---

## 📜 Smart Contract Details (`Voting.sol`)

The `Voting` contract is the heart of the system.

-   **`createElection`**: Starts a new election event.
-   **`addCandidate`**: Adds a candidate to an election.
-   **`vote(electionId, candidateId)`**:
    -   Checks `block.timestamp` to ensure election is active.
    -   Checks `voters[electionId][msg.sender].hasVoted` to prevent double voting.
    -   Increments `candidates[...].voteCount`.
    -   Emits `VoteCast` event.

---

## 💾 Database Schema (SQLite)

The `voting.db` file contains:

1.  **`voters`**
    -   `id`, `wallet_address` (Unique), `face_descriptor` (JSON), `name`, `status` (PENDING/APPROVED).
2.  **`admins`**
    -   `username`, `password` (Hashed/Plain for demo), `role`.
3.  **`votes`**
    -   `voter_id`, `election_id`, `candidate_id`, `transaction_hash` (Proof on chain).
4.  **`elections`** & **`candidates`**
    -   Mirrors blockchain data for faster UI loading.

---

## ❓ Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Nonce too high" in MetaMask** | Reset MetaMask Account: Settings > Advanced > Clear Activity Tab Data. |
| **"Connection Refused" (Backend)** | Ensure you ran `npm start` in the `server` folder. |
| **"Face ID Error"** | Ensure distinct lighting. The model needs a clear face view. |
| **Import errors in React** | Delete `node_modules` and run `npm install` again. |

---

## 🔮 Future Enhancements
-   [ ] **Zero-Knowledge Proofs (ZKP)**: Verify identity without revealing the face descriptor to the server.
-   [ ] **Mobile App**: React Native version for voting on the go.
-   [ ] **Mainnet Deployment**: Deploy to Ethereum Mainnet or Polygon.

---

**License**: MIT
**Author**: D-Vote Team
