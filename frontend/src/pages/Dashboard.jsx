import React, { useState, useMemo, useEffect } from 'react';
import {
    LayoutDashboard,
    FolderOpen,
    Users,
    PieChart,
    FileText,
    Settings,
    Plus,
    Clock,
    ChevronRight,
    Search,
    TrendingUp,
    ArrowUpRight,
    Activity,
    AlertTriangle,
    Info,
    Zap,
    MapPin,
    Calendar,
    Building2,
    BarChart3,
    Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateProjectModal from '../components/CreateProjectModal';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [projects, setProjects] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [companyName, setCompanyName] = useState('BuildCore');
    const [companyInitial, setCompanyInitial] = useState('B');
    const [animateIn, setAnimateIn] = useState(false);

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
        updateCompanyDisplay();
        window.addEventListener('companyNameUpdated', updateCompanyDisplay);
        return () => window.removeEventListener('companyNameUpdated', updateCompanyDisplay);
    }, []);

    useEffect(() => { fetchProjects(); }, []);
    useEffect(() => { setTimeout(() => setAnimateIn(true), 100); }, []);

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

    const metrics = useMemo(() => {
        const total = projects.length;
        const active = projects.filter(p => ['In Progress', 'On Track'].includes(p.status)).length;
        const delayed = projects.filter(p => p.status === 'Delayed').length;
        const completed = projects.filter(p => p.status === 'Completed').length;
        const budgetHealth = total > 0 ? Math.round(((total - delayed) / total) * 100) : 100;
        return { total, active, delayed, completed, budgetHealth };
    }, [projects]);

    // Dynamic alerts from real projects
    const dynamicAlerts = useMemo(() => {
        const alerts = [];
        const delayedProjects = projects.filter(p => p.status === 'Delayed');
        const activeProjects = projects.filter(p => ['In Progress', 'On Track'].includes(p.status));

        delayedProjects.forEach(p => {
            alerts.push({ type: 'critical', title: `${p.title} — Delayed`, desc: `This project at ${p.address || 'unknown location'} needs immediate attention.`, time: 'Now' });
        });

        if (activeProjects.length > 0) {
            alerts.push({ type: 'info', title: `${activeProjects.length} Active Sites`, desc: `${activeProjects.map(p => p.title).slice(0, 3).join(', ')} are currently in progress.`, time: 'Live' });
        }

        if (alerts.length === 0) {
            alerts.push({ type: 'info', title: 'All Systems Normal', desc: 'No critical issues detected across your projects.', time: 'Just now' });
        }

        return alerts.slice(0, 4);
    }, [projects]);

    const greetingTime = new Date().getHours();
    const greeting = greetingTime < 12 ? 'Good Morning' : greetingTime < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">

            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                {/* Logo */}
                <div className="px-5 py-5 flex items-center justify-center"><img src="/logo.png" alt="S R Associates" className="w-28 h-auto object-contain opacity-90" /></div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-0.5 mt-4">
                    <div className="px-3 mb-3">
                        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p>
                    </div>
                    <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" active href="/" />
                    <NavItem icon={<FolderOpen size={17} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={17} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<BarChart3 size={17} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />

                    <div className="px-3 mt-6 mb-3">
                        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p>
                    </div>
                    <NavItem icon={<Settings size={17} />} text="Settings" href="/settings" />
                </nav>

                {/* User */}
                <div className="px-3 pb-4">
                    <div
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all cursor-pointer group"
                    >
                        {currentUser?.profile_image ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10">
                                <img src={currentUser.profile_image} alt={currentUser.username} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center text-violet-300 text-xs font-semibold ring-1 ring-white/10">
                                {currentUser?.username?.[0] || 'U'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-white/80 truncate">{currentUser?.username || 'User'}</p>
                            <p className="text-[10px] text-white/25">{currentUser?.role || 'Guest'}</p>
                        </div>
                        <ChevronRight size={12} className="text-white/10 group-hover:text-white/30 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* ─── MAIN CONTENT ─── */}
            <main className="flex-1 overflow-y-auto bg-[#f6f7f9]">
                {/* Hero Header */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1d2e] via-[#1e2140] to-[#1a1d2e]"></div>
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-violet-500/8 via-transparent to-transparent rounded-full -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/5 via-transparent to-transparent rounded-full translate-y-1/2 -translate-x-1/3"></div>

                    <div className="relative px-8 pt-8 pb-6">
                        <div className="flex justify-between items-start">
                            <div className={`transition-all duration-700 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <p className="text-white/40 text-sm font-medium mb-1">{greeting},</p>
                                <h1 className="text-2xl font-bold text-white tracking-tight">{currentUser?.username || 'User'}</h1>
                                <p className="text-white/30 text-sm mt-1">Here's what's happening across your sites today.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="pl-9 pr-4 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg focus:outline-none focus:bg-white/[0.1] focus:border-white/[0.15] w-52 text-sm text-white placeholder-white/20 transition-all"
                                    />
                                </div>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-lg shadow-violet-500/15 hover:shadow-violet-500/25"
                                >
                                    <Plus size={16} strokeWidth={2.5} /> New Project
                                </button>
                            </div>
                        </div>

                        {/* ─── FLOATING METRICS ─── */}
                        <div className={`grid grid-cols-4 gap-4 mt-7 transition-all duration-700 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                            <GlassMetric icon={<Layers size={16} />} label="Total Projects" value={metrics.total} accent="violet" />
                            <GlassMetric icon={<Activity size={16} />} label="Active Sites" value={metrics.active} accent="emerald" />
                            <GlassMetric icon={<AlertTriangle size={16} />} label="Delayed" value={metrics.delayed} accent={metrics.delayed > 0 ? "red" : "gray"} />
                            <GlassMetric icon={<TrendingUp size={16} />} label="Budget Health" value={`${metrics.budgetHealth}%`} accent="blue" />
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className={`px-8 py-6 space-y-6 transition-all duration-700 delay-400 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

                    {/* ─── TWO COLUMN LAYOUT ─── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Projects Column (2/3) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Projects Card */}
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                                            <Building2 size={15} className="text-violet-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">Active Projects</h2>
                                            <p className="text-[11px] text-gray-400">{projects.length} total projects in pipeline</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/projects')}
                                        className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        View all <ArrowUpRight size={11} />
                                    </button>
                                </div>

                                {projects.length > 0 ? (
                                    <div className="divide-y divide-gray-50">
                                        {projects.slice(0, 5).map((project, i) => (
                                            <div
                                                key={project._id}
                                                onClick={() => navigate(`/projects/${project._id}`)}
                                                className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/60 cursor-pointer transition-all group"
                                            >
                                                {/* Project Icon */}
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${project.status === 'Delayed' ? 'bg-red-50 text-red-500' :
                                                    project.status === 'Completed' ? 'bg-emerald-50 text-emerald-500' :
                                                        project.status === 'In Progress' ? 'bg-violet-50 text-violet-500' :
                                                            'bg-gray-50 text-gray-400'
                                                    }`}>
                                                    {project.title?.slice(0, 2).toUpperCase()}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        {project.address && (
                                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                                <MapPin size={10} /> {project.address}
                                                            </span>
                                                        )}
                                                        {project.type && (
                                                            <span className="text-[11px] text-gray-300">• {project.type}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <StatusPill status={project.status} />

                                                {/* Arrow */}
                                                <ChevronRight size={14} className="text-gray-200 group-hover:text-gray-400 transition-colors shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-6 py-12 text-center">
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                                            <FolderOpen size={20} className="text-gray-300" />
                                        </div>
                                        <p className="text-sm text-gray-400">No projects yet</p>
                                        <p className="text-xs text-gray-300 mt-1">Create your first project to get started</p>
                                    </div>
                                )}
                            </div>

                            {/* Progress Overview */}
                            {projects.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <BarChart3 size={15} className="text-gray-400" />
                                        Status Distribution
                                    </h3>
                                    <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-gray-100">
                                        {metrics.active > 0 && <div className="bg-violet-500 rounded-full transition-all duration-1000" style={{ width: `${(metrics.active / metrics.total) * 100}%` }}></div>}
                                        {metrics.completed > 0 && <div className="bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${(metrics.completed / metrics.total) * 100}%` }}></div>}
                                        {metrics.delayed > 0 && <div className="bg-red-400 rounded-full transition-all duration-1000" style={{ width: `${(metrics.delayed / metrics.total) * 100}%` }}></div>}
                                        {(metrics.total - metrics.active - metrics.completed - metrics.delayed) > 0 && <div className="bg-gray-300 rounded-full transition-all duration-1000" style={{ width: `${((metrics.total - metrics.active - metrics.completed - metrics.delayed) / metrics.total) * 100}%` }}></div>}
                                    </div>
                                    <div className="flex gap-5 mt-3">
                                        <Legend color="bg-violet-500" label="Active" count={metrics.active} />
                                        <Legend color="bg-emerald-500" label="Completed" count={metrics.completed} />
                                        <Legend color="bg-red-400" label="Delayed" count={metrics.delayed} />
                                        <Legend color="bg-gray-300" label="Planning" count={metrics.total - metrics.active - metrics.completed - metrics.delayed} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Alerts Column (1/3) */}
                        <div className="space-y-6">
                            {/* Live Alerts */}
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    <h3 className="text-sm font-semibold text-gray-900">Live Feed</h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {dynamicAlerts.map((alert, i) => (
                                        <AlertItem key={i} {...alert} />
                                    ))}
                                </div>
                            </div>

                            {/* Quick Stats Card */}
                            <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-5 text-white">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar size={14} className="text-white/40" />
                                    <p className="text-xs font-medium text-white/40">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                </div>
                                <div className="space-y-4">
                                    <QuickStat label="Sites Active Today" value={metrics.active} total={metrics.total} color="from-violet-400 to-blue-400" />
                                    <QuickStat label="Budget Utilization" value={metrics.budgetHealth} total={100} suffix="%" color="from-emerald-400 to-teal-400" />
                                </div>
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

// ─── SUB COMPONENTS ───

const NavItem = ({ icon, text, active, href }) => (
    <a
        href={href || "#"}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${active
            ? 'bg-white/[0.08] text-white'
            : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'
            }`}
    >
        <span className={`transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
        {active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500"></div>}
    </a>
);

const GlassMetric = ({ icon, label, value, accent }) => {
    const accents = {
        violet: 'from-violet-400/20 to-violet-400/5 text-violet-300 border-violet-400/10',
        emerald: 'from-emerald-400/20 to-emerald-400/5 text-emerald-300 border-emerald-400/10',
        red: 'from-red-400/20 to-red-400/5 text-red-300 border-red-400/10',
        blue: 'from-blue-400/20 to-blue-400/5 text-violet-300 border-violet-400/10',
        gray: 'from-white/10 to-white/5 text-white/50 border-white/10',
    };
    const a = accents[accent] || accents.gray;

    return (
        <div className={`bg-gradient-to-b ${a} backdrop-blur-xl border rounded-xl px-4 py-4`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="opacity-60">{icon}</span>
                <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );
};

const StatusPill = ({ status }) => {
    const s = {
        'Planning': { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
        'In Progress': { bg: 'bg-violet-50', text: 'text-violet-500', dot: 'bg-violet-500' },
        'On Track': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
        'Delayed': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
        'Completed': { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-500' },
    };
    const c = s[status] || s['Planning'];
    return (
        <span className={`${c.bg} ${c.text} text-[11px] font-medium pl-2 pr-2.5 py-1 rounded-full flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
            {status || 'Planning'}
        </span>
    );
};

const AlertItem = ({ type, title, desc, time }) => {
    const icons = {
        critical: <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center"><Zap size={13} className="text-red-500" /></div>,
        warning: <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center"><AlertTriangle size={13} className="text-amber-500" /></div>,
        info: <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center"><Info size={13} className="text-violet-500" /></div>,
    };

    return (
        <div className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
            <div className="flex gap-3">
                <div className="shrink-0 mt-0.5">{icons[type]}</div>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{desc}</p>
                    {time && <p className="text-[10px] text-gray-300 mt-1.5 flex items-center gap-1"><Clock size={9} /> {time}</p>}
                </div>
            </div>
        </div>
    );
};

const QuickStat = ({ label, value, total, suffix = '', color }) => {
    const pct = Math.min((value / total) * 100, 100);
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs text-white/50">{label}</p>
                <p className="text-xs font-semibold text-white">{value}{suffix}</p>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
};

const Legend = ({ color, label, count }) => (
    <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${color}`}></div>
        <span className="text-[11px] text-gray-400">{label}</span>
        <span className="text-[11px] font-semibold text-gray-600">{count}</span>
    </div>
);

export default Dashboard;
