import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    Plus, Search, MapPin, Loader2, ChevronRight, Filter, BarChart3,
    Calendar, ArrowUpRight, Building2
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateProjectModal from '../components/CreateProjectModal';

const Projects = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [companyName, setCompanyName] = useState('BuildCore');
    const [companyInitial, setCompanyInitial] = useState('B');

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

    useEffect(() => { fetchProjects(); }, []);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error("Failed to fetch projects", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = (newProject) => {
        setProjects([newProject, ...projects]);
    };

    const tabs = ['All', 'In Progress', 'Planning', 'Delayed', 'Completed'];

    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const matchesTab = activeTab === 'All' || project.status === activeTab ||
                (activeTab === 'In Progress' && ['In Progress', 'On Track'].includes(project.status));
            const q = searchQuery.toLowerCase();
            const matchesSearch = project.title.toLowerCase().includes(q) ||
                (project.address || '').toLowerCase().includes(q);
            return matchesTab && matchesSearch;
        });
    }, [projects, activeTab, searchQuery]);

    const tabCounts = useMemo(() => ({
        'All': projects.length,
        'In Progress': projects.filter(p => ['In Progress', 'On Track'].includes(p.status)).length,
        'Planning': projects.filter(p => p.status === 'Planning').length,
        'Delayed': projects.filter(p => p.status === 'Delayed').length,
        'Completed': projects.filter(p => p.status === 'Completed').length,
    }), [projects]);

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">

            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-6 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
                    </div>
                    <div>
                        <span className="font-semibold text-sm text-white block leading-tight">{companyName}</span>
                        <span className="text-[10px] text-white/30 font-medium">Construction Suite</span>
                    </div>
                </div>
                <nav className="flex-1 px-3 space-y-0.5 mt-2">
                    <div className="px-3 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p></div>
                    <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" href="/" />
                    <NavItem icon={<FolderOpen size={17} />} text="Projects" active href="/projects" />
                    <NavItem icon={<Users size={17} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<BarChart3 size={17} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />
                    <div className="px-3 mt-6 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p></div>
                    <NavItem icon={<Settings size={17} />} text="Settings" href="/settings" />
                </nav>
                <div className="px-3 pb-4">
                    <div onClick={() => navigate('/profile')} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all cursor-pointer group">
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
                {/* Header */}
                <header className="sticky top-0 z-10 px-8 py-5 flex justify-between items-center bg-[#f6f7f9]/90 backdrop-blur-sm border-b border-gray-100">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Projects</h1>
                        <p className="text-[13px] text-gray-400 mt-0.5">{projects.length} projects across all sites</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={15} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 w-56 text-sm text-gray-600 placeholder-gray-300"
                            />
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-[#1a1d2e] hover:bg-[#252840] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Plus size={16} strokeWidth={2.5} /> New Project
                        </button>
                    </div>
                </header>

                <div className="px-8 py-6">
                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 bg-white border border-gray-100 rounded-xl p-1 w-fit">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${activeTab === tab
                                    ? 'bg-[#1a1d2e] text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {tab}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeTab === tab ? 'bg-white/15 text-white/80' : 'bg-gray-100 text-gray-400'
                                    }`}>{tabCounts[tab]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Projects Grid */}
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-gray-300" size={32} />
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
                            <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="text-gray-300" size={24} />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">No projects found</h3>
                            <p className="text-xs text-gray-400 mb-4">Try a different filter or search term</p>
                            <button onClick={() => { setSearchQuery(''); setActiveTab('All'); }} className="text-xs font-medium text-violet-600 hover:text-violet-700">Clear Filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredProjects.map((project, index) => (
                                <ProjectCard key={project._id} project={project} index={index} />
                            ))}
                        </div>
                    )}
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
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}>
        <span className={`transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
        {active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500"></div>}
    </a>
);

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
        <span className={`${c.bg} ${c.text} text-[10px] font-semibold pl-2 pr-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
            {status || 'Planning'}
        </span>
    );
};

const ProjectCard = ({ project, index }) => {
    const navigate = useNavigate();
    const progress = project.progress || 0;
    const image = project.image || `https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800`;

    return (
        <div
            onClick={() => navigate(`/projects/${project._id}`)}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 cursor-pointer group flex flex-col"
        >
            {/* Image */}
            <div className="h-44 relative overflow-hidden bg-gray-100">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                <img src={image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute bottom-3 left-3 z-20">
                    <StatusPill status={project.status} />
                </div>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1 group-hover:text-violet-600 transition-colors">{project.title}</h3>

                <div className="flex items-center gap-3 mb-4">
                    {project.address && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <MapPin size={10} /> {project.address}
                        </span>
                    )}
                </div>

                {/* Progress */}
                <div className="mt-auto">
                    <div className="flex justify-between text-[10px] mb-1.5 font-medium">
                        <span className="text-gray-400 uppercase tracking-wider">Progress</span>
                        <span className="text-gray-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-violet-500 to-blue-500 h-full rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        <img
                            className="w-6 h-6 rounded-full border border-white shadow-sm"
                            src={`https://i.pravatar.cc/150?u=${project.manager || project.title}`}
                            alt="Manager"
                        />
                        <span className="text-[11px] text-gray-500 font-medium">{project.manager || 'Unassigned'}</span>
                    </div>
                    <ArrowUpRight size={13} className="text-gray-300 group-hover:text-violet-500 transition-colors" />
                </div>
            </div>
        </div>
    );
};

export default Projects;
