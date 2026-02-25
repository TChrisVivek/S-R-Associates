import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings,
    Save, CreditCard, CloudLightning, Slack, FileJson,
    UserPlus, Loader2, ChevronRight, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { showToast, ToastComponent } = useToast();
    const { user: currentUser } = useAuth();
    const [activeSection, setActiveSection] = useState('company');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [companyInfo, setCompanyInfo] = useState({ name: "BuildCore Construction Ltd.", license: "BC-8829-X", address: "123 Industrial Way, Suite 400, Seattle, WA" });
    const [notifications, setNotifications] = useState({ lowStock: true, budgetOverrun: true, compliance: false });
    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                if (response.data) {
                    if (response.data.companyInfo) setCompanyInfo(response.data.companyInfo);
                    if (response.data.notifications) setNotifications(response.data.notifications);
                    if (response.data.companyInfo?.name) localStorage.setItem('companyShortName', response.data.companyInfo.name);
                }
            } catch (error) { console.error("Failed to load settings:", error); }
            finally { setIsLoading(false); }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put('/settings', { companyInfo, notifications });
            localStorage.setItem('companyShortName', companyInfo.name || 'BuildCore');
            window.dispatchEvent(new Event('companyNameUpdated'));
            showToast("Settings saved successfully!", "success");
        } catch (error) { console.error("Failed to save settings:", error); showToast("Failed to save settings.", "error"); }
        finally { setIsSaving(false); }
    };

    const fetchUsers = async () => {
        setIsUsersLoading(true);
        try { const res = await api.get('/users'); setUsers(res.data); }
        catch (error) { console.error("Failed to fetch users", error); showToast("Failed to load users", "error"); }
        finally { setIsUsersLoading(false); }
    };

    useEffect(() => {
        if (currentUser?.role === 'Admin') fetchUsers();
        else setIsUsersLoading(false);
    }, [currentUser]);

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            showToast("User role updated successfully", "success");
            fetchUsers();
        } catch (error) { console.error("Failed to update role", error); showToast("Failed to update user role", "error"); }
    };

    const handleCompanyChange = (e) => setCompanyInfo({ ...companyInfo, [e.target.name]: e.target.value });
    const toggleNotification = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

    const sections = [
        { id: 'company', label: 'Company Profile' },
        { id: 'users', label: 'User Management' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'integrations', label: 'Integrations' },
    ];

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
            {ToastComponent}

            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-5 flex items-center justify-center"><img src="/logo.png" alt="S R Associates" className="w-28 h-auto object-contain opacity-90" /></div>
                <nav className="flex-1 px-3 space-y-0.5 mt-2">
                    <div className="px-3 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p></div>
                    <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" href="/" />
                    <NavItem icon={<FolderOpen size={17} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={17} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<BarChart3 size={17} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />
                    <div className="px-3 mt-6 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p></div>
                    <NavItem icon={<Settings size={17} />} text="Settings" active href="/settings" />
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
                <header className="sticky top-0 z-10 px-8 py-5 bg-[#f6f7f9]/90 backdrop-blur-sm border-b border-gray-100">
                    <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-[13px] text-gray-400 mt-0.5">Manage organization, team, and preferences</p>
                </header>

                <div className="px-8 py-6 max-w-5xl mx-auto flex gap-8">
                    {/* Sub-nav */}
                    <div className="w-48 flex-shrink-0">
                        <div className="sticky top-24 space-y-0.5">
                            {sections.map(s => (
                                <button key={s.id} onClick={() => { setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeSection === s.id ? 'bg-[#1a1d2e] text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Settings Content */}
                    <div className="flex-1 space-y-6 pb-24">
                        {/* Company Profile */}
                        <div id="company" className="bg-white rounded-2xl border border-gray-100 p-6 scroll-mt-24">
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">Company Profile</h2>
                            <p className="text-xs text-gray-400 mb-5">Public information about your firm</p>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <FormField label="Company Name" name="name" value={companyInfo.name} onChange={handleCompanyChange} />
                                <FormField label="License Number" name="license" value={companyInfo.license} onChange={handleCompanyChange} />
                            </div>
                            <FormField label="Headquarters Address" name="address" value={companyInfo.address} onChange={handleCompanyChange} />
                            <div className="flex justify-end mt-5">
                                <button onClick={handleSave} disabled={isSaving || isLoading}
                                    className="bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>

                        {/* User Management */}
                        <div id="users" className="bg-white rounded-2xl border border-gray-100 overflow-hidden scroll-mt-24">
                            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900">User Management</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Manage team access levels</p>
                                </div>
                                <button className="text-xs font-medium text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                                    <UserPlus size={12} /> Invite
                                </button>
                            </div>
                            {currentUser?.role !== 'Admin' ? (
                                <div className="px-6 py-12 text-center text-gray-300 text-sm">Admin access required</div>
                            ) : isUsersLoading ? (
                                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">User</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.map(member => (
                                            <tr key={member._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-xs font-semibold text-violet-600">
                                                            {member.username?.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{member.username}</p>
                                                            <p className="text-[11px] text-gray-300">{member.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-6">
                                                    {member.role === 'Pending' ? (
                                                        <select className="text-xs border border-amber-200 rounded-md py-1 px-2 bg-amber-50 text-amber-700 font-medium outline-none"
                                                            onChange={(e) => handleRoleUpdate(member._id, e.target.value)} defaultValue="">
                                                            <option value="" disabled>Assign Role...</option>
                                                            <option value="Admin">Admin</option>
                                                            <option value="Site Manager">Site Manager</option>
                                                            <option value="Contractor">Contractor</option>
                                                            <option value="Client">Client</option>
                                                        </select>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 font-medium">{member.role}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-6">
                                                    {member.role === 'Pending' ? (
                                                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Needs Approval</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {users.length === 0 && <tr><td colSpan="3" className="py-12 text-center text-gray-300 text-sm">No users found</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Notifications */}
                        <div id="notifications" className="bg-white rounded-2xl border border-gray-100 p-6 scroll-mt-24">
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">Notification Preferences</h2>
                            <p className="text-xs text-gray-400 mb-5">Configure alerts and warnings</p>
                            <div className="space-y-5">
                                <ToggleRow title="Low Stock Alerts" desc="Notify when materials drop below 15%." enabled={notifications.lowStock} onToggle={() => toggleNotification('lowStock')} />
                                <ToggleRow title="Budget Overrun Warnings" desc="Alert if a project exceeds weekly budget." enabled={notifications.budgetOverrun} onToggle={() => toggleNotification('budgetOverrun')} />
                                <ToggleRow title="Compliance Notifications" desc="30-day advance notice for expiring certifications." enabled={notifications.compliance} onToggle={() => toggleNotification('compliance')} />
                            </div>
                        </div>

                        {/* Integrations */}
                        <div id="integrations" className="bg-white rounded-2xl border border-gray-100 p-6 scroll-mt-24">
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">App Integrations</h2>
                            <p className="text-xs text-gray-400 mb-5">Connect with your tools</p>
                            <div className="grid grid-cols-2 gap-3">
                                <IntegrationCard name="QuickBooks" desc="Accounting & Payroll" icon={<CreditCard size={16} className="text-emerald-500" />} status="Connected" color="bg-emerald-50" />
                                <IntegrationCard name="Procore" desc="Project Management" icon={<CloudLightning size={16} className="text-amber-500" />} status="Connect" color="bg-amber-50" />
                                <IntegrationCard name="Slack" desc="Communication" icon={<Slack size={16} className="text-violet-500" />} status="Connect" color="bg-violet-50" />
                                <IntegrationCard name="Bluebeam" desc="PDF Markup" icon={<FileJson size={16} className="text-red-500" />} status="Connect" color="bg-red-50" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
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

const FormField = ({ label, ...props }) => (
    <div className="mb-0">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
        <input type="text" {...props} className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none text-sm text-gray-700 transition-all" />
    </div>
);

const ToggleRow = ({ title, desc, enabled, onToggle }) => (
    <div className="flex items-center justify-between">
        <div>
            <h4 className="text-[13px] font-medium text-gray-900">{title}</h4>
            <p className="text-[11px] text-gray-400 max-w-md">{desc}</p>
        </div>
        <button onClick={onToggle} className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 ${enabled ? 'bg-violet-500' : 'bg-gray-200'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </button>
    </div>
);

const IntegrationCard = ({ name, desc, icon, status, color }) => (
    <div className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>{icon}</div>
            <div>
                <h4 className="text-xs font-medium text-gray-900">{name}</h4>
                <p className="text-[11px] text-gray-400">{desc}</p>
            </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status === 'Connected' ? 'text-emerald-600 bg-emerald-50' : 'text-violet-600 bg-violet-50'}`}>{status}</span>
    </div>
);

export default SettingsPage;
