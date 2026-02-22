import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderOpen,
    Users,
    PieChart,
    FileText,
    Settings,
    Plus,
    Search,
    MapPin,
    MoreHorizontal,
    Loader2,
    ChevronRight,
    Bell,
    Filter
} from 'lucide-react';
import api from '../api/axios';
import CreateProjectModal from '../components/CreateProjectModal';

const Projects = () => {
    const [activeTab, setActiveTab] = useState('In Progress');
    const [searchQuery, setSearchQuery] = useState('');
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
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
    useEffect(() => {
        fetchProjects();
    }, []);

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

    // Helper to map backend status to UI tabs
    const getTabForStatus = (status) => {
        if (status === 'Completed') return 'Completed';
        if (status === 'Planning') return 'Draft';
        return 'In Progress'; // 'In Progress', 'On Track', 'Delayed'
    };

    // Helper to map backend data to UI presentation
    const enrichProjectData = (project) => {
        let badgeText = project.status.toUpperCase();
        let badgeColor = "bg-slate-100 text-slate-700";

        switch (project.status) {
            case 'On Track':
                badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                break;
            case 'Delayed':
                badgeColor = "bg-red-50 text-red-600 border border-red-100";
                break;
            case 'In Progress': // Generic
                badgeColor = "bg-blue-50 text-blue-600 border border-blue-100";
                break;
            case 'Planning':
                badgeColor = "bg-violet-50 text-violet-600 border border-violet-100";
                break;
            case 'Completed':
                badgeColor = "bg-slate-100 text-slate-600 border border-slate-200";
                break;
            default:
                break;
        }

        return {
            ...project,
            badgeText,
            badgeColor,
            category: getTabForStatus(project.status),
            // Fallbacks for missing data
            progress: project.progress || 0,
            resultImage: project.image || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800",
            managerName: project.manager || "Unassigned",
            location: project.address || "No Location Info"
        };
    };

    // Derived State: Filter projects based on BOTH the active tab and the search bar
    const filteredProjects = useMemo(() => {
        const enriched = projects.map(enrichProjectData);

        return enriched.filter(project => {
            // 1. Check if it matches the tab
            const matchesTab = project.category === activeTab;

            // 2. Check if it matches the search query (title or location)
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                project.title.toLowerCase().includes(query) ||
                project.location.toLowerCase().includes(query);

            return matchesTab && matchesSearch;
        });
    }, [projects, activeTab, searchQuery]);

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">

            {/* --- LEFT SIDEBAR (Reused) --- */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col z-20 hidden md:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        {companyInitial}
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">{companyName}</span>
                </div>

                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <NavItem icon={<LayoutDashboard size={22} />} text="Command Center" href="/" />
                    <NavItem icon={<FolderOpen size={22} />} text="Projects" active href="/projects" />
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

                {/* Header Area */}
                <header className="sticky top-0 z-10 px-10 py-6 flex justify-between items-center bg-slate-50/80 backdrop-blur-md border-b border-white/20">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Projects</h1>
                        <p className="text-slate-500 font-medium">Manage and track all construction site activities.</p>
                    </div>

                    <div className="flex items-center gap-6 z-10">
                        <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-slate-100">
                            <Bell size={22} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl flex items-center gap-2.5 font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus size={20} className="stroke-[3px]" /> Add New Project
                        </button>
                    </div>
                </header>

                <div className="px-10 py-8 relative z-0">

                    {/* Filters and Search Bar */}
                    <div className="bg-white/70 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between mb-10">

                        {/* Tabs */}
                        <div className="flex gap-1">
                            {['In Progress', 'Completed', 'Draft'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === tab
                                        ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-100'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="flex items-center gap-4 pr-2">
                            <div className="relative w-64 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search projects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-transparent focus:bg-white focus:border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm text-slate-700 placeholder-slate-400 transition-all"
                                />
                            </div>
                            <div className="h-6 w-px bg-slate-200 mx-2"></div>
                            <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                <Filter size={18} />
                                <span>Filter</span>
                            </button>
                        </div>
                    </div>

                    {/* Projects Grid */}
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-blue-500" size={48} />
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-24 bg-white/60 border-2 border-dashed border-slate-200 rounded-3xl">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FolderOpen className="text-slate-400" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">No projects found</h3>
                            <p className="text-slate-500 mb-6">We couldn't find any projects matching your criteria.</p>
                            <button onClick={() => setSearchQuery('')} className="text-blue-600 font-bold hover:underline">Clear Filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

const ProjectCard = ({ project, index }) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/projects/${project._id}`)}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 group cursor-pointer flex flex-col transform hover:-translate-y-2"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Image Header with Badge */}
            <div className="h-56 relative overflow-hidden bg-slate-100">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                <img
                    src={project.resultImage}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                />
                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase ${project.badgeColor} shadow-sm backdrop-blur-md z-20`}>
                    {project.badgeText}
                </div>
            </div>

            {/* Card Body */}
            <div className="p-6 flex flex-col flex-1">
                <h3 className="font-extrabold text-xl text-slate-800 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{project.title}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-6">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="truncate">{project.location}</span>
                </div>

                {/* Progress Bar */}
                <div className="mb-6 mt-auto">
                    <div className="flex justify-between text-[10px] mb-2 uppercase font-extrabold text-slate-400 tracking-wider">
                        <span>Completion</span>
                        <span className="text-slate-800">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_2px_10px_rgba(59,130,246,0.3)]"
                            style={{ width: `${project.progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Footer: Avatar and Menu */}
                <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                        <img
                            className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
                            src={`https://i.pravatar.cc/150?u=${project.managerName}`}
                            alt={project.managerName}
                        />
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Manager</p>
                            <p className="text-sm font-bold text-slate-700">{project.managerName}</p>
                        </div>
                    </div>
                    <button className="text-slate-300 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-full">
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Projects;
