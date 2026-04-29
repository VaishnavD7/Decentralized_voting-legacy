import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  ShieldCheck, LayoutDashboard, Vote, Users, LogOut,
  Wallet, ChevronRight, X
} from 'lucide-react';

import Voting from './artifacts/contracts/Voting.sol/Voting.json';
import Forwarder from './artifacts/contracts/Forwarder.sol/Forwarder.json';
import ContractData from './contract-address.json';

import RegistrationForm from './components/RegistrationForm.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import ElectionDashboard from './components/ElectionDashboard.jsx';
import ProfileSection from './components/ProfileSection.jsx';
import CommunityHub from './components/CommunityHub.jsx';
import LedgerAudit from './components/LedgerAudit.jsx';
import FaceScanner from './components/FaceScanner.jsx';

const CONTRACT_ADDRESS = ContractData.address;
const FORWARDER_ADDRESS = ContractData.forwarder;

const API_BASE = import.meta.env.VITE_API_URL;

const HARDHAT_ACCOUNTS = [
  { name: 'Admin', key: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', role: 'admin' },
  { name: 'Voter1', key: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', role: 'voter' },
  { name: 'Voter2', key: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', role: 'voter' },
];

function App() {
  const [account, setAccount] = useState(null);
  const [user, setUser] = useState(null);
  const [contract, setContract] = useState(null);
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isFaceLoginOpen, setIsFaceLoginOpen] = useState(false);
  const [tempAccount, setTempAccount] = useState(null);
  const [adminWallet, setAdminWallet] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchAdminWallet();
  }, []);

  const fetchAdminWallet = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/config`);
      const data = await res.json();
      if (data.adminWallet) setAdminWallet(data.adminWallet.toLowerCase());
    } catch (err) {
      console.error("Failed to fetch admin config:", err);
    }
  };

  const initLoginFlow = async (address, signerOrAccountInfo) => {
    setLoading(true);
    try {
      // Check if user exists
      const res = await fetch(`${API_BASE}/voters/${address.toLowerCase()}`);
      if (res.ok) {
        const existingUser = await res.json();
        if (existingUser && existingUser.wallet_address) {
          // User exists - need face login
          setTempAccount(address);
          setIsFaceLoginOpen(true);
          setIsLoginModalOpen(false);

          // Setup contract
          let signer;
          if (signerOrAccountInfo && signerOrAccountInfo.key) {
            const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545");
            signer = new ethers.Wallet(signerOrAccountInfo.key, provider);
          } else {
            const provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
          }
          const votingContract = new ethers.Contract(CONTRACT_ADDRESS, Voting.abi, signer);
          setContract(votingContract);
          setLoading(false);
          return;
        }
      }

      // User doesn't exist - show registration
      setAccount(address);
      setIsLoginModalOpen(false);

      // Setup contract
      let signer;
      if (signerOrAccountInfo && signerOrAccountInfo.key) {
        const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545");
        signer = new ethers.Wallet(signerOrAccountInfo.key, provider);
      } else {
        const provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      }
      const votingContract = new ethers.Contract(CONTRACT_ADDRESS, Voting.abi, signer);
      setContract(votingContract);
    } catch (err) {
      console.error("Init login flow error:", err);
      setAccount(address);
      setIsLoginModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found. Please install MetaMask.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: import.meta.env.VITE_CHAIN_ID ? `0x${parseInt(import.meta.env.VITE_CHAIN_ID).toString(16)}` : '0x539' }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: import.meta.env.VITE_CHAIN_ID ? `0x${parseInt(import.meta.env.VITE_CHAIN_ID).toString(16)}` : '0x539',
              chainName: import.meta.env.VITE_CHAIN_ID === '11155111' ? 'Sepolia Testnet' : 'Hardhat Localhost',
              rpcUrls: [import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            }],
          });
        }
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      await initLoginFlow(address, null);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect wallet.");
    }
  };

  const connectHardhat = async (accountInfo) => {
    try {
      const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545");
      const wallet = new ethers.Wallet(accountInfo.key, provider);
      const address = await wallet.getAddress();
      await initLoginFlow(address, accountInfo);
    } catch (error) {
      console.error("Hardhat connection failed:", error);
      alert("Failed to connect to local node. Is Hardhat running?");
    }
  }

  const handleFaceLogin = async (descriptor) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: tempAccount,
          faceDescriptor: descriptor
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAccount(tempAccount);
        setUser(data.user);
        if (data.token) localStorage.setItem('vote_token', data.token);
        setIsFaceLoginOpen(false);
        setTempAccount(null);
      } else {
        alert(`Login Failed: ${data.error}`);
        if (data.error.includes("re-register")) {
          setIsFaceLoginOpen(false);
        }
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Login error. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = (user && user.role?.toLowerCase() === 'admin') || (account && adminWallet && account.toLowerCase() === adminWallet.toLowerCase());

  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => { setView(id); setMobileMenuOpen(false); }}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300
        ${view === id
          ? 'bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_12px_rgba(99,102,241,0.1)] border border-indigo-500/20'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
    >
      <Icon size={18} strokeWidth={2.5} />
      <span className="font-bold text-sm tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#020205] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden pb-24 md:pb-0">

      {/* Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none animate-float"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none animate-float" style={{ animationDelay: '2s' }}></div>

      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 px-6 h-20 hidden md:flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('home')}>
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter text-gradient uppercase">D-Vote</span>
          </div>

          {account && (
            <div className="flex items-center gap-2">
              <NavItem id="home" label="Core" icon={LayoutDashboard} />
              <NavItem id="elections" label="Ballot" icon={Vote} />
              <NavItem id="community" label="Hub" icon={Users} />
              {isAdmin && <NavItem id="admin" label="Admin" icon={ShieldCheck} />}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {account && user && (
            <div
              onClick={() => setView('profile')}
              className="flex items-center gap-3 px-4 py-2 rounded-full glass-hover cursor-pointer border border-transparent"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="text-right hidden lg:block">
                <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                <p className="text-[10px] font-mono text-slate-500">{account.substring(0, 6)}...{account.substring(38)}</p>
              </div>
            </div>
          )}

          {account && (
            <button
              onClick={() => { setAccount(null); setUser(null); setView('home'); }}
              className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Disconnect"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass h-16 flex items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <ShieldCheck className="text-white" size={16} />
          </div>
          <span className="text-lg font-black tracking-tighter text-gradient uppercase">D-Vote</span>
        </div>
        {account && (
          <button
            onClick={() => setView('profile')}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs"
          >
            {user ? user.name.charAt(0) : account.charAt(2)}
          </button>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      {account && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass h-20 border-t border-white/5 flex items-center justify-around px-2 pb-2">
          <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${view === 'home' ? 'text-indigo-400' : 'text-slate-500'}`}>
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-bold uppercase">Core</span>
          </button>
          <button onClick={() => setView('elections')} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${view === 'elections' ? 'text-indigo-400' : 'text-slate-500'}`}>
            <Vote size={20} />
            <span className="text-[10px] font-bold uppercase">Vote</span>
          </button>
          <button onClick={() => setView('community')} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${view === 'community' ? 'text-indigo-400' : 'text-slate-500'}`}>
            <Users size={20} />
            <span className="text-[10px] font-bold uppercase">Hub</span>
          </button>
          {isAdmin && (
            <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${view === 'admin' ? 'text-purple-400' : 'text-slate-500'}`}>
              <ShieldCheck size={20} />
              <span className="text-[10px] font-bold uppercase">Admin</span>
            </button>
          )}
          <button onClick={() => { setAccount(null); setUser(null); setView('home'); }} className="flex flex-col items-center gap-1 p-3 rounded-2xl text-slate-500 hover:text-red-400">
            <LogOut size={20} />
            <span className="text-[10px] font-bold uppercase">Exit</span>
          </button>
        </div>
      )}

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-[2rem] p-10 shadow-2xl relative overflow-hidden">
            <button onClick={() => setIsLoginModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="text-indigo-400" size={32} />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Connect Identity</h3>
              <p className="text-slate-500 text-sm">Secure access to the decentralized voting grid.</p>
            </div>

            <div className="space-y-4">
              <button onClick={connectWallet} className="w-full flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Wallet className="text-orange-400" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white">Browser Wallet</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">MetaMask / Phantom</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-white" size={20} />
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-600"><span className="bg-[#0a0a0f] px-4">Development Nodes</span></div>
              </div>

              <div className="space-y-3">
                {HARDHAT_ACCOUNTS.map((acc, idx) => (
                  <button key={idx} onClick={() => connectHardhat(acc)} className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] hover:border-purple-500/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${acc.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'} rounded-lg flex items-center justify-center font-black text-xs`}>
                        {acc.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-white">{acc.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${acc.role === 'admin' ? 'text-purple-500' : 'text-indigo-500'}`}>{acc.role}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isFaceLoginOpen && (
        <FaceScanner
          onScan={handleFaceLogin}
          onCancel={() => {
            setIsFaceLoginOpen(false);
            setTempAccount(null);
          }}
        />
      )}

      {/* Main Content */}
      <main className="relative pt-24 md:pt-32 max-w-7xl mx-auto px-6 md:px-10 z-10 flex flex-col items-center w-full">

        {view === 'home' && !account && (
          <div className="w-full flex flex-col items-center text-center py-12 md:py-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-12 shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              Secure Blockchain Voting
            </div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] text-white">
              Decentralized <br />
              <span className="text-gradient">Governance</span>
            </h1>

            <p className="max-w-2xl text-slate-400 text-lg font-medium leading-relaxed mb-12">
              The next generation of voting. Secure your voice with immutable smart contracts and biometric identity verification.
            </p>

            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-10 py-5 bg-white text-black rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-3"
            >
              Launch App
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {account && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
                <p className="text-indigo-400 font-black uppercase tracking-widest text-xs animate-pulse">Synchronizing...</p>
              </div>
            ) : !user && view === 'home' ? (
              <RegistrationForm
                account={account}
                adminWallet={adminWallet}
                onRegisterSuccess={(data) => {
                  setUser(data.user);
                  if (data.token) localStorage.setItem('vote_token', data.token);
                }}
              />
            ) : (
              <div className="w-full">
                {view === 'home' && user && (
                  <div className="grid gap-8">
                    <div className="w-full p-8 md:p-12 glass rounded-[2.5rem] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                      <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl group-hover:rotate-6 transition-transform">
                          {user.name.charAt(0)}
                        </div>
                        <div className="text-center md:text-left">
                          <h2 className="text-4xl font-black tracking-tighter mb-2 text-white">Hello, {user.name}</h2>
                          <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                              Node {user.status || 'PENDING'}
                            </span>
                            <span className="text-slate-500 text-xs font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">{account.substring(0, 12)}...</span>
                          </div>
                        </div>
                        <div className="md:ml-auto">
                          <button onClick={() => setView('elections')} className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-indigo-50 transition-colors flex items-center gap-3 active:scale-95">
                            <Vote size={20} />
                            <span>Cast Vote</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div onClick={() => setView('elections')} className="p-8 glass-hover bg-white/[0.02] border border-white/5 rounded-[2rem] cursor-pointer group">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                          <Vote size={24} />
                        </div>
                        <h3 className="text-2xl font-black mb-2 text-white">Ballot Network</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Active voting contracts and decentralized elections.</p>
                      </div>

                      <div onClick={() => setView('audit')} className="p-8 bg-indigo-500/[0.02] border border-white/5 rounded-[2rem] cursor-pointer group hover:bg-indigo-500/5 transition-all">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                          <ShieldCheck size={24} />
                        </div>
                        <h3 className="text-2xl font-black mb-2 text-white">Ledger Audit</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">Cryptographic proof verification and live system logs.</p>
                      </div>
                    </div>
                  </div>
                )}
                {view === 'admin' && isAdmin && <AdminDashboard contract={contract} account={account} />}
                {(view === 'elections' || view === 'voting') && <ElectionDashboard contract={contract} account={account} />}
                {view === 'community' && <CommunityHub account={account} user={user} />}
                {view === 'audit' && <LedgerAudit contract={contract} />}
                {view === 'profile' && user && <ProfileSection user={user} account={account} contract={contract} />}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
