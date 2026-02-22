import React, { useState, useMemo, useEffect } from 'react';
import {
    LayoutDashboard,
    FolderOpen,
    Users,
    PieChart,
    FileText,
    Settings,
    Plus,
    AlertCircle,
    Clock,
    ChevronRight,
    Search,
    Bell
} from 'lucide-react';
import api from '../api/axios';
import CreateProjectModal from '../components/CreateProjectModal';

const Dashboard = () => {
    const [projects, setProjects] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [companyName, setCompanyName] = useState('BuildCore');
    const [companyInitial, setCompanyInitial] = useState('B');

    useEffect(() => {
        const updateCompanyDisplay = () => {
            const shortName = localStorage.getItem('companyShortName');
            if (shortName) {
                setCompanyName(shortName);
                setCompanyInitial(shortName[0].toUpperCase());
            } else {
                setCompanyName('BuildCore');
                setCompanyInitial('B');
            }
        };

        // Initial load
        updateCompanyDisplay();

        // Listen for updates from Settings page
        window.addEventListener('companyNameUpdated', updateCompanyDisplay);
        return () => window.removeEventListener('companyNameUpdated', updateCompanyDisplay);
    }, []);

    // Fetch projects on mount
    React.useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    };

    const handleCreateProject = (newProject) => {
        setProjects([newProject, ...projects]);
    };

    // --- REAL-TIME METRICS CALCULATION ---
    const metrics = useMemo(() => {
        const total = projects.length;
        const active = projects.filter(p => ['In Progress', 'On Track'].includes(p.status)).length;
        const delayed = projects.filter(p => p.status === 'Delayed').length;

        // Budget Health: Simple logic - % of projects NOT delayed
        const budgetHealth = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100;

        return { total, active, delayed, budgetHealth };
    }, [projects]);

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">

            {/* --- LEFT SIDEBAR --- */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col z-20 hidden md:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        {companyInitial}
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">{companyName}</span>
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <NavItem icon={<LayoutDashboard size={22} />} text="Command Center" active href="/" />
                    <NavItem icon={<FolderOpen size={22} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={22} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<PieChart size={20} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={20} />} text="Reports" href="/reports" />
                    <NavItem icon={<Settings size={20} />} text="Settings" href="/settings" />
                </nav>

                <div className="p-6 border-t border-slate-100/50">
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white ring-offset-2 transition-all group-hover:ring-blue-100">
                            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">David Miller</p>
                            <p className="text-xs text-slate-500 font-medium">Site Director</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto relative">
                {/* Decorative Background Blob */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none z-0" />

                {/* Header */}
                <header className="sticky top-0 z-10 px-10 py-6 flex justify-between items-center bg-slate-50/80 backdrop-blur-md border-b border-white/20">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Command Center</h1>
                        <p className="text-slate-500 font-medium">Overview of all active construction sites.</p>
                    </div>

                    <div className="flex items-center gap-6 z-10">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-64 transition-all shadow-sm"
                            />
                        </div>
                        <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-slate-100">
                            <Bell size={22} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2.5 font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus size={20} className="stroke-[3px]" /> New Project
                        </button>
                    </div>
                </header>

                <div className="px-10 py-8 relative z-0 space-y-10">
                    {/* Real-time Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            label="Total Projects"
                            value={metrics.total}
                            icon={<FolderOpen className="text-white" size={24} />}
                            gradient="from-blue-500 to-blue-600"
                            delay="0"
                        />
                        <StatCard
                            label="Active Sites"
                            value={metrics.active}
                            sub={`${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}% capacity`}
                            icon={<Users className="text-white" size={24} />}
                            gradient="from-indigo-500 to-violet-600"
                            delay="100"
                        />
                        <StatCard
                            label="Delayed Tasks"
                            value={metrics.delayed}
                            sub={metrics.delayed > 0 ? "Action Required" : "All Clear"}
                            alert={metrics.delayed > 0}
                            icon={<Clock className="text-white" size={24} />}
                            gradient="from-orange-400 to-red-500"
                            delay="200"
                        />
                        <StatCard
                            label="Budget Health"
                            value={`${metrics.budgetHealth}%`}
                            sub="On Target"
                            good={metrics.budgetHealth > 80}
                            alert={metrics.budgetHealth < 50}
                            icon={<PieChart className="text-white" size={24} />}
                            gradient="from-emerald-400 to-teal-500"
                            delay="300"
                        />
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Right Sidebar: Alerts */}
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-3">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    Live Site Updates
                                </h3>
                                <button className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline tracking-wide">VIEW ALL</button>
                            </div>

                            <div className="space-y-4">
                                <AlertCard
                                    type="critical"
                                    title="Equipment Malfunction"
                                    desc="Crane #04 reported hydraulic failure at Beacon Hill site. Maintenance team dispatched."
                                    time="12 mins ago"
                                    index={0}
                                />
                                <AlertCard
                                    type="warning"
                                    title="Pending Approval"
                                    desc="Invoice #2940 from 'Cement Corp' requires your sign-off to proceed with delivery."
                                    action="Review"
                                    index={1}
                                />
                                <AlertCard
                                    type="info"
                                    title="Weather Alert"
                                    desc="Heavy precipitation forecast for North District. Ensure materials are covered."
                                    time="1 hr ago"
                                    index={2}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateProject}
            />
        </div>
    );
};

// --- SUB COMPONENTS ---

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

const StatCard = ({ label, value, sub, icon, gradient, delay, alert, good }) => (
    <div
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 opacity-90">{label}</h3>
                <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</div>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
        </div>

        {sub && (
            <div className={`relative z-10 text-xs font-bold px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${alert
                ? 'bg-red-50 text-red-600'
                : good
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                {alert && <AlertCircle size={12} />}
                {sub}
            </div>
        )}

        {/* Decorative Circle */}
        <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-[0.03] bg-gradient-to-br ${gradient} group-hover:opacity-[0.08] transition-opacity`} />
    </div>
);

const AlertCard = ({ type, title, desc, time, action, index }) => {
    const styles = {
        critical: "bg-red-50/50 border-l-4 border-red-500 hover:bg-red-50",
        warning: "bg-orange-50/50 border-l-4 border-orange-400 hover:bg-orange-50",
        info: "bg-blue-50/50 border-l-4 border-blue-400 hover:bg-blue-50"
    };

    return (
        <div
            className={`p-5 rounded-r-xl border border-slate-100 shadow-sm transition-all hover:shadow-md ${styles[type]}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2.5">
                    {/* Icon based on type could go here */}
                    <h4 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h4>
                </div>
                {action && (
                    <button className="text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors">
                        {action}
                    </button>
                )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3 font-medium">{desc}</p>
            {time && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Clock size={12} /> {time}
                </p>
            )}
        </div>
    );
};

export default Dashboard;
