import { useState, useEffect } from 'react';
import {
    Users,
    Vote,
    History,
    BarChart3,
    Settings,
    Shield,
    Search,
    CheckCircle,
    XCircle,
    Trash2,
    Plus,
    Save,
    Activity,
    Globe,
    Lock,
    Unlock,
    AlertTriangle,
    FileText,
    Download,
    RefreshCw
} from 'lucide-react';

const AdminDashboard = ({ contract, account }) => {
    const [activeTab, setActiveTab] = useState('voters');
    const [voters, setVoters] = useState([]);
    const [elections, setElections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // Election Creation Form State
    const [newElectionTitle, setNewElectionTitle] = useState('');
    const [electionDuration, setElectionDuration] = useState(86400); // 1 day default

    // Candidate Addition State
    const [selectedElectionId, setSelectedElectionId] = useState('');
    const [candName, setCandName] = useState('');
    const [candParty, setCandParty] = useState('');

    // Analytics State
    const [electionResults, setElectionResults] = useState({});
    const [systemSettings, setSystemSettings] = useState({
        verification_mode: 'FACE', // FACE, EMAIL, BOTH
        maintenance_mode: false
    });

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');

    const stats = {
        total: voters.length,
        approved: voters.filter(v => v.status === 'APPROVED').length,
        pending: voters.filter(v => v.status === 'PENDING').length,
        rejected: voters.filter(v => v.status === 'REJECTED').length
    };

    const filteredVoters = voters.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.wallet_address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fetchVoters = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/voters`);
            const data = await response.json();
            setVoters(data);
        } catch (err) {
            console.error("Fetch voters error:", err);
        }
    };

    const fetchElections = async () => {
        if (!contract) return;
        try {
            const data = await contract.getAllElections();
            const formatted = data.map(e => ({
                id: Number(e.id),
                title: e.title,
                active: e.active,
                showResults: e.showResults,
                deleted: e.deleted, // Capture soft delete flag
                endTime: Number(e.endTime), // Capture end time for history
                candidateCount: Number(e.candidateCount)
            }));
            setElections(formatted);
        } catch (err) {
            console.error("Fetch elections error:", err);
        }
    };

    const fetchResults = async (electionId) => {
        if (!contract) return;
        try {
            const data = await contract.getCandidates(electionId);
            const formatted = data.map(c => ({
                id: Number(c.id),
                name: c.name,
                party: c.party,
                voteCount: Number(c.voteCount)
            }));
            setElectionResults(prev => ({ ...prev, [electionId]: formatted }));
        } catch (err) {
            console.error(`Fetch results error for shard ${electionId}:`, err);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/settings`);
            if (response.ok) {
                const data = await response.json();
                setSystemSettings(data);
            }
        } catch (err) {
            console.error("Settings fetch failure");
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchVoters(), fetchElections(), fetchSettings()]).finally(() => setLoading(false));
    }, [contract]);

    useEffect(() => {
        if (activeTab === 'analytics') {
            elections.forEach(e => fetchResults(e.id));
        }
    }, [activeTab, elections]);

    const handleVoterAction = async (walletAddress, status) => {
        const token = localStorage.getItem('vote_token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/voters/${walletAddress}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                setMessage(`Voter resolution: ${status}`);
                fetchVoters();
            } else {
                setMessage('Error in cryptographic resolution.');
            }
        } catch (err) {
            setMessage('Network disruption detected.');
        }
    };

    const handleUpdateRole = async (walletAddress, role) => {
        const token = localStorage.getItem('vote_token');
        if (!window.confirm(`Are you sure you want to change this user's role to ${role}?`)) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/voters/${walletAddress}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ role })
            });

            if (response.ok) {
                setMessage(`ROLE ELEVATION/REVOCATION SUCCESS: ${role}`);
                fetchVoters();
            } else {
                const data = await response.json();
                setMessage(`OP FAILED: ${data.error}`);
            }
        } catch (err) {
            setMessage('Network disruption detected.');
        }
    };

    const handleDeleteVoter = async (walletAddress) => {
        if (!window.confirm("CRITICAL: This will permanently burn this identity from the ledger. Proceed?")) return;
        const token = localStorage.getItem('vote_token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/voters/${walletAddress}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (response.ok) {
                setMessage("IDENTITY BURNED: Registry Purge Successful");
                fetchVoters();
            } else {
                setMessage("PURGE FAILED: Authority Rejection");
            }
        } catch (err) {
            setMessage("SIGNAL FAILURE: Could not reach registry.");
        }
    };

    const handleCreateElection = async (e) => {
        e.preventDefault();
        if (!newElectionTitle) return;
        setLoading(true);
        try {
            const now = Math.floor(Date.now() / 1000);
            const endTime = now + Number(electionDuration);
            const tx = await contract.createElection(newElectionTitle, now, endTime);
            const receipt = await tx.wait();

            // Extract Election ID from event (assuming it's the first event or finding it)
            // Event: ElectionCreated(uint256 indexed electionId, string title)
            // If we can't easily parse logs here without ABI, we can fetch the latest ID.
            // Better: The contract emits the event. 
            // Simpler: Just fetch the latest count.
            const newId = await contract.electionCount();

            // Persist to DB
            await fetch(`${import.meta.env.VITE_API_URL}/elections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: Number(newId),
                    title: newElectionTitle,
                    startTime: now,
                    endTime: endTime,
                    candidateCount: 0
                })
            });

            setMessage("NEW ELECTION PROTOCOL DEPLOYED & LOGGED");
            setNewElectionTitle('');
            fetchElections();
        } catch (err) {
            console.error(err);
            setMessage("DEPLOYMENT FAILED: Ledger Rejection");
        } finally {
            setLoading(false);
        }
    };

    const handleAddCandidate = async (e) => {
        e.preventDefault();
        if (!selectedElectionId || !candName || !candParty) return;
        setLoading(true);
        try {
            const tx = await contract.addCandidate(Number(selectedElectionId), candName, candParty);
            await tx.wait();

            // Persist to DB
            // We need the new candidate ID from chain, usually it's incremental per election.
            // Safe bet: Fetch candidates count for this election from chain?
            // Or just trust the user input?
            // Actually, we can just send the data without the blockchain_id if the DB auto-increments,
            // but we want to map it.
            // Let's get the candidates from chain to be sure.
            const candidates = await contract.getCandidates(Number(selectedElectionId));
            const newCand = candidates[candidates.length - 1]; // Last added

            await fetch(`${import.meta.env.VITE_API_URL}/elections/candidates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    electionId: Number(selectedElectionId),
                    id: Number(newCand.id),
                    name: candName,
                    party: candParty
                })
            });

            setMessage(`CANDIDATE INJECTED AND PERSISTED ${selectedElectionId}`);
            setCandName('');
            setCandParty('');
            fetchElections();
        } catch (err) {
            console.error(err);
            setMessage("INJECTION FAILED: Hash Inconsistency");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleResults = async (electionId, showing) => {
        setLoading(true);
        try {
            const tx = await contract.toggleResults(electionId, !showing);
            await tx.wait();
            setMessage(showing ? `RESULTS MASKED FOR SHARD ${electionId}` : `RESULTS BROADCASTED & CORE DEACTIVATED FOR SHARD ${electionId}`);
            fetchElections();
        } catch (err) {
            console.error(err);
            setMessage("VISIBILITY UPDATE FAILED");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleElectionStatus = async (electionId, currentStatus) => {
        setLoading(true);
        try {
            const tx = await contract.setElectionStatus(electionId, !currentStatus);
            await tx.wait();
            setMessage(currentStatus ? `CORE DEACTIVATED FOR SHARD ${electionId}` : `CORE REACTIVATED FOR SHARD ${electionId}`);
            fetchElections();
        } catch (err) {
            console.error(err);
            setMessage("STATUS TOGGLE FAILED");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteElection = async (electionId) => {
        if (!window.confirm("WARNING: This will remove the election from public view. Proceed?")) return;
        setLoading(true);
        try {
            const tx = await contract.deleteElection(electionId);
            await tx.wait();
            setMessage(`SHARD ${electionId} DELETED FROM NETWORK`);
            fetchElections();
        } catch (err) {
            console.error(err);
            setMessage("DELETION FAILED");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async (updates) => {
        const token = localStorage.getItem('vote_token');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(updates)
            });
            if (response.ok) {
                setMessage("SYSTEM PROTOCOL MODIFIED");
                fetchSettings();
            }
        } catch (err) {
            setMessage("PROTOCOL MODIFICATION FAILED");
        }
    };

    return (
        <div className="w-full flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                <div>
                    <h1 className="text-6xl font-black text-white tracking-tighter mb-4 uppercase">Authority Console</h1>
                    <p className="text-slate-500 text-xl font-medium max-w-2xl leading-relaxed italic opacity-80">Root access granted. System-level authentication and global ballot matrix control active.</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex flex-wrap gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
                    <button
                        onClick={() => setActiveTab('voters')}
                        className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'voters' ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users size={16} /> Voters
                    </button>
                    <button
                        onClick={() => setActiveTab('elections')}
                        className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'elections' ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Vote size={16} /> Live Elections
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'history' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <History size={16} /> History
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'analytics' ? 'bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <BarChart3 size={16} /> Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${activeTab === 'settings' ? 'bg-slate-700 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings size={16} /> Functions
                    </button>
                </div>
            </div>

            {message && (
                <div className="p-6 bg-indigo-500/10 backdrop-blur-3xl border border-indigo-500/20 rounded-2xl flex justify-between items-center animate-in zoom-in duration-300 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Activity size={20} className="text-indigo-400" />
                        </div>
                        <span className="font-bold text-indigo-100 tracking-wide text-xs uppercase">{message}</span>
                    </div>
                    <button onClick={() => setMessage('')} className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors">
                        <XCircle size={16} className="text-indigo-400/70 hover:text-indigo-400" />
                    </button>
                </div>
            )}

            {activeTab === 'voters' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users size={64} />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Registry</p>
                            <p className="text-4xl font-black text-white">{stats.total}</p>
                        </div>
                        <div className="p-8 bg-green-500/[0.02] border border-green-500/10 rounded-3xl relative overflow-hidden group hover:border-green-500/20 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-green-500">
                                <CheckCircle size={64} />
                            </div>
                            <p className="text-[10px] font-black text-green-500/60 uppercase tracking-widest mb-2">Approved Nodes</p>
                            <p className="text-4xl font-black text-green-400">{stats.approved}</p>
                        </div>
                        <div className="p-8 bg-yellow-500/[0.02] border border-yellow-500/10 rounded-3xl relative overflow-hidden group hover:border-yellow-500/20 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-yellow-500">
                                <Activity size={64} />
                            </div>
                            <p className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest mb-2">Pending Shards</p>
                            <p className="text-4xl font-black text-yellow-400">{stats.pending}</p>
                        </div>
                        <div className="p-8 bg-red-500/[0.02] border border-red-500/10 rounded-3xl relative overflow-hidden group hover:border-red-500/20 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-500">
                                <XCircle size={64} />
                            </div>
                            <p className="text-[10px] font-black text-red-500/60 uppercase tracking-widest mb-2">Voided Entities</p>
                            <p className="text-4xl font-black text-red-400">{stats.rejected}</p>
                        </div>
                    </div>

                    {/* Voters Table */}
                    <div className="w-full bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                                <div className="p-3 bg-white/5 rounded-xl text-indigo-400">
                                    <Users size={24} />
                                </div>
                                Identity Matrix
                            </h3>
                            <div className="relative w-full md:w-96 group">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="SEARCH IDENTITY MATRIX..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-6 py-4 text-white text-xs font-bold uppercase tracking-widest placeholder:text-slate-700 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.01] border-b border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                        <th className="px-8 py-6">Entity Name</th>
                                        <th className="px-8 py-6">Credential Hash</th>
                                        <th className="px-8 py-6">Role System</th>
                                        <th className="px-8 py-6">Status State</th>
                                        <th className="px-8 py-6 text-right">Action Resolution</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-8 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <RefreshCw className="animate-spin text-indigo-500" size={32} />
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Syncing Records...</p>
                                            </div>
                                        </td></tr>
                                    ) : filteredVoters.length === 0 ? (
                                        <tr><td colSpan="5" className="px-8 py-24 text-center text-slate-600 font-medium italic">Zero records detected in the matrix.</td></tr>
                                    ) : filteredVoters.map(voter => (
                                        <tr key={voter.wallet_address} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${voter.role === 'ADMIN' ? 'from-purple-500/20 to-pink-500/20 border-purple-500/20 text-purple-400' : 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20 text-indigo-400'} border flex items-center justify-center font-black text-lg`}>
                                                        {voter.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-white tracking-tight uppercase block text-sm">{voter.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">{voter.wallet_address.substring(0, 6)}...{voter.wallet_address.substring(38)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="font-mono text-[10px] text-indigo-300/80 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/10 uppercase tracking-wider">
                                                    {voter.visible_id}
                                                </span>
                                                <p className="text-[9px] text-slate-700 mt-1.5 font-bold tracking-widest uppercase flex items-center gap-2">
                                                    SYSLOG: {voter.created_at ? new Date(voter.created_at).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] uppercase border flex w-fit items-center gap-2 ${voter.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-500/10 text-slate-400 border-white/5'}`}>
                                                    {voter.role === 'ADMIN' ? <Shield size={10} /> : <Users size={10} />}
                                                    {voter.role || 'VOTER'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border flex w-fit items-center gap-2 ${voter.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    voter.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                    }`}>
                                                    {voter.status === 'APPROVED' ? <CheckCircle size={10} /> :
                                                        voter.status === 'REJECTED' ? <XCircle size={10} /> :
                                                            <Activity size={10} />}
                                                    {voter.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    {voter.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleVoterAction(voter.wallet_address, 'APPROVED')} className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 border border-green-500/10 transition-colors" title="Approve Identity">
                                                                <CheckCircle size={14} />
                                                            </button>
                                                            <button onClick={() => handleVoterAction(voter.wallet_address, 'REJECTED')} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 border border-red-500/10 transition-colors" title="Reject Identity">
                                                                <XCircle size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {voter.status === 'APPROVED' && (
                                                        <button
                                                            onClick={() => handleUpdateRole(voter.wallet_address, voter.role === 'ADMIN' ? 'VOTER' : 'ADMIN')}
                                                            className={`p-2 rounded-lg border transition-colors ${voter.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/10 hover:bg-purple-500/20' : 'bg-slate-800 text-slate-400 border-white/5 hover:text-white'}`}
                                                            title={voter.role === 'ADMIN' ? 'Demote to Voter' : 'Promote to Admin'}
                                                        >
                                                            <Shield size={14} />
                                                        </button>
                                                    )}
                                                    {voter.role !== 'ROOT_ADMIN' && voter.wallet_address !== account.toLowerCase() && (
                                                        <button onClick={() => handleDeleteVoter(voter.wallet_address)} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 border border-white/5 hover:border-red-500/10 transition-all" title="Burn Identity">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div >
            )}

            {
                (activeTab === 'elections' || activeTab === 'history') && (
                    /* Election Management View */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-8 duration-700">
                        {activeTab === 'elections' && (
                            <div className="space-y-8">
                                {/* Create Election Form */}
                                <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                                    <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Plus size={20} /></div>
                                        Initiate Protocol
                                    </h3>
                                    <form onSubmit={handleCreateElection} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Election Identifier</label>
                                            <input
                                                type="text"
                                                value={newElectionTitle}
                                                onChange={(e) => setNewElectionTitle(e.target.value)}
                                                placeholder="E.G. NATIONAL GOVERNANCE 2026"
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-6 py-4 text-white font-bold uppercase tracking-wide placeholder:text-slate-700 focus:border-indigo-500/50 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Temporal Window</label>
                                            <div className="relative">
                                                <select
                                                    value={electionDuration}
                                                    onChange={(e) => setElectionDuration(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-6 py-4 text-white font-bold appearance-none outline-none focus:border-indigo-500/50 transition-all text-sm uppercase cursor-pointer"
                                                >
                                                    <option value="3600">1 HOUR (Testing)</option>
                                                    <option value="86400">24 HOURS (Standard)</option>
                                                    <option value="604800">7 DAYS (Enterprise)</option>
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <Activity size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <button className="w-full py-4 bg-indigo-500 text-white font-black rounded-xl shadow-lg hover:bg-indigo-600 active:scale-95 transition-all text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-3">
                                            <Vote size={16} /> Deploy Election
                                        </button>
                                    </form>
                                </div>

                                {/* Add Candidate Form */}
                                <div className="p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                                    <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Users size={20} /></div>
                                        Inject Candidate
                                    </h3>
                                    <form onSubmit={handleAddCandidate} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Target Protocol</label>
                                            <div className="relative">
                                                <select
                                                    value={selectedElectionId}
                                                    onChange={(e) => setSelectedElectionId(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-6 py-4 text-white font-bold appearance-none outline-none focus:border-purple-500/50 transition-all text-sm uppercase cursor-pointer"
                                                >
                                                    <option value="">Select Election...</option>
                                                    {elections.filter(e => !e.deleted && e.endTime >= (Date.now() / 1000)).map(e => (
                                                        <option key={e.id} value={e.id}>{e.id} - {e.title}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                                    <Vote size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Entity Name</label>
                                                <input
                                                    type="text"
                                                    value={candName}
                                                    onChange={(e) => setCandName(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-6 py-4 text-white font-bold outline-none focus:border-purple-500/50 transition-all text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Org/Party</label>
                                                <input
                                                    type="text"
                                                    value={candParty}
                                                    onChange={(e) => setCandParty(e.target.value)}
                                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-6 py-4 text-white font-bold outline-none focus:border-purple-500/50 transition-all text-sm"
                                                />
                                            </div>
                                        </div>
                                        <button className="w-full py-4 bg-purple-500 text-white font-black rounded-xl shadow-lg hover:bg-purple-600 active:scale-95 transition-all text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-3">
                                            <Save size={16} /> Bcast Candidate
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Elections List */}
                        <div className={`${activeTab === 'history' ? 'col-span-1 lg:col-span-2' : 'lg:col-span-1'} p-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] shadow-2xl h-fit`}>
                            <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300"><Globe size={20} /></div>
                                {activeTab === 'history' ? 'Archived Networks' : 'Live Network Shards'}
                            </h3>
                            <div className={`grid grid-cols-1 ${activeTab === 'history' ? 'md:grid-cols-2 lg:grid-cols-3' : 'gap-6'} gap-6`}>
                                {elections.filter(e => !e.deleted && (activeTab === 'history' ? e.endTime < (Date.now() / 1000) : e.endTime >= (Date.now() / 1000))).map(election => (
                                    <div key={election.id} className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl hover:border-indigo-500/30 transition-all group relative hover:bg-white/[0.04]">
                                        <button
                                            onClick={() => handleDeleteElection(election.id)}
                                            className="absolute top-4 right-4 text-slate-700 hover:text-red-500 transition-colors p-2"
                                            title="Delete Election"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 font-black text-sm border border-indigo-500/20">
                                                ID #{election.id}
                                            </div>
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 ${election.active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {election.active ? <Activity size={10} /> : <Lock size={10} />}
                                                {election.active ? 'Active' : 'Sealed'}
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-black text-white mb-2 tracking-tight group-hover:text-indigo-400 transition-colors uppercase leading-snug pr-8">{election.title}</h4>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <Users size={12} />
                                            Targets Logged: {election.candidateCount}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleToggleResults(election.id, election.showResults)}
                                                className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${election.showResults ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-white/5 text-slate-500 border-white/10 hover:text-white'}`}
                                            >
                                                {election.showResults ? <Unlock size={12} /> : <Lock size={12} />}
                                                {election.showResults ? 'Public' : 'Hidden'}
                                            </button>
                                            <button
                                                onClick={() => handleToggleElectionStatus(election.id, election.active)}
                                                className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${election.active ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}
                                            >
                                                {election.active ? <XCircle size={12} /> : <Activity size={12} />}
                                                {election.active ? 'Stop' : 'Start'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'analytics' && (
                    /* Analytics View */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-8 duration-700">
                        {elections.map(election => {
                            const results = electionResults[election.id] || [];
                            const total = results.reduce((sum, c) => sum + c.voteCount, 0);
                            return (
                                <div key={election.id} className="p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[60px] rounded-full"></div>
                                    <h3 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase">{election.title}</h3>
                                    <div className="flex justify-between items-end mb-10 border-b border-white/5 pb-6">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity size={12} /> Total Integrated Signals</p>
                                            <p className="text-5xl font-black text-pink-400">{total}</p>
                                        </div>
                                        <button
                                            onClick={() => window.print()}
                                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                                        >
                                            <FileText size={14} />
                                            Report
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        {results.map(candidate => {
                                            const percentage = total > 0 ? (candidate.voteCount / total) * 100 : 0;
                                            return (
                                                <div key={candidate.id} className="space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">{candidate.party}</span>
                                                            <span className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">{candidate.name} {percentage > 50 && <CheckCircle size={14} className="text-green-500" />}</span>
                                                        </div>
                                                        <span className="text-lg font-black text-white">{candidate.voteCount}</span>
                                                    </div>
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-1000 relative"
                                                            style={{ width: `${percentage}%` }}
                                                        >
                                                            <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_white]"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            }

            {
                activeTab === 'settings' && (
                    /* Advanced Functions View */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-right-8 duration-700">
                        <div className="lg:col-span-2 p-10 bg-white/[0.02] border border-white/10 rounded-[2.5rem]">
                            <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase flex items-center gap-3">
                                <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300"><Settings size={20} /></div>
                                Global Protocols
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-8 bg-white/5 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Shield size={12} /> Verification Strategy</p>
                                        <div className="space-y-2">
                                            {['FACE', 'EMAIL', 'BOTH'].map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => handleUpdateSettings({ verification_mode: mode })}
                                                    className={`w-full py-3 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-between px-4 ${systemSettings.verification_mode === mode ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg' : 'bg-black/20 text-slate-500 border-white/5 hover:text-white'}`}
                                                >
                                                    {mode} PROTOCOL
                                                    {systemSettings.verification_mode === mode && <CheckCircle size={12} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-white/5 rounded-2xl border border-white/5 space-y-6 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Save size={12} /> Data Management</p>
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => {
                                                    const headers = ["NAME,WALLET,ROLE,STATUS,TIMESTAMP\n"];
                                                    const rows = voters.map(v => `${v.name},${v.wallet_address},${v.role},${v.status},${v.created_at || new Date().toISOString()}`);
                                                    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
                                                    const encodedUri = encodeURI(csvContent);
                                                    const link = document.createElement("a");
                                                    link.setAttribute("href", encodedUri);
                                                    link.setAttribute("download", "global_registry_export.csv");
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}
                                                className="w-full py-4 bg-white text-black font-black rounded-xl text-[10px] tracking-[0.3em] uppercase shadow-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download size={14} /> Export Registry
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const headers = ["EVENT_TYPE,SOURCE,TARGET,TIMESTAMP,STATUS\n"];
                                                    const rows = voters.map(v => `IDENTITY_REGISTRATION,${v.wallet_address},REGISTRY,${v.created_at || new Date().toISOString()},${v.status}`);
                                                    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
                                                    const encodedUri = encodeURI(csvContent);
                                                    const link = document.createElement("a");
                                                    link.setAttribute("href", encodedUri);
                                                    link.setAttribute("download", "system_audit_logs.csv");
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}
                                                className="w-full py-4 bg-white/5 text-slate-300 font-black rounded-xl text-[10px] tracking-[0.3em] uppercase border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                                            >
                                                <FileText size={14} /> Audit Logs
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-red-500/[0.05] border border-red-500/10 rounded-[2.5rem] space-y-8">
                            <h3 className="text-2xl font-black text-red-400 tracking-tighter uppercase flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><AlertTriangle size={20} /></div>
                                Fail-Safe
                            </h3>
                            <div className="p-6 bg-black/40 border border-red-500/20 rounded-2xl space-y-6">
                                <p className="text-[10px] font-bold text-red-400/80 uppercase leading-relaxed tracking-wider">Global Maintenance Mode will halt all voter interactions and seal the registry immediately.</p>
                                <button
                                    onClick={() => handleUpdateSettings({ maintenance_mode: !systemSettings.maintenance_mode })}
                                    className={`w-full py-6 rounded-xl font-black text-[10px] uppercase tracking-[0.4em] border transition-all flex items-center justify-center gap-3 ${systemSettings.maintenance_mode ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.4)]' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}
                                >
                                    <Lock size={16} />
                                    {systemSettings.maintenance_mode ? 'DEACTIVATE LOCK' : 'INITIATE LOCKDOWN'}
                                </button>
                            </div>
                            <div className="pt-8 border-t border-red-500/10">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Diagnostic Telemetry</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest border-b border-white/5 pb-2">
                                        <span className="text-slate-500">Node Latency</span>
                                        <span className="text-green-500 flex items-center gap-2"><Activity size={10} /> 12ms - NOMINAL</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest pb-2">
                                        <span className="text-slate-500">Block Depth</span>
                                        <span className="text-indigo-400 flex items-center gap-2"><RefreshCw size={10} /> SYNCED : 31337</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDashboard;
