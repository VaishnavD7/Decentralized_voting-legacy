import { useState, useEffect } from 'react';
import { Vote, Clock, Users, CheckCircle, AlertTriangle, Trophy, ChevronRight, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

const ElectionDashboard = ({ contract, account }) => {
    const [elections, setElections] = useState([]);
    const [candidates, setCandidates] = useState({});
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [votedElections, setVotedElections] = useState({});

    useEffect(() => {
        if (contract) loadElections();
    }, [contract]);

    const loadElections = async () => {
        setLoading(true);
        try {
            const allElections = await contract.getAllElections();
            const parsed = allElections
                .map((e) => ({
                    id: Number(e.id),
                    title: e.title,
                    startTime: Number(e.startTime),
                    endTime: Number(e.endTime),
                    active: e.active,
                    showResults: e.showResults,
                    deleted: e.deleted,
                    candidateCount: Number(e.candidateCount),
                }))
                .filter(e => !e.deleted);

            setElections(parsed);

            // Load candidates for each election
            const candidateMap = {};
            const votedMap = {};
            for (const election of parsed) {
                if (election.candidateCount > 0) {
                    const cands = await contract.getCandidates(election.id);
                    candidateMap[election.id] = cands.map(c => ({
                        id: Number(c.id),
                        name: c.name,
                        party: c.party,
                        voteCount: Number(c.voteCount),
                    }));
                }
                // Check if user has voted
                if (account) {
                    try {
                        const voter = await contract.voters(election.id, account);
                        votedMap[election.id] = voter.hasVoted;
                    } catch (e) {
                        votedMap[election.id] = false;
                    }
                }
            }
            setCandidates(candidateMap);
            setVotedElections(votedMap);
        } catch (err) {
            console.error("Failed to load elections:", err);
            setError("Failed to load elections from blockchain.");
        } finally {
            setLoading(false);
        }
    };

    const castVote = async (electionId, candidateId) => {
        setVoting(`${electionId}-${candidateId}`);
        setMessage('');
        setError('');
        try {
            // Try gasless relay first
            try {
                const res = await fetch(`${API_BASE}/relay`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('vote_token')}`
                    },
                    body: JSON.stringify({ electionId, candidateId, voter: account })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setMessage('Vote cast successfully via relay!');
                    await loadElections();
                    setVoting(null);
                    return;
                }
            } catch (relayErr) {
                console.log("Relay failed, trying direct:", relayErr);
            }

            // Direct vote
            const tx = await contract.vote(electionId, candidateId);
            await tx.wait();
            setMessage('Vote cast successfully!');
            await loadElections();
        } catch (err) {
            console.error("Vote error:", err);
            if (err.message?.includes("Already voted")) {
                setError("You have already voted in this election.");
            } else if (err.message?.includes("Election window closed")) {
                setError("This election's voting window has closed.");
            } else if (err.message?.includes("deactivated")) {
                setError("This election has been deactivated.");
            } else {
                setError("Failed to cast vote. " + (err.reason || err.message || ''));
            }
        } finally {
            setVoting(null);
        }
    };

    const getElectionStatus = (election) => {
        const now = Math.floor(Date.now() / 1000);
        if (!election.active) return { label: 'CLOSED', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
        if (now < election.startTime) return { label: 'UPCOMING', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
        if (now > election.endTime) return { label: 'ENDED', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
        return { label: 'LIVE', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
                <p className="text-indigo-400 font-black uppercase tracking-widest text-xs">Loading Elections...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 uppercase flex items-center gap-4">
                        Ballot Network
                        <Vote className="text-indigo-500" size={32} />
                    </h2>
                    <p className="text-slate-500 text-sm font-medium max-w-2xl leading-relaxed">
                        Active voting contracts on the decentralized ledger.
                    </p>
                </div>
                <button onClick={loadElections} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    Refresh
                </button>
            </div>

            {message && (
                <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="text-green-400 shrink-0" size={18} />
                    <p className="text-green-400 text-sm font-medium">{message}</p>
                </div>
            )}

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="text-red-400 shrink-0" size={18} />
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
            )}

            {elections.length === 0 ? (
                <div className="text-center py-24 glass rounded-[2.5rem]">
                    <Vote className="text-slate-600 mx-auto mb-6" size={48} />
                    <h3 className="text-2xl font-black text-slate-500 mb-2">No Elections</h3>
                    <p className="text-slate-600 text-sm">No active elections on the network yet.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {elections.map((election) => {
                        const status = getElectionStatus(election);
                        const electionCandidates = candidates[election.id] || [];
                        const hasVoted = votedElections[election.id];
                        const totalVotes = electionCandidates.reduce((sum, c) => sum + c.voteCount, 0);

                        return (
                            <div key={election.id} className="glass rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full"></div>

                                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${status.color}`}>
                                                {status.label}
                                            </span>
                                            {hasVoted && (
                                                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    Voted ✓
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">{election.title}</h3>
                                    </div>
                                    <div className="text-right text-xs text-slate-500 space-y-1">
                                        <div className="flex items-center gap-2"><Clock size={12} /> Start: {formatTime(election.startTime)}</div>
                                        <div className="flex items-center gap-2"><Clock size={12} /> End: {formatTime(election.endTime)}</div>
                                        <div className="flex items-center gap-2"><Users size={12} /> Total Votes: {totalVotes}</div>
                                    </div>
                                </div>

                                {electionCandidates.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {electionCandidates.map((candidate) => {
                                            const percentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(1) : 0;
                                            const isVoting = voting === `${election.id}-${candidate.id}`;
                                            const canVote = election.active && !hasVoted && status.label === 'LIVE';

                                            return (
                                                <div key={candidate.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-indigo-500/20 transition-all relative overflow-hidden group">
                                                    {election.showResults && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                                                            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-start justify-between mb-4">
                                                        <div>
                                                            <h4 className="font-black text-white text-lg">{candidate.name}</h4>
                                                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{candidate.party}</p>
                                                        </div>
                                                        {election.showResults && (
                                                            <div className="text-right">
                                                                <p className="text-2xl font-black text-indigo-400">{percentage}%</p>
                                                                <p className="text-[10px] text-slate-600 font-mono">{candidate.voteCount} votes</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {canVote && (
                                                        <button
                                                            onClick={() => castVote(election.id, candidate.id)}
                                                            disabled={isVoting}
                                                            className="w-full py-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {isVoting ? <><Loader2 size={14} className="animate-spin" /> Casting...</> : <><Vote size={14} /> Cast Vote</>}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-slate-600 text-sm text-center py-8">No candidates added yet.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ElectionDashboard;
