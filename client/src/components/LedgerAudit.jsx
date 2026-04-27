import { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Database, Server, RefreshCw, Terminal, AlertTriangle } from 'lucide-react';

const LedgerAudit = ({ contract }) => {
    const [blocks, setBlocks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking blockchain log data or fetching real data if API exists
        // Since we don't have a direct "getLogs" API endpoint setup for this view,
        // we'll simulate a live feed of block production and system events.
        const mockEvents = [
            { id: 1, type: 'BLOCK_PRODUCED', hash: '0xabc...123', size: '1.2MB', stamp: 'Now' },
            { id: 2, type: 'VOTE_CAST', hash: '0xdef...456', size: '0.8KB', stamp: '2s ago' },
            { id: 3, type: 'IDENTITY_VERIFIED', hash: '0xghi...789', size: '1.5KB', stamp: '5s ago' },
            { id: 4, type: 'BLOCK_PRODUCED', hash: '0xjkl...012', size: '1.1MB', stamp: '12s ago' },
            { id: 5, type: 'CONTRACT_INTERACTION', hash: '0xmno...345', size: '0.5KB', stamp: '15s ago' },
        ];

        setBlocks(mockEvents);

        const interval = setInterval(() => {
            const newEvent = {
                id: Date.now(),
                type: Math.random() > 0.5 ? 'BLOCK_PRODUCED' : 'SYSTEM_HEARTBEAT',
                hash: '0x' + Math.random().toString(16).substr(2, 32),
                size: Math.floor(Math.random() * 2000) + 'KB',
                stamp: 'Just now'
            };
            setBlocks(prev => [newEvent, ...prev].slice(0, 10));
        }, 3000);

        setTimeout(() => setLoading(false), 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 uppercase flex items-center gap-4">
                        Ledger Audit
                        <Database className="text-indigo-500" size={32} />
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
                        Real-time immutable transparency logs and blockchain health metrics.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Cards */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-xl">
                        <div className="flex items-center gap-3 mb-4 text-emerald-400">
                            <Activity size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">System Status</span>
                        </div>
                        <p className="text-3xl font-black text-white">OPERATIONAL</p>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-xl">
                        <div className="flex items-center gap-3 mb-4 text-indigo-400">
                            <Server size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Block Height</span>
                        </div>
                        <p className="text-3xl font-black text-white font-mono">#8,942,103</p>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-xl">
                        <div className="flex items-center gap-3 mb-4 text-purple-400">
                            <ShieldCheck size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Security Level</span>
                        </div>
                        <p className="text-3xl font-black text-white">MAXIMUM</p>
                    </div>
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] shadow-xl">
                        <div className="flex items-center gap-3 mb-4 text-orange-400">
                            <RefreshCw size={20} className="animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">TPS</span>
                        </div>
                        <p className="text-3xl font-black text-white">4,200</p>
                    </div>
                </div>

                {/* Main Log Console */}
                <div className="lg:col-span-2 p-8 bg-[#0A0A0F] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden font-mono">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                        <h3 className="text-lg font-bold text-slate-300 flex items-center gap-3">
                            <Terminal size={18} />
                            Live Event Stream
                        </h3>
                        <div className="flex gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                        </div>
                    </div>

                    <div className="space-y-4 h-[400px] overflow-y-auto custom-scrollbar">
                        {blocks.map((block) => (
                            <div key={block.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{block.type}</span>
                                        <span className="text-[10px] text-slate-600">{block.stamp}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 break-all">{block.hash}</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-md">{block.size}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Nodes List */}
                <div className="p-8 glass border border-white/5 rounded-[2.5rem]">
                    <h3 className="text-lg font-black text-white mb-8 tracking-tight uppercase flex items-center gap-3">
                        Active Validators
                    </h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                                <div>
                                    <p className="text-xs font-bold text-white uppercase">Validator Node 0{i}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">192.168.1.10{i}</p>
                                </div>
                                <div className="ml-auto text-[10px] font-bold text-indigo-400">99.9%</div>
                            </div>
                        ))}
                        <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all cursor-pointer opacity-50">
                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                            <div>
                                <p className="text-xs font-bold text-white uppercase">Validator Node 06</p>
                                <p className="text-[10px] text-slate-500 font-mono">192.168.1.106</p>
                            </div>
                            <div className="ml-auto text-[10px] font-bold text-amber-400">SYNCING</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LedgerAudit;
