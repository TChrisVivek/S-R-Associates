import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings,
    ArrowLeft, LogOut, Mail, Shield, Camera, ChevronRight, BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const UserProfile = () => {
    const navigate = useNavigate();
    const { user: currentUser, logout } = useAuth();
    const { showToast, ToastComponent } = useToast();
    const companyInitial = localStorage.getItem('companyShortName')?.[0]?.toUpperCase() || 'B';
    const companyName = localStorage.getItem('companyShortName') || 'BuildCore';

    const handleLogout = () => { logout(); };

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
            {ToastComponent}

            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-6 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-violet-500/20">{companyInitial}</div>
                    <div>
                        <span className="font-semibold text-sm text-white block leading-tight">{companyName}</span>
                        <span className="text-[10px] text-white/30 font-medium">Construction Suite</span>
                    </div>
                </div>
                <nav className="flex-1 px-3 space-y-0.5 mt-2">
                    <div className="px-3 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p></div>
                    <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" href="/" />
                    <NavItem icon={<FolderOpen size={17} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={17} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<BarChart3 size={17} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />
                    <div className="px-3 mt-6 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p></div>
                    <NavItem icon={<Settings size={17} />} text="Settings" href="/settings" />
                </nav>
                <div className="px-3 pb-4">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.06] border border-white/[0.06]">
                        {currentUser?.profile_image ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10"><img src={currentUser.profile_image} alt={currentUser.username} referrerPolicy="no-referrer" className="w-full h-full object-cover" /></div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center text-violet-300 text-xs font-semibold ring-1 ring-white/10">{currentUser?.username?.[0] || 'U'}</div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-white/80 truncate">{currentUser?.username || 'User'}</p>
                            <p className="text-[10px] text-white/25">{currentUser?.role || 'Guest'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ─── MAIN ─── */}
            <main className="flex-1 overflow-y-auto bg-[#f6f7f9]">
                {/* Profile Hero */}
                <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252840] px-8 pt-6 pb-20 relative">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/40 hover:text-white/80 text-xs font-medium transition-colors mb-6">
                        <ArrowLeft size={14} /> Back
                    </button>
                </div>

                <div className="px-8 -mt-14 max-w-4xl mx-auto space-y-6 pb-12 relative z-10">
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-6">
                        <div>
                            {currentUser?.profile_image ? (
                                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 shadow-lg"><img src={currentUser.profile_image} alt={currentUser.username} referrerPolicy="no-referrer" className="w-full h-full object-cover" /></div>
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center text-violet-500 font-semibold text-3xl shadow-lg border border-violet-100">{currentUser?.username?.[0] || 'U'}</div>
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{currentUser?.username || 'User'}</h1>
                            <p className="text-sm text-gray-400 flex items-center gap-1.5 justify-center md:justify-start mt-1">
                                <Mail size={13} /> {currentUser?.email}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {currentUser?.role === 'Admin' && (
                                <span className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium">
                                    <Shield size={12} /> Administrator
                                </span>
                            )}
                            <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg text-xs font-medium transition-colors border border-gray-100 hover:border-red-200">
                                <LogOut size={13} /> Sign Out
                            </button>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Personal Info */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
                            <h2 className="text-sm font-semibold text-gray-900 mb-5">Personal Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Full Name" defaultValue={currentUser?.username} />
                                <FormField label="Email Address" defaultValue={currentUser?.email} disabled />
                                <FormField label="Phone Number" placeholder="+91 99999 99999" />
                                <FormField label="Role" defaultValue={currentUser?.role} disabled />
                            </div>
                            <div className="mt-5 flex justify-end">
                                <button className="bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-medium py-2 px-4 rounded-lg transition-colors">Save Changes</button>
                            </div>
                        </div>

                        {/* Side Cards */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <div className="w-9 h-9 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center mb-3"><Shield size={16} /></div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-1">Access Level</h3>
                                <p className="text-xs text-gray-400 mb-3">Permissions for modules and data</p>
                                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between border border-gray-100">
                                    <span className="text-xs text-gray-500">Current Role</span>
                                    <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{currentUser?.role}</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <div className="w-9 h-9 bg-violet-50 text-violet-500 rounded-lg flex items-center justify-center mb-3"><Mail size={16} /></div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-1">Connected Accounts</h3>
                                <p className="text-xs text-gray-400 mb-3">Signed in via Google SSO</p>
                                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 border border-gray-100">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="text-xs font-medium text-gray-600">Google Auth</span>
                                    <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, text, active, href }) => (
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}>
        <span className={`transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
        {active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500"></div>}
    </a>
);

const FormField = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
        <input type="text" {...props} className={`w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg outline-none text-sm transition-all ${props.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 focus:ring-1 focus:ring-gray-300 focus:border-gray-300'}`} />
    </div>
);

export default UserProfile;
