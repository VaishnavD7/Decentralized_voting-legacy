# System Architecture: How D-Vote Works

D-Vote is a **Hybrid Decentralized Application (dApp)**. It combines the security of Blockchain (Web3) with the usability of a traditional server (Web2) for identity verification.

---

## 1. The Three Pillars
The project consists of three distinct parts that talk to each other:

### A. The Client (Frontend)
*   **Technology**: React, Vite, Tailwind CSS, Ethers.js, face-api.js.
*   **What it does**: This is what you see. It handles the UI, connects to MetaMask, and runs the camera for face scanning.
*   **Key Interaction**:
    *   Talks to **Blockchain** to read elections and cast votes.
    *   Talks to **Server** to register users and verify faces.

### B. The Server (Backend)
*   **Technology**: Node.js, Express, SQLite (Database).
*   **What it does**: Acts as the **Identity Authority**.
*   **Why do we need it?** Blockchain cannot store large biometric data (faces) or send emails. The server bridges this gap.
*   **Database (`voting.db`)**: Stores:
    *   `Wallet Address` <-> `Face Descriptor` (128 numeric points representing your face).
    *   `Names`, `Emails`, and `User Roles` (Admin/Voter).

### C. The Blockchain (Smart Contracts)
*   **Technology**: Hardhat, Solidity (`Voting.sol`).
*   **What it does**: The **Trust Layer**. It stores the actual votes and election results.
*   **Features**:
    *   **Immutable**: Once a vote is cast, no one (not even the Admin) can delete or change it.
    *   **Transparent**: Anyone can count the votes directly from the blockchain.

---

## 2. Step-by-Step Workflows

### Scenario 1: User Registration
1.  **User** connects MetaMask (Account #1).
2.  **Client** asks user to look at the camera.
3.  **Client** uses AI (`face-api.js`) to convert the face into a unique code (Descriptor).
4.  **Client** sends `Wallet Address` + `Face Descriptor` to the **Server**.
5.  **Server** checks: *"Does this face already exist?"* (Uniqueness Check).
    *   *If Yes*: Block registration ("You already have an account!").
    *   *If No*: Save user to Database.

### Scenario 2: Logging In
1.  **User** connects MetaMask.
2.  **Server** challenges the user: *"Prove you are the owner of this wallet with your face."*
3.  **User** scans face.
4.  **Server** compares the new scan with the saved scan in the database.
    *   *Match*: Login Successful.
    *   *Mismatch*: Login Failed.

### Scenario 3: Casting a Vote
1.  **User** clicks "Vote" on Candidate A.
2.  **Client** creates a **Blockchain Transaction**.
3.  **MetaMask** pops up asking the user to sign/confirm.
4.  **Smart Contract** checks:
    *   Is the election active?
    *   Has this wallet voted before?
5.  **Smart Contract** records the vote and increments Candidate A's tally.
6.  **Smart Contract** marks the user as `voted`.

---

## 3. Security Features
*   **Sybil Resistance**: You cannot create 100 fake accounts because you only have one face. The server blocks duplicate faces.
*   **Censorship Resistance**: Once an election is created on the blockchain, the admins cannot fake the results.
*   **Privacy**: The actual image of your face is **NEVER** saved. We only save a mathematical representation (an array of numbers).
