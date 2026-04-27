import { useState } from 'react';
import { User, Mail, Phone, MapPin, Shield, Save, CheckCircle, AlertTriangle, Calendar, Fingerprint } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

const ProfileSection = ({ user, account, contract }) => {
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [name, setName] = useState(user.name || '');
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [dob, setDob] = useState(user.dob || '');
    const [gender, setGender] = useState(user.gender || '');
    const [address, setAddress] = useState(user.address || '');
    const [state, setState] = useState(user.state || '');
    const [district, setDistrict] = useState(user.district || '');
    const [pincode, setPincode] = useState(user.pincode || '');

    const saveProfile = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const response = await fetch(`${API_BASE}/voters/${account}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('vote_token')}`
                },
                body: JSON.stringify({ name, email, phone, dob, gender, address, state, district, pincode })
            });
            const data = await response.json();
            if (response.ok) {
                setMessage('Profile updated successfully.');
                setEditing(false);
            } else {
                setError(data.error || 'Update failed');
            }
        } catch (err) {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    const InfoRow = ({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="text-indigo-400" size={18} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
                <p className="text-white font-medium text-sm">{value || '—'}</p>
            </div>
        </div>
    );

    const EditField = ({ label, value, onChange, type = 'text' }) => (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm font-medium placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
        </div>
    );

    return (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-2 uppercase flex items-center gap-4">
                        Identity Profile
                        <User className="text-indigo-500" size={32} />
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">Your registered identity on the decentralized network.</p>
                </div>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        Edit Profile
                    </button>
                )}
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

            {/* Profile Header Card */}
            <div className="glass rounded-[2.5rem] p-8 md:p-12 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-28 h-28 bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl">
                        {(user.name || '?').charAt(0)}
                    </div>
                    <div className="text-center md:text-left">
                        <h3 className="text-3xl font-black text-white tracking-tight mb-2">{user.name}</h3>
                        <p className="text-slate-500 text-xs font-mono bg-white/5 inline-block px-4 py-2 rounded-lg border border-white/5 mb-3">{account}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                {user.status || 'PENDING'}
                            </span>
                            <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.role === 'ADMIN' || user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                {user.role || 'VOTER'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Details */}
            {editing ? (
                <div className="glass rounded-[2.5rem] p-8 md:p-12">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Edit Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EditField label="Full Name" value={name} onChange={setName} />
                        <EditField label="Email" value={email} onChange={setEmail} type="email" />
                        <EditField label="Phone" value={phone} onChange={setPhone} />
                        <EditField label="Date of Birth" value={dob} onChange={setDob} type="date" />
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gender</label>
                            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all">
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <EditField label="Address" value={address} onChange={setAddress} />
                        <EditField label="State" value={state} onChange={setState} />
                        <EditField label="District" value={district} onChange={setDistrict} />
                        <EditField label="Pincode" value={pincode} onChange={setPincode} />
                    </div>
                    <div className="flex gap-4 mt-8">
                        <button onClick={() => setEditing(false)} className="flex-1 py-4 bg-white/5 border border-white/5 text-slate-400 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                            Cancel
                        </button>
                        <button onClick={saveProfile} disabled={loading} className="flex-[2] py-4 bg-indigo-500 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow icon={Mail} label="Email" value={user.email} />
                    <InfoRow icon={Phone} label="Phone" value={user.phone} />
                    <InfoRow icon={Calendar} label="Date of Birth" value={user.dob} />
                    <InfoRow icon={User} label="Gender" value={user.gender} />
                    <InfoRow icon={MapPin} label="Address" value={user.address} />
                    <InfoRow icon={MapPin} label="State" value={user.state} />
                    <InfoRow icon={MapPin} label="District" value={user.district} />
                    <InfoRow icon={MapPin} label="Pincode" value={user.pincode} />
                    <InfoRow icon={Shield} label="Govt ID" value={user.govt_id} />
                    <InfoRow icon={Fingerprint} label="Biometric" value={user.face_descriptor ? 'Registered ✓' : 'Not registered'} />
                </div>
            )}
        </div>
    );
};

export default ProfileSection;
