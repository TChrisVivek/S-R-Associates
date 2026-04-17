import React, { useState, useEffect } from 'react';
import CompanyLogo from '../components/CompanyLogo';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings,
    Save, CreditCard, CloudLightning, Slack, FileJson,
    UserPlus, Loader2, ChevronRight, BarChart3, ImagePlus,
    Activity, History, X, Trash2, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import GlobalLoader from '../components/GlobalLoader';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { showToast, ToastComponent } = useToast();
    const { user: currentUser } = useAuth();
    const [activeSection, setActiveSection] = useState('company');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [companyInfo, setCompanyInfo] = useState({ name: "S R Associates Construction Ltd.", license: "BC-8829-X", address: "123 Industrial Way, Suite 400, Seattle, WA" });
    const [notifications, setNotifications] = useState({ lowStock: true, budgetOverrun: true, compliance: false });
    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);

    // Activity Log State
    const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
    const [selectedUserForActivity, setSelectedUserForActivity] = useState(null);
    const [userActivities, setUserActivities] = useState([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);

    // Invite Client State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteProjectId, setInviteProjectId] = useState('');
    const [allProjects, setAllProjects] = useState([]);
    const [isInviting, setIsInviting] = useState(false);

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
            localStorage.setItem('companyShortName', companyInfo.name || 'S R Associates');
            if (companyInfo.logoUrl) {
                localStorage.setItem('companyLogoUrl', companyInfo.logoUrl);
            }
            window.dispatchEvent(new Event('companyNameUpdated'));
            window.dispatchEvent(new Event('logoUpdated'));
            showToast("Settings saved successfully!", "success");
        } catch (error) { console.error("Failed to save settings:", error); showToast("Failed to save settings.", "error"); }
        finally { setIsSaving(false); }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingLogo(true);
        try {
            const url = await uploadToCloudinary(file);
            setCompanyInfo({ ...companyInfo, logoUrl: url });
            showToast("Logo uploaded. Click Save Changes to apply everywhere.", "success");
        } catch (error) {
            console.error("Failed to upload logo:", error);
            showToast("Failed to upload logo.", "error");
        } finally {
            setIsUploadingLogo(false);
        }
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
            setUsers(prevUsers => prevUsers.map(u => u._id === userId ? { ...u, role: newRole } : u));
        } catch (error) { console.error("Failed to update role", error); showToast("Failed to update user role", "error"); }
    };

    // Fetch projects for invite dropdown
    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setAllProjects(res.data);
        } catch (e) { console.error('Failed to fetch projects:', e); }
    };

    useEffect(() => { fetchProjects(); }, []);

    const handleInviteClient = async () => {
        if (!inviteEmail || !inviteProjectId) {
            showToast('Please fill in both email and project', 'warning');
            return;
        }
        setIsInviting(true);
        try {
            const res = await api.post('/users/invite-client', { email: inviteEmail, projectId: inviteProjectId });
            showToast(res.data.message, 'success');
            setIsInviteModalOpen(false);
            setInviteEmail('');
            setInviteProjectId('');
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to invite client', 'error');
        } finally {
            setIsInviting(false);
        }
    };

    // User Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteUser = async () => {
        if (deleteConfirmationEmail !== userToDelete.email) {
            showToast('Email does not match. Deletion aborted.', 'warning');
            return;
        }

        setIsDeleting(true);
        try {
            const res = await api.delete(`/users/${userToDelete._id}`);
            showToast(res.data.message || 'User deleted permanently.', 'success');
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            setDeleteConfirmationEmail('');
            // Refresh users
            fetchUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            showToast(error.response?.data?.message || 'Could not delete user.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCompanyChange = (e) => setCompanyInfo({ ...companyInfo, [e.target.name]: e.target.value });
    const toggleNotification = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

    const sections = [
        { id: 'company', label: 'Company Profile' },
        { id: 'users', label: 'User Management' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'integrations', label: 'Integrations' },
    ];

    const fetchUserActivities = async (user) => {
        setSelectedUserForActivity(user);
        setIsActivityPanelOpen(true);
        setIsLoadingActivities(true);
        try {
            const response = await api.get(`/users/${user._id}/activities?limit=50`);
            setUserActivities(response.data);
        } catch (error) {
            console.error('Failed to fetch user activities:', error);
            showToast("Failed to load activity logs", "error");
        } finally {
            setIsLoadingActivities(false);
        }
    };

    return (
        <>
            <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
                {ToastComponent}
                {isLoading && <GlobalLoader />}

                {/* ─── SIDEBAR ─── */}
                <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                    <div className="px-5 py-5 flex items-center justify-center"><CompanyLogo className="w-28 h-auto object-contain opacity-90" defaultLogoType="white" /></div>
                    <nav className="flex-1 px-3 space-y-0.5 mt-2">
                        <div className="px-3 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p></div>
                        <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" href="/" />
                        <NavItem icon={<FolderOpen size={17} />} text="Projects" href="/projects" />
                        {['Admin', 'Site Manager'].includes(currentUser?.role) && <NavItem icon={<Users size={17} />} text="Personnel" href="/personnel" />}
                        {['Admin'].includes(currentUser?.role) && <NavItem icon={<BarChart3 size={17} />} text="Budget" href="/budget" />}
                        {['Admin', 'Site Manager', 'Client'].includes(currentUser?.role) && <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />}
                        {['Admin', 'Site Manager'].includes(currentUser?.role) && (
                            <>
                                <div className="px-3 mt-6 mb-3">
                                    <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p>
                                </div>
                                <NavItem icon={<Settings size={17} />} text="Settings" active href="/settings" />
                            </>
                        )}
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
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-blue-500" />
                            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                        </div>
                        <p className="text-sm text-gray-400 ml-3">Manage organization, team, and preferences</p>
                    </header>

                    <div className="px-8 py-6 max-w-5xl mx-auto flex gap-8">
                        {/* Sub-nav */}
                        <div className="w-48 flex-shrink-0">
                            <div className="sticky top-24 space-y-0.5">
                                {sections.map(s => (
                                    <button key={s.id} onClick={() => setActiveSection(s.id)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeSection === s.id ? 'bg-[#1a1d2e] text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Settings Content */}
                        <div className="flex-1 pb-24">
                            {/* Company Profile */}
                            {activeSection === 'company' && (
                                <div id="company" className="bg-white rounded-2xl border border-gray-100 p-6">
                                    <h2 className="text-sm font-semibold text-gray-900 mb-1">Company Profile</h2>
                                    <p className="text-xs text-gray-400 mb-5">Public information about your firm</p>

                                    <div className="mb-6 flex items-center gap-6">
                                        <div className="w-20 h-20 bg-[#0f1117] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                            {isUploadingLogo ? (
                                                <Loader2 className="animate-spin text-gray-400" size={24} />
                                            ) : companyInfo.logoUrl ? (
                                                <img src={companyInfo.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <CompanyLogo className="w-full h-full object-contain p-2" defaultLogoType="dark" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-900 mb-1">Company Logo</h3>
                                            <p className="text-[11px] text-gray-400 max-w-sm mb-3">
                                                Upload a high-resolution logo. This will be displayed on reports, login screens, and the sidebar.
                                            </p>
                                            <div className="inline-block relative">
                                                <input type="file" id="logoUpload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                                                <label htmlFor="logoUpload" className={`cursor-pointer bg-white border border-gray-200 text-gray-700 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors flex items-center gap-2 ${isUploadingLogo ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}`}>
                                                    <ImagePlus size={14} />
                                                    <span>{isUploadingLogo ? 'Uploading...' : 'Select Image'}</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <FormField label="Company Name" name="name" value={companyInfo.name || ''} onChange={handleCompanyChange} />
                                        <FormField label="License Number" name="license" value={companyInfo.license || ''} onChange={handleCompanyChange} />
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
                            )}

                            {/* User Management */}
                            {activeSection === 'users' && (
                                <div id="users" className="bg-white rounded-[20px] shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
                                        <div>
                                            <h2 className="text-base font-semibold text-gray-900">User Management</h2>
                                            <p className="text-xs text-gray-500 mt-1">Manage team access and assigned roles</p>
                                        </div>
                                        <button
                                            onClick={() => setIsInviteModalOpen(true)}
                                            className="text-xs font-semibold text-white bg-[#1a1d2e] hover:bg-[#252840] hover:shadow-md px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
                                        >
                                            <UserPlus size={14} /> Invite Client
                                        </button>
                                    </div>
                                    {currentUser?.role !== 'Admin' ? (
                                        <div className="px-6 py-12 text-center text-gray-300 text-sm">Admin access required</div>
                                    ) : isUsersLoading ? (
                                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
                                    ) : (
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-gray-50/80">
                                                <tr className="border-b border-gray-200">
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {users.map(member => (
                                                    <tr key={member._id} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3.5">
                                                                {member.profile_image ? (
                                                                    <img src={member.profile_image} alt={member.username} className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm shrink-0 bg-white" />
                                                                ) : (
                                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200/50 flex items-center justify-center text-xs font-bold text-violet-700 shadow-sm shrink-0">
                                                                        {member.username?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <p className="text-[13px] font-semibold text-gray-900 leading-tight">{member.username}</p>
                                                                    <p className="text-[11px] font-medium text-gray-500 mt-0.5">{member.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <select
                                                                className={`text-xs border rounded-lg py-1.5 px-3 font-semibold outline-none focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                                                                    ${member.role === 'Pending' ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300'
                                                                        : member.role === 'Blocked' ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'
                                                                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white hover:border-gray-300 shadow-sm'}`}
                                                                onChange={(e) => handleRoleUpdate(member._id, e.target.value)}
                                                                defaultValue={member.role}
                                                                disabled={member.username === currentUser?.username}
                                                            >
                                                                {member.role === 'Pending' && <option value="Pending" disabled>Assign Role...</option>}
                                                                <option value="Admin">Admin</option>
                                                                <option value="Site Manager">Site Manager</option>
                                                                <option value="Contractor">Contractor</option>
                                                                <option value="Client">Client</option>
                                                                <option value="Blocked" className="text-red-600 font-semibold">Block Access</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            {member.role === 'Pending' ? (
                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 border border-amber-200 bg-amber-50 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Needs Approval</span>
                                                            ) : member.role === 'Blocked' ? (
                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-700 border border-red-200 bg-red-50 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Restricted</span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 bg-emerald-50 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Active</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                <button
                                                                    onClick={() => fetchUserActivities(member)}
                                                                    className="text-gray-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all bg-white shadow-sm"
                                                                    title="View Activity Logs"
                                                                >
                                                                    <History size={15} />
                                                                </button>
                                                                {member.username !== currentUser?.username && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setUserToDelete(member);
                                                                            setDeleteConfirmationEmail('');
                                                                            setIsDeleteModalOpen(true);
                                                                        }}
                                                                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-all bg-white shadow-sm"
                                                                        title="Delete User"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {users.length === 0 && <tr><td colSpan="3" className="py-12 text-center text-gray-300 text-sm">No users found</td></tr>}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* Notifications */}
                            {activeSection === 'notifications' && (
                                <div id="notifications" className="bg-white rounded-2xl border border-gray-100 p-6">
                                    <h2 className="text-sm font-semibold text-gray-900 mb-1">Notification Preferences</h2>
                                    <p className="text-xs text-gray-400 mb-5">Configure alerts and warnings</p>
                                    <div className="space-y-5">
                                        <ToggleRow title="Low Stock Alerts" desc="Notify when materials drop below 15%." enabled={notifications.lowStock} onToggle={() => toggleNotification('lowStock')} />
                                        <ToggleRow title="Budget Overrun Warnings" desc="Alert if a project exceeds weekly budget." enabled={notifications.budgetOverrun} onToggle={() => toggleNotification('budgetOverrun')} />
                                        <ToggleRow title="Compliance Notifications" desc="30-day advance notice for expiring certifications." enabled={notifications.compliance} onToggle={() => toggleNotification('compliance')} />
                                    </div>
                                </div>
                            )}

                            {/* Integrations */}
                            {activeSection === 'integrations' && (
                                <div id="integrations" className="bg-white rounded-2xl border border-gray-100 p-6">
                                    <h2 className="text-sm font-semibold text-gray-900 mb-1">App Integrations</h2>
                                    <p className="text-xs text-gray-400 mb-5">Connect with your tools</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <IntegrationCard name="QuickBooks" desc="Accounting & Payroll" icon={<CreditCard size={16} className="text-emerald-500" />} status="Connected" color="bg-emerald-50" />
                                        <IntegrationCard name="Procore" desc="Project Management" icon={<CloudLightning size={16} className="text-amber-500" />} status="Connect" color="bg-amber-50" />
                                        <IntegrationCard name="Slack" desc="Communication" icon={<Slack size={16} className="text-violet-500" />} status="Connect" color="bg-violet-50" />
                                        <IntegrationCard name="Bluebeam" desc="PDF Markup" icon={<FileJson size={16} className="text-red-500" />} status="Connect" color="bg-red-50" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Activity Log Side Panel */}
                {isActivityPanelOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] z-40 transition-opacity"
                            onClick={() => setIsActivityPanelOpen(false)}
                        />
                        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-100 flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                        <Activity size={18} className="text-indigo-500" />
                                        Activity Logs
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Recent actions by <span className="font-medium text-gray-800">{selectedUserForActivity?.username}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsActivityPanelOpen(false)}
                                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-white">
                                {isLoadingActivities ? (
                                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                                        <Loader2 className="animate-spin text-indigo-400" size={24} />
                                        <span className="text-xs text-gray-400 font-medium">Fetching secure logs...</span>
                                    </div>
                                ) : userActivities.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <History className="text-gray-300" size={20} />
                                        </div>
                                        <p className="text-sm font-medium text-gray-500">No activity recorded yet</p>
                                    </div>
                                ) : (
                                    <div className="relative border-l border-gray-100 ml-3 space-y-6 pb-6">
                                        {userActivities.map((activity, index) => (
                                            <div key={activity._id || index} className="relative pl-6">
                                                {/* Timeline dot */}
                                                <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-white border-2 border-indigo-200 rounded-full" />

                                                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 hover:border-indigo-100 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                            {activity.entityType}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-gray-400">
                                                            {new Date(activity.createdAt).toLocaleString([], {
                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 font-medium leading-relaxed">
                                                        {activity.details}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-2 font-mono">
                                                        Action ID: {activity.action}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}


            </div>

            {/* Invite Client Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm lg:pl-64">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Invite Client</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Assign a client to a specific project</p>
                            </div>
                            <button onClick={() => setIsInviteModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-5 bg-gray-50/30">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Client Email</label>
                                <input
                                    type="email"
                                    placeholder="client@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Assign to Project</label>
                                <select
                                    value={inviteProjectId}
                                    onChange={(e) => setInviteProjectId(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm"
                                >
                                    <option value="">Select a project...</option>
                                    {allProjects.map(p => (
                                        <option key={p._id || p.id} value={p._id || p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-8 py-5 flex justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="px-6 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInviteClient}
                                disabled={isInviting}
                                className="px-8 py-3 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
                            >
                                {isInviting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                {isInviting ? 'Inviting...' : 'Send Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GitHub Style Absolute Delete Confirmation Modal */}
            {isDeleteModalOpen && userToDelete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 lg:pl-64">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative border border-gray-100">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Delete User Account</h3>
                        </div>

                        {/* Body - The "Github" text verification */}
                        <div className="p-6">
                            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 mb-6">
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    Unexpected bad things will happen if you don't read this! This action <strong>cannot</strong> be undone.
                                    This will permanently delete the user <strong className="font-semibold">{userToDelete.username}</strong> and remove all associated data and project access.
                                </p>
                            </div>

                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Please type <strong className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{userToDelete.email}</strong> to confirm.
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmationEmail}
                                onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all text-sm font-mono shadow-sm"
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={isDeleting || deleteConfirmationEmail !== userToDelete.email}
                                className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-red-600"
                            >
                                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                                <span>{isDeleting ? 'Deleting...' : 'I understand the consequences, delete user'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
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
