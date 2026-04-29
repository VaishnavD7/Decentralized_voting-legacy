const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("D-Vote Smart Contracts", function () {
  let voting, forwarder;
  let owner, voter1, voter2, voter3, manager;

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, manager] = await ethers.getSigners();

    // Deploy Forwarder
    const Forwarder = await ethers.getContractFactory("Forwarder");
    forwarder = await Forwarder.deploy("D-Vote Forwarder");
    await forwarder.waitForDeployment();

    // Deploy Voting with Forwarder address
    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy(await forwarder.getAddress());
    await voting.waitForDeployment();
  });

  // ═══════════════════════════════════════════════════
  // 1. DEPLOYMENT TESTS
  // ═══════════════════════════════════════════════════
  describe("1. Deployment", function () {
    it("1.1 Should deploy Forwarder contract successfully", async function () {
      const addr = await forwarder.getAddress();
      expect(addr).to.be.properAddress;
    });

    it("1.2 Should deploy Voting contract successfully", async function () {
      const addr = await voting.getAddress();
      expect(addr).to.be.properAddress;
    });

    it("1.3 Should set deployer as DEFAULT_ADMIN_ROLE", async function () {
      const DEFAULT_ADMIN_ROLE = await voting.DEFAULT_ADMIN_ROLE();
      expect(await voting.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("1.4 Should set deployer as ELECTION_MANAGER", async function () {
      const ELECTION_MANAGER = await voting.ELECTION_MANAGER();
      expect(await voting.hasRole(ELECTION_MANAGER, owner.address)).to.be.true;
    });

    it("1.5 Should initialize electionCount to 0", async function () {
      expect(await voting.electionCount()).to.equal(0);
    });

    it("1.6 Should return welcome message", async function () {
      expect(await voting.getWelcomeMessage()).to.equal("Welcome to D-Vote!");
    });
  });

  // ═══════════════════════════════════════════════════
  // 2. ELECTION CREATION TESTS
  // ═══════════════════════════════════════════════════
  describe("2. Election Creation", function () {
    it("2.1 Should create an election with correct parameters", async function () {
      const now = await time.latest();
      const start = now + 60;
      const end = now + 86400;

      await voting.createElection("Test Election", start, end);

      const election = await voting.elections(1);
      expect(election.id).to.equal(1);
      expect(election.title).to.equal("Test Election");
      expect(election.startTime).to.equal(start);
      expect(election.endTime).to.equal(end);
      expect(election.active).to.be.true;
      expect(election.showResults).to.be.false;
      expect(election.deleted).to.be.false;
      expect(election.candidateCount).to.equal(0);
    });

    it("2.2 Should increment electionCount", async function () {
      const now = await time.latest();
      await voting.createElection("Election 1", now + 60, now + 86400);
      expect(await voting.electionCount()).to.equal(1);

      await voting.createElection("Election 2", now + 60, now + 86400);
      expect(await voting.electionCount()).to.equal(2);
    });

    it("2.3 Should emit ElectionCreated event", async function () {
      const now = await time.latest();
      await expect(voting.createElection("Test", now + 60, now + 86400))
        .to.emit(voting, "ElectionCreated")
        .withArgs(1, "Test");
    });

    it("2.4 Should REVERT if non-manager tries to create election", async function () {
      const now = await time.latest();
      await expect(
        voting.connect(voter1).createElection("Unauthorized", now + 60, now + 86400)
      ).to.be.reverted;
    });

    it("2.5 Should allow creating multiple elections", async function () {
      const now = await time.latest();
      for (let i = 1; i <= 5; i++) {
        await voting.createElection(`Election ${i}`, now + 60, now + 86400);
      }
      expect(await voting.electionCount()).to.equal(5);
    });
  });

  // ═══════════════════════════════════════════════════
  // 3. CANDIDATE MANAGEMENT TESTS
  // ═══════════════════════════════════════════════════
  describe("3. Candidate Management", function () {
    beforeEach(async function () {
      const now = await time.latest();
      await voting.createElection("Test Election", now + 60, now + 86400);
    });

    it("3.1 Should add a candidate to an election", async function () {
      await voting.addCandidate(1, "Alice", "Party A");
      const candidate = await voting.candidates(1, 1);
      expect(candidate.id).to.equal(1);
      expect(candidate.name).to.equal("Alice");
      expect(candidate.party).to.equal("Party A");
      expect(candidate.voteCount).to.equal(0);
    });

    it("3.2 Should increment candidateCount in election", async function () {
      await voting.addCandidate(1, "Alice", "Party A");
      await voting.addCandidate(1, "Bob", "Party B");

      const election = await voting.elections(1);
      expect(election.candidateCount).to.equal(2);
    });

    it("3.3 Should add multiple candidates with sequential IDs", async function () {
      await voting.addCandidate(1, "Alice", "Party A");
      await voting.addCandidate(1, "Bob", "Party B");
      await voting.addCandidate(1, "Charlie", "Party C");

      const candidates = await voting.getCandidates(1);
      expect(candidates.length).to.equal(3);
      expect(candidates[0].name).to.equal("Alice");
      expect(candidates[1].name).to.equal("Bob");
      expect(candidates[2].name).to.equal("Charlie");
    });

    it("3.4 Should REVERT if non-manager tries to add candidate", async function () {
      await expect(
        voting.connect(voter1).addCandidate(1, "Hacker", "Evil Party")
      ).to.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════
  // 4. VOTING TESTS
  // ═══════════════════════════════════════════════════
  describe("4. Voting", function () {
    let electionStart, electionEnd;

    beforeEach(async function () {
      const now = await time.latest();
      electionStart = now + 60;
      electionEnd = now + 86400;

      await voting.createElection("Active Election", electionStart, electionEnd);
      await voting.addCandidate(1, "Alice", "Party A");
      await voting.addCandidate(1, "Bob", "Party B");

      // Fast-forward time to election start
      await time.increaseTo(electionStart + 1);
    });

    it("4.1 Should allow voting during active election window", async function () {
      await voting.connect(voter1).vote(1, 1);

      const voter = await voting.voters(1, voter1.address);
      expect(voter.hasVoted).to.be.true;
      expect(voter.votedCandidateId).to.equal(1);
    });

    it("4.2 Should increment candidate vote count", async function () {
      await voting.connect(voter1).vote(1, 1);
      await voting.connect(voter2).vote(1, 1);
      await voting.connect(voter3).vote(1, 2);

      const candidates = await voting.getCandidates(1);
      expect(candidates[0].voteCount).to.equal(2); // Alice: 2 votes
      expect(candidates[1].voteCount).to.equal(1); // Bob: 1 vote
    });

    it("4.3 Should emit VoteCast event", async function () {
      await expect(voting.connect(voter1).vote(1, 1))
        .to.emit(voting, "VoteCast")
        .withArgs(1, voter1.address, 1);
    });

    it("4.4 Should REVERT on double voting (same voter)", async function () {
      await voting.connect(voter1).vote(1, 1);
      await expect(
        voting.connect(voter1).vote(1, 2)
      ).to.be.revertedWith("Already voted");
    });

    it("4.5 Should REVERT if election is deactivated", async function () {
      await voting.setElectionStatus(1, false);
      await expect(
        voting.connect(voter1).vote(1, 1)
      ).to.be.revertedWith("Election manually deactivated");
    });

    it("4.6 Should REVERT if voting before election starts", async function () {
      // Create a future election
      const now = await time.latest();
      await voting.createElection("Future Election", now + 3600, now + 86400);
      await voting.addCandidate(2, "Test", "Test");

      await expect(
        voting.connect(voter1).vote(2, 1)
      ).to.be.revertedWith("Election window closed");
    });

    it("4.7 Should REVERT if voting after election ends", async function () {
      // Fast-forward past election end
      await time.increaseTo(electionEnd + 1);

      await expect(
        voting.connect(voter1).vote(1, 1)
      ).to.be.revertedWith("Election window closed");
    });

    it("4.8 Should allow different voters to vote for same candidate", async function () {
      await voting.connect(voter1).vote(1, 1);
      await voting.connect(voter2).vote(1, 1);

      const candidates = await voting.getCandidates(1);
      expect(candidates[0].voteCount).to.equal(2);
    });

    it("4.9 Should allow same voter to vote in different elections", async function () {
      const now = await time.latest();
      await voting.createElection("Another Election", now - 10, now + 86400);
      await voting.addCandidate(2, "Candidate X", "Party X");

      await voting.connect(voter1).vote(1, 1); // Vote in election 1
      await voting.connect(voter1).vote(2, 1); // Vote in election 2

      const voter1InElection1 = await voting.voters(1, voter1.address);
      const voter1InElection2 = await voting.voters(2, voter1.address);
      expect(voter1InElection1.hasVoted).to.be.true;
      expect(voter1InElection2.hasVoted).to.be.true;
    });
  });

  // ═══════════════════════════════════════════════════
  // 5. ELECTION MANAGEMENT TESTS
  // ═══════════════════════════════════════════════════
  describe("5. Election Management", function () {
    beforeEach(async function () {
      const now = await time.latest();
      await voting.createElection("Managed Election", now + 60, now + 86400);
      await voting.addCandidate(1, "Alice", "Party A");
    });

    it("5.1 Should soft delete an election", async function () {
      await voting.deleteElection(1);
      const election = await voting.elections(1);
      expect(election.deleted).to.be.true;
      expect(election.active).to.be.false;
    });

    it("5.2 Should toggle results visibility", async function () {
      await voting.toggleResults(1, true);
      const election = await voting.elections(1);
      expect(election.showResults).to.be.true;
      expect(election.active).to.be.false; // Should be deactivated when showing results
    });

    it("5.3 Should toggle election active status", async function () {
      await voting.setElectionStatus(1, false);
      let election = await voting.elections(1);
      expect(election.active).to.be.false;

      await voting.setElectionStatus(1, true);
      election = await voting.elections(1);
      expect(election.active).to.be.true;
    });

    it("5.4 Should REVERT if non-manager tries to delete election", async function () {
      await expect(
        voting.connect(voter1).deleteElection(1)
      ).to.be.reverted;
    });

    it("5.5 Should REVERT if non-manager tries to toggle results", async function () {
      await expect(
        voting.connect(voter1).toggleResults(1, true)
      ).to.be.reverted;
    });

    it("5.6 Should prevent voting in deleted election", async function () {
      const now = await time.latest();
      await time.increaseTo(now + 61); // Enter election window
      await voting.deleteElection(1);

      await expect(
        voting.connect(voter1).vote(1, 1)
      ).to.be.revertedWith("Election manually deactivated");
    });
  });

  // ═══════════════════════════════════════════════════
  // 6. GETTER FUNCTIONS TESTS
  // ═══════════════════════════════════════════════════
  describe("6. Getter Functions", function () {
    it("6.1 Should return all elections via getAllElections()", async function () {
      const now = await time.latest();
      await voting.createElection("Election A", now + 60, now + 86400);
      await voting.createElection("Election B", now + 120, now + 172800);

      const allElections = await voting.getAllElections();
      expect(allElections.length).to.equal(2);
      expect(allElections[0].title).to.equal("Election A");
      expect(allElections[1].title).to.equal("Election B");
    });

    it("6.2 Should return empty array when no elections exist", async function () {
      const allElections = await voting.getAllElections();
      expect(allElections.length).to.equal(0);
    });

    it("6.3 Should return candidates for a specific election", async function () {
      const now = await time.latest();
      await voting.createElection("Test", now + 60, now + 86400);
      await voting.addCandidate(1, "Alice", "Party A");
      await voting.addCandidate(1, "Bob", "Party B");

      const candidates = await voting.getCandidates(1);
      expect(candidates.length).to.equal(2);
    });

    it("6.4 Should return empty array for election with no candidates", async function () {
      const now = await time.latest();
      await voting.createElection("Empty", now + 60, now + 86400);

      const candidates = await voting.getCandidates(1);
      expect(candidates.length).to.equal(0);
    });
  });

  // ═══════════════════════════════════════════════════
  // 7. ACCESS CONTROL TESTS
  // ═══════════════════════════════════════════════════
  describe("7. Access Control (RBAC)", function () {
    it("7.1 Should allow admin to grant ELECTION_MANAGER role", async function () {
      const ELECTION_MANAGER = await voting.ELECTION_MANAGER();
      await voting.grantRole(ELECTION_MANAGER, manager.address);
      expect(await voting.hasRole(ELECTION_MANAGER, manager.address)).to.be.true;
    });

    it("7.2 Granted manager should be able to create elections", async function () {
      const ELECTION_MANAGER = await voting.ELECTION_MANAGER();
      await voting.grantRole(ELECTION_MANAGER, manager.address);

      const now = await time.latest();
      await voting.connect(manager).createElection("Manager's Election", now + 60, now + 86400);
      expect(await voting.electionCount()).to.equal(1);
    });

    it("7.3 Should allow admin to revoke ELECTION_MANAGER role", async function () {
      const ELECTION_MANAGER = await voting.ELECTION_MANAGER();
      await voting.grantRole(ELECTION_MANAGER, manager.address);
      await voting.revokeRole(ELECTION_MANAGER, manager.address);
      expect(await voting.hasRole(ELECTION_MANAGER, manager.address)).to.be.false;
    });

    it("7.4 Revoked manager should NOT be able to create elections", async function () {
      const ELECTION_MANAGER = await voting.ELECTION_MANAGER();
      await voting.grantRole(ELECTION_MANAGER, manager.address);
      await voting.revokeRole(ELECTION_MANAGER, manager.address);

      const now = await time.latest();
      await expect(
        voting.connect(manager).createElection("Unauthorized", now + 60, now + 86400)
      ).to.be.reverted;
    });
  });

  // ═══════════════════════════════════════════════════
  // 8. EDGE CASES & STRESS TESTS
  // ═══════════════════════════════════════════════════
  describe("8. Edge Cases & Stress", function () {
    it("8.1 Should handle election with very long title", async function () {
      const now = await time.latest();
      const longTitle = "A".repeat(500);
      await voting.createElection(longTitle, now + 60, now + 86400);
      const election = await voting.elections(1);
      expect(election.title).to.equal(longTitle);
    });

    it("8.2 Should handle candidate with special characters in name", async function () {
      const now = await time.latest();
      await voting.createElection("Test", now + 60, now + 86400);
      await voting.addCandidate(1, "José María García-López", "Partido 🌟");
      const candidates = await voting.getCandidates(1);
      expect(candidates[0].name).to.equal("José María García-López");
      expect(candidates[0].party).to.equal("Partido 🌟");
    });

    it("8.3 Should handle many voters (10 voters)", async function () {
      const now = await time.latest();
      await voting.createElection("Mass Vote", now - 10, now + 86400);
      await voting.addCandidate(1, "A", "PA");
      await voting.addCandidate(1, "B", "PB");

      const signers = await ethers.getSigners();
      for (let i = 1; i <= 10; i++) {
        const candidateId = (i % 2) + 1; // Alternate between candidate 1 and 2
        await voting.connect(signers[i]).vote(1, candidateId);
      }

      const candidates = await voting.getCandidates(1);
      expect(Number(candidates[0].voteCount) + Number(candidates[1].voteCount)).to.equal(10);
    });

    it("8.4 Should handle voting near election end boundary", async function () {
      const now = await time.latest();
      const endTime = now + 100;
      await voting.createElection("Precise End", now - 10, endTime);
      await voting.addCandidate(1, "A", "P");

      // Set time to just before end time (block.timestamp advances when tx is mined)
      await time.increaseTo(endTime - 2);
      await voting.connect(voter1).vote(1, 1);

      const voter = await voting.voters(1, voter1.address);
      expect(voter.hasVoted).to.be.true;
    });
  });
});
