import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    Save, Plus, Moon, CreditCard, Shield, Lock, BellRing, Smartphone,
    Slack, FileJson, CloudLightning, Check, Edit2, UserPlus, Loader2, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { showToast, ToastComponent } = useToast();
    const { user: currentUser } = useAuth();
    // --- STATE MANAGEMENT ---
    const [activeSection, setActiveSection] = useState('company');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Company Profile State
    const [companyInfo, setCompanyInfo] = useState({
        name: "BuildCore Construction Ltd.",
        license: "BC-8829-X",
        address: "123 Industrial Way, Suite 400, Seattle, WA"
    });

    // 2. Notification Preferences State
    const [notifications, setNotifications] = useState({
        lowStock: true,
        budgetOverrun: true,
        compliance: false
    });

    // Fetch Settings on Mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/settings');
                if (response.data) {
                    if (response.data.companyInfo) setCompanyInfo(response.data.companyInfo);
                    if (response.data.notifications) setNotifications(response.data.notifications);

                    // Immediately sync local storage
                    if (response.data.companyInfo?.name) {
                        localStorage.setItem('companyShortName', response.data.companyInfo.name);
                    }
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // Handle Save
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put('/settings', { companyInfo, notifications });

            // Update local storage for sidebars to grab the short name instantly
            const shortName = companyInfo.name ? companyInfo.name : 'BuildCore';
            localStorage.setItem('companyShortName', shortName);

            // Dispatch a custom event to tell all sidebars to refresh their name without reloading the page
            window.dispatchEvent(new Event('companyNameUpdated'));

            showToast("Settings saved successfully!", "success");
        } catch (error) {
            console.error("Failed to save settings:", error);
            showToast("Failed to save settings. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // 3. User Management State
    const [users, setUsers] = useState([]);
    const [isUsersLoading, setIsUsersLoading] = useState(true);

    const fetchUsers = async () => {
        setIsUsersLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
            showToast("Failed to load users", "error");
        } finally {
            setIsUsersLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.role === 'Admin') {
            fetchUsers();
        } else {
            setIsUsersLoading(false);
        }
    }, [currentUser]);

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            await api.put(`/users/${userId}/role`, { role: newRole });
            showToast("User role updated successfully", "success");
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error("Failed to update role", error);
            showToast("Failed to update user role", "error");
        }
    };

    // Handle Input Changes
    const handleCompanyChange = (e) => {
        setCompanyInfo({ ...companyInfo, [e.target.name]: e.target.value });
    };

    const toggleNotification = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
            {ToastComponent}
            {/* --- MAIN SIDEBAR (Global) --- */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex sticky top-0 h-screen">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {localStorage.getItem('companyShortName') ? localStorage.getItem('companyShortName')[0].toUpperCase() : 'B'}
                    </div>
                    <span className="font-bold text-xl text-gray-800">
                        {localStorage.getItem('companyShortName') || 'BuildCore'}
                    </span>
                </div>
                <nav className="flex-1 px-4 space-y-1 mt-2">
                    <NavItem icon={<LayoutDashboard size={20} />} text="Command Center" href="/" />
                    <NavItem icon={<FolderOpen size={20} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={20} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<PieChart size={20} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={20} />} text="Reports" href="/reports" />
                    <NavItem icon={<Settings size={20} />} text="Settings" active href="/settings" />
                </nav>
                {/* User Profile Mini-Card at Bottom */}
                <div className="p-6 border-t border-slate-100/50">
                    <div onClick={() => navigate('/profile')} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                        {currentUser?.profile_image ? (
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white ring-offset-2 transition-all group-hover:ring-blue-100">
                                <img src={currentUser.profile_image} alt={currentUser.username} />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 ring-2 ring-white ring-offset-2 transition-all group-hover:ring-blue-200">
                                {currentUser?.username?.[0] || 'U'}
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-bold text-slate-800">{currentUser?.username || 'User'}</p>
                            <p className="text-xs text-slate-500 font-medium">{currentUser?.role || 'Guest'}</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto">

                {/* Page Header */}
                <div className="bg-white px-8 py-6 border-b border-gray-200 sticky top-0 z-20">
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-sm text-gray-500">Manage your organization, team members, and application preferences.</p>
                </div>

                <div className="p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">

                    {/* --- SUB-NAVIGATION (Left Sticky) --- */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="sticky top-32 space-y-1">
                            <SubNavItem label="Company Profile" active={activeSection === 'company'} onClick={() => { setActiveSection('company'); document.getElementById('company').scrollIntoView({ behavior: 'smooth' }); }} />
                            <SubNavItem label="User Management" active={activeSection === 'users'} onClick={() => { setActiveSection('users'); document.getElementById('users').scrollIntoView({ behavior: 'smooth' }); }} />
                            <SubNavItem label="Notification Preferences" active={activeSection === 'notifications'} onClick={() => { setActiveSection('notifications'); document.getElementById('notifications').scrollIntoView({ behavior: 'smooth' }); }} />
                            <SubNavItem label="App Integrations" active={activeSection === 'integrations'} onClick={() => { setActiveSection('integrations'); document.getElementById('integrations').scrollIntoView({ behavior: 'smooth' }); }} />
                            <SubNavItem label="Billing & Plan" active={activeSection === 'billing'} onClick={() => setActiveSection('billing')} />
                            <SubNavItem label="Security" active={activeSection === 'security'} onClick={() => setActiveSection('security')} />
                        </div>
                    </div>

                    {/* --- SETTINGS FORMS (Right Content) --- */}
                    <div className="flex-1 space-y-8 pb-32">

                        {/* 1. COMPANY PROFILE CARD */}
                        <div id="company" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm scroll-mt-24">
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Company Profile</h2>
                                <p className="text-sm text-gray-500">Public information about your construction firm.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={companyInfo.name}
                                        onChange={handleCompanyChange}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Business License Number</label>
                                    <input
                                        type="text"
                                        name="license"
                                        value={companyInfo.license}
                                        onChange={handleCompanyChange}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Headquarters Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={companyInfo.address}
                                    onChange={handleCompanyChange}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>

                        {/* 2. USER MANAGEMENT CARD */}
                        <div id="users" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm scroll-mt-24">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">User Management</h2>
                                    <p className="text-sm text-gray-500">Manage administrators and team access levels.</p>
                                </div>
                                <button className="text-blue-600 border border-blue-600 hover:bg-blue-50 font-bold py-1.5 px-4 rounded-lg text-sm flex items-center gap-2 transition">
                                    <UserPlus size={16} /> Invite User
                                </button>
                            </div>

                            {currentUser?.role !== 'Admin' ? (
                                <div className="text-center py-8 text-gray-500 font-medium">
                                    You do not have permission to view User Management settings. Contact an Admin.
                                </div>
                            ) : isUsersLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="animate-spin text-blue-500" size={32} />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="text-xs text-gray-400 font-bold uppercase border-b border-gray-100">
                                                <th className="pb-3 pl-2">User</th>
                                                <th className="pb-3">Role</th>
                                                <th className="pb-3">Status</th>
                                                <th className="pb-3 text-right pr-2">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {users.map(member => (
                                                <tr key={member._id}>
                                                    <td className="py-4 pl-2 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                                            {member.username.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800">{member.username}</p>
                                                            <p className="text-xs text-gray-500">{member.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4">
                                                        {member.role === 'Pending' ? (
                                                            <select
                                                                className="text-sm border border-orange-200 rounded-md py-1 px-2 pr-8 bg-orange-50 text-orange-700 font-medium focus:ring-0 focus:border-orange-300 outline-none"
                                                                onChange={(e) => handleRoleUpdate(member._id, e.target.value)}
                                                                defaultValue=""
                                                            >
                                                                <option value="" disabled>Assign Role...</option>
                                                                <option value="Admin">Admin</option>
                                                                <option value="Site Manager">Site Manager</option>
                                                                <option value="Contractor">Contractor</option>
                                                                <option value="Client">Client</option>
                                                            </select>
                                                        ) : (
                                                            <span className="text-gray-600 font-medium">{member.role}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4">
                                                        {member.role === 'Pending' ? (
                                                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                                                Needs Approval
                                                            </span>
                                                        ) : (
                                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                                                Active
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 text-right pr-2">
                                                        <button
                                                            className="text-gray-400 hover:text-blue-600 text-xs font-bold"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-6 text-gray-500">No users found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* 3. NOTIFICATION PREFERENCES CARD */}
                        <div id="notifications" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm scroll-mt-24">
                            <div className="mb-6 flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Notification Preferences</h2>
                                    <p className="text-sm text-gray-500">Configure how and when you want to be alerted.</p>
                                </div>
                                <Moon size={20} className="text-gray-300" />
                            </div>

                            <div className="space-y-6">
                                <ToggleRow
                                    title="Low Stock Alerts"
                                    desc="Notify when inventory levels for critical materials drop below 15%."
                                    enabled={notifications.lowStock}
                                    onToggle={() => toggleNotification('lowStock')}
                                />
                                <ToggleRow
                                    title="Budget Overrun Warnings"
                                    desc="Receive an immediate alert if a project exceeds its weekly budget."
                                    enabled={notifications.budgetOverrun}
                                    onToggle={() => toggleNotification('budgetOverrun')}
                                />
                                <ToggleRow
                                    title="Compliance Expiry Notifications"
                                    desc="30-day advance notice for expiring staff certifications or licenses."
                                    enabled={notifications.compliance}
                                    onToggle={() => toggleNotification('compliance')}
                                />
                            </div>
                        </div>

                        {/* 4. APP INTEGRATIONS CARD */}
                        <div id="integrations" className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm scroll-mt-24">
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-gray-900">App Integrations</h2>
                                <p className="text-sm text-gray-500">Connect BuildCore with your favorite software.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <IntegrationCard
                                    name="QuickBooks"
                                    desc="Accounting & Payroll"
                                    icon={<CreditCard className="text-green-600" />}
                                    status="Connected"
                                    color="bg-green-50"
                                />
                                <IntegrationCard
                                    name="Procore"
                                    desc="Project Management"
                                    icon={<CloudLightning className="text-orange-600" />}
                                    status="Connect"
                                    color="bg-orange-50"
                                />
                                <IntegrationCard
                                    name="Slack"
                                    desc="Communication"
                                    icon={<Slack className="text-purple-600" />}
                                    status="Connect"
                                    color="bg-purple-50"
                                />
                                <IntegrationCard
                                    name="Bluebeam"
                                    desc="PDF Markup"
                                    icon={<FileJson className="text-red-600" />}
                                    status="Connect"
                                    color="bg-red-50"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

// --- SUB COMPONENTS ---

const NavItem = ({ icon, text, active, href }) => (
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
        {icon}
        <span className="font-medium text-sm">{text}</span>
    </a>
);

const SubNavItem = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
    >
        {label}
    </button>
);

const ToggleRow = ({ title, desc, enabled, onToggle }) => (
    <div className="flex items-center justify-between">
        <div>
            <h4 className="text-sm font-bold text-gray-800">{title}</h4>
            <p className="text-xs text-gray-500 max-w-sm">{desc}</p>
        </div>
        <button
            onClick={onToggle}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
    </div>
);

const IntegrationCard = ({ name, desc, icon, status, color }) => (
    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-sm text-gray-800">{name}</h4>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
        </div>
        <button className={`text-xs font-bold px-3 py-1 rounded transition ${status === 'Connected' ? 'text-green-600 bg-green-50' : 'text-blue-600 hover:bg-blue-50'}`}>
            {status}
        </button>
    </div>
);

export default SettingsPage;
