// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract Voting is AccessControl, Pausable, ReentrancyGuard, ERC2771Context {
    // Roles
    bytes32 public constant ELECTION_MANAGER = keccak256("ELECTION_MANAGER");

    // Types
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string title;
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool showResults;
        bool deleted; // Soft delete flag
        uint256 candidateCount;
    }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint256 votedCandidateId;
    }

    // State
    uint256 public electionCount;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;
    mapping(uint256 => mapping(address => Voter)) public voters;

    event ElectionCreated(uint256 indexed electionId, string title);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 candidateId);

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(ELECTION_MANAGER, _msgSender());
    }

    // Context overrides required by Solidity
    function _msgSender() internal view override(Context, ERC2771Context) returns (address sender) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Context) returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength() internal view override(Context, ERC2771Context) returns (uint256) {
        return ERC2771Context._contextSuffixLength();
    }

    function createElection(string memory _title, uint256 _startTime, uint256 _endTime) public onlyRole(ELECTION_MANAGER) {
        electionCount++;
        elections[electionCount] = Election(electionCount, _title, _startTime, _endTime, true, false, false, 0);
        emit ElectionCreated(electionCount, _title);
    }

    function deleteElection(uint256 _electionId) public onlyRole(ELECTION_MANAGER) {
        elections[_electionId].deleted = true;
        elections[_electionId].active = false; // Ensure it's inactive
    }

    function addCandidate(uint256 _electionId, string memory _name, string memory _party) public onlyRole(ELECTION_MANAGER) {
        Election storage e = elections[_electionId];
        e.candidateCount++;
        candidates[_electionId][e.candidateCount] = Candidate(e.candidateCount, _name, _party, 0);
    }

    function vote(uint256 _electionId, uint256 _candidateId) public {
        Election storage e = elections[_electionId];
        require(e.active, "Election manually deactivated");
        require(block.timestamp >= e.startTime && block.timestamp <= e.endTime, "Election window closed");
        require(!voters[_electionId][_msgSender()].hasVoted, "Already voted");
        
        voters[_electionId][_msgSender()].hasVoted = true;
        voters[_electionId][_msgSender()].votedCandidateId = _candidateId;
        candidates[_electionId][_candidateId].voteCount++;
        
        emit VoteCast(_electionId, _msgSender(), _candidateId);
    }

    function toggleResults(uint256 _electionId, bool _show) public onlyRole(ELECTION_MANAGER) {
        elections[_electionId].showResults = _show;
        if (_show) {
            elections[_electionId].active = false;
        }
    }

    function setElectionStatus(uint256 _electionId, bool _active) public onlyRole(ELECTION_MANAGER) {
        elections[_electionId].active = _active;
    }

    function getWelcomeMessage() public pure returns (string memory) {
        return "Welcome to D-Vote!";
    }

    // Getters for frontend
    function getAllElections() public view returns (Election[] memory) {
        Election[] memory allElections = new Election[](electionCount);
        for (uint256 i = 1; i <= electionCount; i++) {
            allElections[i - 1] = elections[i];
        }
        return allElections;
    }

    function getCandidates(uint256 _electionId) public view returns (Candidate[] memory) {
        uint256 count = elections[_electionId].candidateCount;
        Candidate[] memory electionCandidates = new Candidate[](count);
        for (uint256 i = 1; i <= count; i++) {
            electionCandidates[i - 1] = candidates[_electionId][i];
        }
        return electionCandidates;
    }
}
