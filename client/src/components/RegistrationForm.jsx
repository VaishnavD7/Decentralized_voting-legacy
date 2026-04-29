import { useState } from 'react';
import { UserPlus, Mail, Phone, Shield, ChevronRight, AlertTriangle, CheckCircle, Fingerprint, MapPin } from 'lucide-react';
import FaceScanner from './FaceScanner.jsx';

const API_BASE = import.meta.env.VITE_API_URL;

// Defined OUTSIDE the component to prevent re-creation on every render (fixes input focus loss)
const InputField = ({ label, value, onChange, type = 'text', placeholder, icon: Icon }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            {Icon && <Icon size={12} />}
            {label}
        </label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
    </div>
);

const RegistrationForm = ({ account, adminWallet, onRegisterSuccess }) => {
    const [step, setStep] = useState(1); // 1: info, 2: verification, 3: face scan
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form fields
    const [name, setName] = useState('');
    const [visibleId, setVisibleId] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [state, setState] = useState('');
    const [district, setDistrict] = useState('');
    const [pincode, setPincode] = useState('');
    const [govtId, setGovtId] = useState('');

    // Verification
    const [verificationMethod, setVerificationMethod] = useState('email');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);

    // Face
    const [showFaceScanner, setShowFaceScanner] = useState(false);
    const [faceDescriptor, setFaceDescriptor] = useState(null);

    const sendOTP = async () => {
        setLoading(true);
        setError('');
        try {
            const endpoint = verificationMethod === 'email' ? '/auth/send-otp' : '/auth/send-sms';
            const body = verificationMethod === 'email' ? { email } : { phone };
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                setOtpSent(true);
                setSuccess('Verification code dispatched.');
            } else {
                setError(data.error || 'Failed to send code');
            }
        } catch (err) {
            setError('Network error. Check connection.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOTP = async () => {
        setLoading(true);
        setError('');
        try {
            const endpoint = verificationMethod === 'email' ? '/auth/verify-otp' : '/auth/verify-sms';
            const body = verificationMethod === 'email' ? { email, otp } : { phone, code: otp };
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setOtpVerified(true);
                setSuccess('Identity vector verified.');
                setTimeout(() => setStep(3), 800);
            } else {
                setError(data.error || 'Invalid code');
            }
        } catch (err) {
            setError('Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleFaceScan = (descriptor) => {
        setFaceDescriptor(descriptor);
        setShowFaceScanner(false);
        submitRegistration(descriptor);
    };

    const submitRegistration = async (descriptor) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: account,
                    name,
                    visibleId,
                    faceDescriptor: descriptor || faceDescriptor,
                    email,
                    phone,
                    verificationMethod,
                    dob,
                    gender,
                    address,
                    state,
                    district,
                    pincode,
                    govt_id: govtId
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSuccess('Registration complete!');
                onRegisterSuccess(data);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError('Network error during registration.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <UserPlus className="text-indigo-400" size={32} />
                </div>
                <h2 className="text-4xl font-black tracking-tighter text-white mb-3">Register Identity</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto">Secure your digital identity on the decentralized voting network.</p>
                <p className="text-slate-600 text-xs font-mono mt-3 bg-white/5 inline-block px-4 py-2 rounded-lg">{account}</p>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-center gap-3 mb-12">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step >= s ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-600'}`}>
                            {step > s ? <CheckCircle size={18} /> : s}
                        </div>
                        {s < 3 && <div className={`w-12 h-[2px] ${step > s ? 'bg-indigo-500' : 'bg-white/5'}`}></div>}
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="text-red-400 shrink-0" size={18} />
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="text-green-400 shrink-0" size={18} />
                    <p className="text-green-400 text-sm font-medium">{success}</p>
                </div>
            )}

            <div className="glass rounded-[2.5rem] p-8 md:p-12">
                {step === 1 && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Full Name" value={name} onChange={setName} placeholder="Enter your name" />
                            <InputField label="Voter ID" value={visibleId} onChange={setVisibleId} placeholder="Unique identifier" />
                            <InputField label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" icon={Mail} />
                            <InputField label="Phone" value={phone} onChange={setPhone} placeholder="+91..." icon={Phone} />
                            <InputField label="Date of Birth" value={dob} onChange={setDob} type="date" />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gender</label>
                                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all">
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <InputField label="Address" value={address} onChange={setAddress} placeholder="Street address" icon={MapPin} />
                            <InputField label="State" value={state} onChange={setState} placeholder="State" />
                            <InputField label="District" value={district} onChange={setDistrict} placeholder="District" />
                            <InputField label="Pincode" value={pincode} onChange={setPincode} placeholder="PIN code" />
                            <InputField label="Govt ID (Aadhaar/PAN)" value={govtId} onChange={setGovtId} placeholder="ID number" icon={Shield} />
                        </div>
                        <button
                            onClick={() => { if (!name || !visibleId) { setError('Name and Voter ID are required.'); return; } setError(''); setStep(2); }}
                            className="w-full mt-6 py-5 bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:bg-indigo-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            Continue <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">Verify Identity</h3>
                        <div className="flex gap-3 mb-6">
                            <button onClick={() => setVerificationMethod('email')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${verificationMethod === 'email' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                                <Mail size={16} className="inline mr-2" /> Email OTP
                            </button>
                            <button onClick={() => setVerificationMethod('sms')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${verificationMethod === 'sms' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                                <Phone size={16} className="inline mr-2" /> SMS OTP
                            </button>
                        </div>

                        {!otpSent ? (
                            <button onClick={sendOTP} disabled={loading} className="w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-white/10 transition-all disabled:opacity-50">
                                {loading ? 'Dispatching...' : `Send Code to ${verificationMethod === 'email' ? email : phone}`}
                            </button>
                        ) : !otpVerified ? (
                            <div className="space-y-4">
                                <InputField label="Enter Verification Code" value={otp} onChange={setOtp} placeholder="6-digit code" />
                                <button onClick={verifyOTP} disabled={loading} className="w-full py-5 bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:bg-indigo-600 transition-all disabled:opacity-50">
                                    {loading ? 'Verifying...' : 'Verify Code'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
                                <p className="text-green-400 font-black uppercase tracking-widest text-sm">Verified</p>
                            </div>
                        )}

                        <button onClick={() => setStep(1)} className="w-full py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
                            ← Back
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 text-center">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-6">Biometric Scan</h3>
                        <div className="w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Fingerprint className="text-indigo-400" size={48} />
                        </div>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8">Your face scan creates a unique biometric signature. No images are stored — only a mathematical representation.</p>

                        {faceDescriptor ? (
                            <div className="py-8">
                                <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
                                <p className="text-green-400 font-black uppercase tracking-widest text-sm">Biometric Captured</p>
                                {loading && <p className="text-indigo-400 text-xs mt-4 animate-pulse">Registering...</p>}
                            </div>
                        ) : (
                            <button onClick={() => setShowFaceScanner(true)} className="px-10 py-5 bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:bg-indigo-600 transition-all active:scale-95">
                                Start Face Scan
                            </button>
                        )}

                        <button onClick={() => setStep(2)} className="w-full py-3 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
                            ← Back
                        </button>
                    </div>
                )}
            </div>

            {showFaceScanner && (
                <FaceScanner
                    title="Registration Biometric Scan"
                    onScan={handleFaceScan}
                    onCancel={() => setShowFaceScanner(false)}
                />
            )}
        </div>
    );
};

export default RegistrationForm;
