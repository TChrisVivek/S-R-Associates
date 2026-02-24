import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderOpen,
    Users,
    PieChart,
    FileText,
    Settings,
    ArrowLeft,
    LogOut,
    Mail,
    Shield,
    Camera,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const UserProfile = () => {
    const navigate = useNavigate();
    const { user: currentUser, logout } = useAuth();
    const { showToast, ToastComponent } = useToast();

    const companyInitial = localStorage.getItem('companyShortName') ? localStorage.getItem('companyShortName')[0].toUpperCase() : 'B';
    const companyName = localStorage.getItem('companyShortName') || 'BuildCore';

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden">
            {ToastComponent}
            {/* --- LEFT SIDEBAR (Standard Layout) --- */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col z-20 hidden md:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        {companyInitial}
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">{companyName}</span>
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <NavItem icon={<LayoutDashboard size={22} />} text="Command Center" href="/" />
                    <NavItem icon={<FolderOpen size={22} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={22} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<PieChart size={20} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={20} />} text="Reports" href="/reports" />
                    <NavItem icon={<Settings size={20} />} text="Settings" href="/settings" />
                </nav>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-blue-600 to-indigo-700 pointer-events-none z-0" />

                <header className="relative z-10 px-10 py-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-white/80 hover:text-white font-medium transition-colors mb-6"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>
                </header>

                <div className="relative z-10 px-10 pb-12 max-w-5xl mx-auto">

                    {/* Profile Header Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] mb-8 flex flex-col md:flex-row items-center gap-8 relative border border-slate-100">

                        {/* Avatar */}
                        <div className="relative group">
                            {currentUser?.profile_image ? (
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100">
                                    <img src={currentUser.profile_image} alt={currentUser.username} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-4xl">
                                    {currentUser?.username?.[0] || 'U'}
                                </div>
                            )}
                            <button className="absolute bottom-2 right-2 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-md transition-all z-10">
                                <Camera size={18} />
                            </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">{currentUser?.username || 'User'}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5"><Mail size={16} /> {currentUser?.email}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            {currentUser?.role === 'Admin' && (
                                <span className="flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold shadow-md">
                                    <Shield size={18} /> Administrator
                                </span>
                            )}
                            <button
                                onClick={handleLogout}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl font-bold transition-colors w-full md:w-auto border border-slate-200 hover:border-red-200"
                            >
                                <LogOut size={18} /> Sign Out
                            </button>
                        </div>
                    </div>

                    {/* Account Settings Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column - Details */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Personal Info Card */}
                            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                                <h2 className="text-xl font-bold text-slate-900 mb-6">Personal Information</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                        <input type="text" defaultValue={currentUser?.username} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                        <input type="email" defaultValue={currentUser?.email} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-500 cursor-not-allowed shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                                        <input type="tel" placeholder="+1 (555) 000-0000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role/Position</label>
                                        <input type="text" defaultValue={currentUser?.role} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-500 cursor-not-allowed uppercase shadow-sm" />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg">
                                        Save Changes
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* Right Column - Status */}
                        <div className="space-y-8">

                            {/* Access Level Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                                    <Shield size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Access Level</h3>
                                <p className="text-slate-500 font-medium text-sm mb-4">Your account permissions dictate what modules you can view and edit.</p>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                    <span className="font-bold text-slate-700">Current Role:</span>
                                    <span className="bg-white px-3 py-1 rounded-lg text-sm font-bold border border-slate-200 text-blue-700">{currentUser?.role}</span>
                                </div>
                            </div>

                            {/* Notification Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                                    <Mail size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Connected Accounts</h3>
                                <p className="text-slate-500 font-medium text-sm mb-4">You are currently signed in using Google Single Sign-On.</p>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                        </div>
                                        <span className="font-bold text-sm text-slate-700">Google Auth</span>
                                        <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Active</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Reusable Sub-component matching Dashboard
const NavItem = ({ icon, text, active, href }) => (
    <a
        href={href || "#"}
        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${active
            ? 'bg-blue-50/80 text-blue-700 shadow-sm font-semibold'
            : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
            }`}
    >
        <span className={`${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-indigo-500'} transition-colors`}>
            {icon}
        </span>
        <span className="text-sm tracking-wide">{text}</span>
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
    </a>
);

export default UserProfile;
