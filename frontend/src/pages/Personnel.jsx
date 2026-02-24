import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings, Plus,
    Search, MapPin, Trash2, X, ChevronRight, BarChart3, Mail, Phone
} from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Personnel = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [personnel, setPersonnel] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast, ToastComponent } = useToast();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [companyName, setCompanyName] = useState('BuildCore');
    const [companyInitial, setCompanyInitial] = useState('B');
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', role: '', email: '', phone: '+91 ', site: '', status: 'On Site' });

    useEffect(() => {
        const updateCompanyDisplay = () => {
            const shortName = localStorage.getItem('companyShortName');
            if (shortName) { setCompanyName(shortName); setCompanyInitial(shortName[0].toUpperCase()); }
            else { setCompanyName('BuildCore'); setCompanyInitial('B'); }
        };
        updateCompanyDisplay();
        window.addEventListener('companyNameUpdated', updateCompanyDisplay);
        return () => window.removeEventListener('companyNameUpdated', updateCompanyDisplay);
    }, []);

    useEffect(() => { fetchPersonnel(); }, []);

    const fetchPersonnel = async () => {
        setLoading(true);
        try { const response = await api.get('/personnel'); setPersonnel(response.data); }
        catch (error) { console.error("Failed to fetch personnel:", error); showToast("Failed to load personnel data", "error"); }
        finally { setLoading(false); }
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        if (!value.startsWith('+91 ')) { setNewMember({ ...newMember, phone: '+91 ' }); return; }
        const numberPart = value.slice(4);
        if (!/^\d*$/.test(numberPart)) return;
        if (numberPart.length > 10) return;
        setNewMember({ ...newMember, phone: value });
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...newMember, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newMember.name)}&background=random` };
            const response = await api.post('/personnel', payload);
            if (response.status === 201) {
                setPersonnel([response.data, ...personnel]);
                setIsAddModalOpen(false);
                setNewMember({ name: '', role: '', email: '', phone: '+91 ', site: '', status: 'On Site' });
                showToast("Team member added successfully!", "success");
            }
        } catch (error) { console.error("Error adding member:", error); showToast("Failed to add member.", "error"); }
    };

    const confirmDelete = (id) => { setDeleteId(id); setIsDeleteModalOpen(true); };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/personnel/${deleteId}`);
            setPersonnel(personnel.filter(p => p._id !== deleteId));
            showToast("Team member removed successfully", "success");
            setIsDeleteModalOpen(false); setDeleteId(null);
        } catch (error) { console.error("Error deleting member:", error); showToast("Failed to delete member", "error"); }
    };

    const filteredPersonnel = useMemo(() => {
        return personnel.filter(p => {
            const q = searchQuery.toLowerCase();
            return (p.name && p.name.toLowerCase().includes(q)) ||
                (p.role && p.role.toLowerCase().includes(q)) ||
                (p.site && p.site.toLowerCase().includes(q));
        });
    }, [searchQuery, personnel]);

    const stats = useMemo(() => ({
        total: personnel.length,
        onSite: personnel.filter(p => p.status === 'On Site').length,
        remote: personnel.filter(p => p.status === 'Remote').length,
        offDuty: personnel.filter(p => p.status === 'Off Duty').length,
    }), [personnel]);

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
            {ToastComponent}

            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-6 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0"><img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" /></div>
                    <div>
                        <span className="font-semibold text-sm text-white block leading-tight">{companyName}</span>
                        <span className="text-[10px] text-white/30 font-medium">Construction Suite</span>
                    </div>
                </div>
                <nav className="flex-1 px-3 space-y-0.5 mt-2">
                    <div className="px-3 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p></div>
                    <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" href="/" />
                    <NavItem icon={<FolderOpen size={17} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={17} />} text="Personnel" active href="/personnel" />
                    <NavItem icon={<BarChart3 size={17} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />
                    <div className="px-3 mt-6 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p></div>
                    <NavItem icon={<Settings size={17} />} text="Settings" href="/settings" />
                </nav>
                <div className="px-3 pb-4">
                    <div onClick={() => navigate('/profile')} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all cursor-pointer group">
                        {currentUser?.profile_image ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10"><img src={currentUser.profile_image} alt={currentUser.username} referrerPolicy="no-referrer" className="w-full h-full object-cover" /></div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center text-violet-300 text-xs font-semibold ring-1 ring-white/10">{currentUser?.username?.[0] || 'U'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-white/80 truncate">{currentUser?.username || 'User'}</p>
                            <p className="text-[10px] text-white/25">{currentUser?.role || 'Guest'}</p>
                        </div>
                        <ChevronRight size={12} className="text-white/10 group-hover:text-white/30 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* ─── MAIN ─── */}
            <main className="flex-1 overflow-y-auto bg-[#f6f7f9]">
                <header className="sticky top-0 z-10 px-8 py-5 flex justify-between items-center bg-[#f6f7f9]/90 backdrop-blur-sm border-b border-gray-100">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Personnel</h1>
                        <p className="text-[13px] text-gray-400 mt-0.5">{stats.total} team members across all sites</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                            <input type="text" placeholder="Search members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 w-56 text-sm text-gray-600 placeholder-gray-300" />
                        </div>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-[#1a1d2e] hover:bg-[#252840] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                            <Plus size={16} strokeWidth={2.5} /> Add Member
                        </button>
                    </div>
                </header>

                <div className="px-8 py-6 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <MiniStat label="Total" value={stats.total} color="violet" />
                        <MiniStat label="On Site" value={stats.onSite} color="emerald" />
                        <MiniStat label="Remote" value={stats.remote} color="blue" />
                        <MiniStat label="Off Duty" value={stats.offDuty} color="gray" />
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Member</th>
                                    <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Site Assignment</th>
                                    <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="py-3.5 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="py-16 text-center text-gray-300 text-sm">Loading team directory...</td></tr>
                                ) : filteredPersonnel.length > 0 ? (
                                    filteredPersonnel.map((person) => (
                                        <tr key={person._id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <img src={person.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random&size=64`} alt={person.name} className="w-9 h-9 rounded-lg object-cover" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{person.name}</p>
                                                        <p className="text-[11px] text-gray-400">{person.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={11} className="text-gray-300" /> {person.email}</p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1.5"><Phone size={11} className="text-gray-300" /> {person.phone}</p>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <span className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={12} className="text-gray-300" /> {person.site}</span>
                                            </td>
                                            <td className="py-3.5 px-6"><StatusPill status={person.status} /></td>
                                            <td className="py-3.5 px-6 text-right">
                                                <button onClick={() => confirmDelete(person._id)} className="text-gray-200 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100" title="Remove">
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="py-16 text-center text-gray-300 text-sm">No personnel found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* ─── ADD MODAL ─── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
                    <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-50">
                            <h3 className="font-semibold text-base text-gray-900">Add Team Member</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <FormField label="Full Name" required type="text" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="e.g. John Doe" />
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Email" required type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} placeholder="john@example.com" />
                                <FormField label="Phone" required type="tel" value={newMember.phone} onChange={handlePhoneChange} placeholder="+91 99999 99999" />
                            </div>
                            <FormField label="Site Assignment" required type="text" value={newMember.site} onChange={e => setNewMember({ ...newMember, site: e.target.value })} placeholder="e.g. Skyline Plaza" />
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
                                <select required value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none text-sm text-gray-700 appearance-none">
                                    <option value="" disabled>Select a role</option>
                                    {['Architect', 'Civil Engineer', 'Structural Engineer', 'Site Supervisor', 'Electrician', 'Plumber', 'Carpenter', 'Mason', 'Laborer', 'Safety Officer'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-50 mt-2">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[#1a1d2e] hover:bg-[#252840] text-white text-sm font-medium rounded-lg transition-colors">Save Member</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── DELETE MODAL ─── */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
                    <div className="absolute inset-0" onClick={() => setIsDeleteModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-gray-100">
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="text-red-500" size={20} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Remove Team Member?</h3>
                        <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-2.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── SHARED COMPONENTS ───

const NavItem = ({ icon, text, active, href }) => (
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}>
        <span className={`transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
        {active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500"></div>}
    </a>
);

const MiniStat = ({ label, value, color }) => {
    const colors = {
        violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-violet-50 text-violet-500', gray: 'bg-gray-100 text-gray-500',
    };
    return (
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
            <div className="flex items-center justify-between">
                <p className="text-xl font-semibold text-gray-900">{value}</p>
                <div className={`w-2 h-2 rounded-full ${colors[color]?.split(' ')[0] || 'bg-gray-100'}`}></div>
            </div>
        </div>
    );
};

const StatusPill = ({ status }) => {
    const s = {
        'On Site': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
        'Remote': { bg: 'bg-violet-50', text: 'text-violet-500', dot: 'bg-violet-500' },
        'Off Duty': { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
    };
    const c = s[status] || s['Off Duty'];
    return (
        <span className={`${c.bg} ${c.text} text-[10px] font-semibold pl-2 pr-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
            {status}
        </span>
    );
};

const FormField = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
        <input {...props} className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none text-sm text-gray-700 placeholder-gray-300 transition-all" />
    </div>
);

export default Personnel;
