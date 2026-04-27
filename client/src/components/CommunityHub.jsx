import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Hash, Users, Radio } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

const CHANNELS = ['General', 'Governance', 'Proposals', 'Off-Topic'];

const CommunityHub = ({ account, user }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeChannel, setActiveChannel] = useState('General');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [activeChannel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const response = await fetch(`${API_BASE}/community/messages?channel=${activeChannel}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.reverse ? data.reverse() : data);
            }
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            const response = await fetch(`${API_BASE}/community/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_address: account,
                    content: newMessage.trim(),
                    channel: activeChannel
                })
            });
            if (response.ok) {
                setNewMessage('');
                await fetchMessages();
            }
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 uppercase flex items-center gap-4">
                        Community Hub
                        <MessageSquare className="text-indigo-500" size={32} />
                    </h2>
                    <p className="text-slate-500 text-sm font-medium max-w-2xl leading-relaxed">
                        Decentralized communication channel for governance discussions.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Radio size={12} className="text-green-400 animate-pulse" />
                    <span className="font-black uppercase tracking-widest">Live</span>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
                {/* Channel Sidebar */}
                <div className="lg:w-64 glass rounded-[2rem] p-6 shrink-0">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                        <Hash size={12} /> Channels
                    </h3>
                    <div className="space-y-2">
                        {CHANNELS.map((channel) => (
                            <button
                                key={channel}
                                onClick={() => { setActiveChannel(channel); setLoading(true); }}
                                className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-3
                                    ${activeChannel === channel
                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Hash size={14} />
                                {channel}
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                            <Users size={12} /> Your Identity
                        </h3>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center font-black text-xs">
                                {user?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">{user?.name || 'Anonymous'}</p>
                                <p className="text-[10px] font-mono text-slate-600">{account?.substring(0, 10)}...</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 glass rounded-[2rem] flex flex-col overflow-hidden">
                    {/* Channel Header */}
                    <div className="px-8 py-5 border-b border-white/5 flex items-center gap-3">
                        <Hash className="text-indigo-400" size={18} />
                        <span className="font-black text-white uppercase tracking-tight">{activeChannel}</span>
                        <span className="text-[10px] font-bold text-slate-600 bg-white/5 px-3 py-1 rounded-full">{messages.length} messages</span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <MessageSquare className="text-slate-700 mb-4" size={48} />
                                <p className="text-slate-600 font-bold">No messages yet</p>
                                <p className="text-slate-700 text-xs">Be the first to post in #{activeChannel}</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isOwn = msg.wallet_address?.toLowerCase() === account?.toLowerCase();
                                return (
                                    <div key={msg.id || idx} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${isOwn ? 'bg-indigo-500' : 'bg-white/10'}`}>
                                            {(msg.name || '?').charAt(0)}
                                        </div>
                                        <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold ${isOwn ? 'text-indigo-400' : 'text-white'}`}>{msg.name || 'Anonymous'}</span>
                                                <span className="text-[10px] text-slate-600">{formatTime(msg.timestamp)}</span>
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl text-sm ${isOwn ? 'bg-indigo-500/20 text-indigo-100 rounded-tr-sm' : 'bg-white/5 text-slate-300 rounded-tl-sm'}`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-6 py-4 border-t border-white/5">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message #${activeChannel}...`}
                                className="flex-1 px-5 py-4 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!newMessage.trim() || sending}
                                className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityHub;
