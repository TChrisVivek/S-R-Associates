import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    ArrowLeft, Bell, MapPin, Grid, Layers, Box, FileClock, MoreVertical, AlertTriangle, ClipboardList, FileSignature, X, Upload, Loader2, Plus, UserPlus
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import BlueprintTab from '../components/BlueprintTab';
import MaterialInventoryTab from '../components/MaterialInventoryTab';
import DailyLogsTab from '../components/DailyLogsTab';
import ProjectPersonnelTab from '../components/ProjectPersonnelTab';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Company Name State for Sidebar
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

        updateCompanyDisplay();
        window.addEventListener('companyNameUpdated', updateCompanyDisplay);
        return () => window.removeEventListener('companyNameUpdated', updateCompanyDisplay);
    }, []);

    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchProjectDetails = async () => {
        try {
            const response = await api.get(`/projects/${id}`);
            setProject(response.data);
        } catch (error) {
            console.error("Error fetching project:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectDetails();
    }, [id]);

    const handleUpdateStats = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await api.put(`/projects/${id}/stats`, {
                taskCompleted: Number(e.target.taskCompleted.value),
                budgetSpent: Number(e.target.budgetSpent.value)
            });
            await fetchProjectDetails();
            setIsStatsModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddFeed = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', e.target.title.value);
            formData.append('location', e.target.location.value);

            Array.from(e.target.elements.images.files).forEach(file => {
                formData.append('images', file);
            });

            await api.post(`/projects/${id}/feed`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            await fetchProjectDetails();
            setIsFeedModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await api.post(`/projects/${id}/tasks`, {
                title: e.target.title.value,
                desc: e.target.desc.value,
                status: e.target.status.value,
                icon: e.target.icon.value,
                assignee: e.target.assignee.value
            });
            await fetchProjectDetails();
            setIsTaskModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Convert numbers
            if (data.siteSize) data.siteSize = Number(data.siteSize);
            if (data.floors) data.floors = Number(data.floors);
            if (data.budget) data.budget = Number(data.budget);

            // Start and End date formatting for the backend
            if (data.startDate) {
                const startParsed = new Date(data.startDate);
                if (!isNaN(startParsed.getTime())) data.startDate = startParsed.toISOString();
                else delete data.startDate;
            }
            if (data.endDate) {
                const endParsed = new Date(data.endDate);
                if (!isNaN(endParsed.getTime())) data.endDate = endParsed.toISOString();
                else delete data.endDate;
            }

            await api.put(`/projects/${id}/settings`, data);
            await fetchProjectDetails();
            setIsSettingsModalOpen(false);
        } catch (error) {
            console.error("Failed to update project settings:", error);
            alert("Failed to update project settings. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddPersonnel = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await api.post(`/personnel`, {
                project_id: id,
                name: e.target.name.value,
                role: e.target.role.value,
                email: e.target.email.value,
                phone: e.target.phone.value,
                site: project.location, // Default to current project's location
                status: e.target.status.value,
                avatar: `https://ui-avatars.com/api/?name=${e.target.name.value.split(' ').join('+')}&background=random`
            });
            // HACK: because the personnel data is fetched inside ProjectPersonnelTab, 
            // refreshing the project details here doesn't trick the child into re-fetching.
            // A more robust way would be lifting state up or using context, but to get it
            // working quickly for the user, we will just force a hard reload of this tab
            // by toggling to another tab and back, or let the user click the tab again.
            // Better yet, dispatch a custom event that ProjectPersonnelTab listens to.
            window.dispatchEvent(new Event('personnelUpdated'));

            setIsPersonnelModalOpen(false);
        } catch (error) {
            console.error("Failed to add personnel:", error);
            alert("Failed to add personnel. Please try again.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || !project) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-bold tracking-wide animate-pulse">Loading Workspace...</p>
                </div>
            </div>
        );
    }

    const CustomDonut = ({ percentage, color, label }) => {
        const circleRadius = 48; // Increased from 40 for more inner space
        const circumference = 2 * Math.PI * circleRadius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        return (
            <div className="flex flex-col items-center justify-center py-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Background Circle */}
                    <svg className="absolute w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r={circleRadius} stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                        {/* Foreground Circle */}
                        <circle
                            cx="64" cy="64" r={circleRadius}
                            stroke={color} strokeWidth="12" fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    {/* Center Text */}
                    <div className="relative z-10 text-center flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-gray-900 leading-none">{percentage}%</span>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide mt-1.5">{label}</p>
                    </div>
                </div>
                {/* Legend */}
                <div className="flex gap-6 mt-4 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: color }}></span>
                        {label === 'COMPLETED' ? 'Done' : 'Spent'}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-200"></span> Pending
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-[#f8f9fc] font-sans text-gray-800">

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
                    <NavItem icon={<FolderOpen size={22} />} text="Projects" active href="/projects" />
                    <NavItem icon={<Users size={22} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<PieChart size={20} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={20} />} text="Reports" href="/reports" />
                    <NavItem icon={<Settings size={20} />} text="Settings" href="/settings" />
                </nav>

                <div className="p-6 border-t border-slate-100/50">
                    <div className="flex flex-col gap-1 px-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Project</p>
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="font-bold text-sm text-blue-900 truncate" title={project.title}>{project.title}</p>
                            <p className="text-xs text-blue-600 font-medium mt-1 truncate">{project.phase}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto w-full relative">

                {/* Decorative Background Blur */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none -z-10"></div>

                <div className="p-8 max-w-[1400px] mx-auto z-10 relative">
                    {/* Top Header */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                            <button
                                onClick={() => navigate('/projects')}
                                className="p-2 hover:bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <span>Projects </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900 font-bold">{project.title}</span>
                        </div>
                        <div className="flex gap-3 items-center">
                            <button className="relative p-2.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm transition-all">
                                <Bell size={18} />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <button onClick={() => setIsPersonnelModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2">
                                <UserPlus size={18} /> Add Personnel
                            </button>
                            <button onClick={() => setIsSettingsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all border border-slate-700">
                                Project Settings
                            </button>
                        </div>
                    </div>

                    {/* Project Meta Card */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 transition-transform hover:-translate-y-1 duration-500">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">{project.title}</h1>
                                <p className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                                    <MapPin size={16} className="text-blue-500" />
                                    {project.location}
                                </p>
                            </div>
                            <span className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100 px-5 py-2 rounded-full text-xs font-bold tracking-wide uppercase shrink-0 shadow-sm">
                                {project.phase}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 border-t border-slate-50 pt-8">
                            <MetaBlock title="Timeline" value={project.timeline} />
                            <MetaBlock title="Total Budget" value={project.budget} />
                            <MetaBlock title="Time Remaining" value={`${project.daysLeft} Days`} highlight />
                            <MetaBlock title="Current Phase" value={project.phase} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 border-t border-slate-50 pt-8 mt-8">
                            <MetaBlock title="Client" value={project.client} />
                            <MetaBlock title="Project Type" value={project.type} />
                            <MetaBlock title="Site Size" value={project.siteSize ? `${project.siteSize} sq ft` : 'N/A'} />
                            <MetaBlock title="Manager" value={project.manager} />
                            <MetaBlock title="Contractor" value={project.contractor} />
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto pb-1 no-scrollbar">
                        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Grid size={18} />} label="Overview" />
                        <Tab active={activeTab === 'blueprint'} onClick={() => setActiveTab('blueprint')} icon={<Layers size={18} />} label="Blueprints" />
                        <Tab active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Box size={18} />} label="Inventory" />
                        <Tab active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<FileClock size={18} />} label="Daily Logs" />
                        <Tab active={activeTab === 'personnel'} onClick={() => setActiveTab('personnel')} icon={<Users size={18} />} label="Personnel" />
                    </div>

                    {/* Overview Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                            {/* Left Column: Metrics & Charts */}
                            <div className="space-y-8">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <h3 className="font-extrabold text-lg text-slate-900 mb-1">Task Completion</h3>
                                    <p className="text-xs text-slate-500 mb-4 font-medium">Overall project progress</p>
                                    <CustomDonut percentage={project.stats.taskCompleted} color="#2563eb" label="COMPLETED" />
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <h3 className="font-extrabold text-lg text-slate-900 mb-1">Budget Burn Rate</h3>
                                    <p className="text-xs text-slate-500 mb-4 font-medium">Allocated funds spent</p>
                                    <CustomDonut percentage={project.stats.budgetSpent} color="#6366f1" label="SPENT" />
                                </div>
                                <button onClick={() => setIsStatsModalOpen(true)} className="w-full py-3.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl font-bold tracking-wide transition-all shadow-sm">
                                    Update Metrics
                                </button>
                            </div>

                            {/* Right Column (Span 2): Feeds and Tasks */}
                            <div className="xl:col-span-2 space-y-8">

                                {/* Live Site Feed */}
                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-extrabold text-xl text-slate-900">Live Site Feed</h3>
                                            <p className="text-sm text-slate-500 font-medium">Latest photos directly from the ground.</p>
                                        </div>
                                        <button onClick={() => setIsFeedModalOpen(true)} className="text-sm font-bold text-white hover:bg-blue-700 bg-blue-600 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/30">
                                            <Upload size={16} /> Add Photo
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {project.liveFeed.map(feed => (
                                            <div key={feed.id} className="relative h-48 rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                                                <img src={feed.image} alt={feed.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                                <div className="absolute bottom-4 left-4 right-4 text-white transform transition-transform group-hover:-translate-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-1">{feed.title}</p>
                                                    <p className="text-sm font-bold leading-tight truncate">{feed.time}</p>
                                                    <p className="text-xs text-slate-300 uppercase truncate mt-1 flex items-center gap-1"><MapPin size={10} /> {feed.location}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Critical Tasks */}
                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-extrabold text-xl text-slate-900">Critical Tasks</h3>
                                            <p className="text-sm text-slate-500 font-medium">Items requiring immediate attention.</p>
                                        </div>
                                        <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm">
                                            <AlertTriangle size={14} /> {project.criticalTasks.filter(t => t.status === 'urgent').length} Urgent
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {project.criticalTasks.map(task => (
                                            <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-slate-300 transition-colors bg-slate-50/50 hover:bg-white gap-4">
                                                <div className="flex items-start sm:items-center gap-4">
                                                    <div className={`p-3.5 rounded-xl shrink-0 ${task.status === 'urgent' ? 'bg-red-100 text-red-600 shadow-sm shadow-red-100' :
                                                        task.status === 'warning' ? 'bg-orange-100 text-orange-600 shadow-sm shadow-orange-100' :
                                                            'bg-blue-100 text-blue-600 shadow-sm shadow-blue-100'
                                                        }`}>
                                                        {task.icon === 'triangle' && <AlertTriangle size={20} />}
                                                        {task.icon === 'clipboard' && <ClipboardList size={20} />}
                                                        {task.icon === 'file' && <FileSignature size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 mb-0.5">{task.title}</p>
                                                        <p className="text-xs font-medium text-slate-500">{task.desc}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 self-end sm:self-auto ml-14 sm:ml-0">
                                                    {task.assignee ? (
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 text-xs font-bold flex items-center justify-center text-slate-600 border-2 border-white shadow-sm">{task.assignee}</div>
                                                    ) : (
                                                        <div className="flex -space-x-2">
                                                            <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm"></div>
                                                            <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white shadow-sm"></div>
                                                        </div>
                                                    )}
                                                    <button className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setIsTaskModalOpen(true)} className="w-full mt-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold text-sm hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2">
                                        <Plus size={18} /> Add Urgent Task
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* Blueprint Tab Content */}
                    {activeTab === 'blueprint' && (
                        <BlueprintTab projectId={project.id} />
                    )}

                    {/* Material Inventory Tab Content */}
                    {activeTab === 'inventory' && (
                        <MaterialInventoryTab projectId={project.id} />
                    )}

                    {/* Daily Logs Tab Content */}
                    {activeTab === 'logs' && (
                        <DailyLogsTab projectId={project.id} />
                    )}

                    {/* Personnel Tab Content */}
                    {activeTab === 'personnel' && (
                        <ProjectPersonnelTab projectId={project.id} />
                    )}

                    {/* Placeholder for other tabs */}
                    {(activeTab !== 'overview' && activeTab !== 'blueprint' && activeTab !== 'inventory' && activeTab !== 'logs' && activeTab !== 'personnel') && (
                        <div className="bg-white p-16 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Box size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module
                            </h3>
                            <p className="text-slate-500 max-w-sm">This module is currently under development. Phase 2 rollout is scheduled for next quarter.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* --- MODALS --- */}

            {/* Project Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 flex flex-col border-b border-slate-100 bg-white relative sticky top-0 z-10">
                            <button onClick={() => setIsSettingsModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Settings size={22} className="text-blue-600" /> Project Settings
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Modify metadata and core details for {project.title}.</p>
                        </div>

                        <form id="settings-form" onSubmit={handleUpdateSettings} className="p-8 space-y-8 bg-slate-50/30 overflow-y-auto max-h-[70vh]">

                            {/* Section: Core Info */}
                            <div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Core Identity</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Project Title</label>
                                        <input type="text" name="title" defaultValue={project.title} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Shortcode / ID</label>
                                        <input type="text" value={project.id} readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none shadow-sm text-sm text-slate-500 font-mono cursor-not-allowed" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Location Address</label>
                                        <input type="text" name="address" defaultValue={project.location} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Scope & Specs */}
                            <div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Scope & Specifications</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Project Type</label>
                                        <select name="type" defaultValue={project.type} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm">
                                            <option value="Residential">Residential</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Renovation">Renovation</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Site Size (sq ft)</label>
                                        <input type="number" name="siteSize" defaultValue={project.siteSize} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Floors</label>
                                        <input type="number" name="floors" defaultValue={project.floors} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Scheduling & Financials */}
                            <div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Schedule & Budget</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                    <div className="md:col-span-2 flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-700 mb-2">Budget Target</label>
                                            <input type="number" name="budget" defaultValue={project.budget ? project.budget.split(' ')[0] : ''} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-bold text-slate-700 mb-2">Unit</label>
                                            <select name="budgetUnit" defaultValue={project.budget ? project.budget.split(' ')[1] : 'Lakhs'} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm">
                                                <option value="Lakhs">Lakhs</option>
                                                <option value="Crores">Crores</option>
                                                <option value="Thousands">Thousands</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Project Phase</label>
                                        <select name="status" defaultValue={project.phase} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm">
                                            <option value="Planning">Planning</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="On Track">On Track</option>
                                            <option value="Delayed">Delayed</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Target End Date</label>
                                        <input type="date" name="endDate" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Key Personnel */}
                            <div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Key Personnel</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Client Name</label>
                                        <input type="text" name="client" defaultValue={project.client} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Project Manager</label>
                                        <input type="text" name="manager" defaultValue={project.manager} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-2">General Contractor</label>
                                        <input type="text" name="contractor" defaultValue={project.contractor} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>

                        </form>

                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10">
                            <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="px-6 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button type="submit" form="settings-form" disabled={actionLoading} className="px-8 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-70">
                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {isStatsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Update Metrics</h3>
                            <button onClick={() => setIsStatsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleUpdateStats} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Completion %</label>
                                <input type="number" name="taskCompleted" min="0" max="100" defaultValue={project.stats.taskCompleted} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Budget Spent %</label>
                                <input type="number" name="budgetSpent" min="0" max="100" defaultValue={project.stats.budgetSpent} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsStatsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Metrics"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Live Feed Modal */}
            {isFeedModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Upload Site Photo</h3>
                            <button onClick={() => setIsFeedModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleAddFeed} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                                <input type="text" name="title" placeholder="e.g. Steel Delivery" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location / Zone</label>
                                <input type="text" name="location" placeholder="e.g. Block A" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Image Files</label>
                                <input type="file" name="images" accept="image/*" multiple required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsFeedModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Upload Photo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Add Critical Task</h3>
                            <button onClick={() => setIsTaskModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleAddTask} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Task Title</label>
                                <input type="text" name="title" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                                <input type="text" name="desc" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Urgency</label>
                                    <select name="status" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none">
                                        <option value="urgent">Urgent</option>
                                        <option value="warning">Warning</option>
                                        <option value="info">Info</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Icon</label>
                                    <select name="icon" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none">
                                        <option value="triangle">Triangle/Warning</option>
                                        <option value="clipboard">Clipboard</option>
                                        <option value="file">File</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Initials / Assignee</label>
                                <input type="text" name="assignee" placeholder="e.g. DM" maxLength="2" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all uppercase" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Add Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Personnel Modal */}
            {isPersonnelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <UserPlus size={22} className="text-blue-600" /> Allocate Personnel
                            </h3>
                            <button onClick={() => setIsPersonnelModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddPersonnel} className="p-6 space-y-5 bg-slate-50/30 overflow-y-auto max-h-[70vh]">

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Full Name</label>
                                <input type="text" name="name" required placeholder="John Doe" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Role Title</label>
                                    <input type="text" name="role" required placeholder="Site Engineer" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Current Status</label>
                                    <select name="status" defaultValue="On Site" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm">
                                        <option value="On Site">On Site</option>
                                        <option value="Remote">Remote</option>
                                        <option value="Off Duty">Off Duty</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Email Address</label>
                                    <input type="email" name="email" required placeholder="john@company.com" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Phone Number</label>
                                    <input type="tel" name="phone" required placeholder="+1 234 567 890" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsPersonnelModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={actionLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-70">
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Allocate Resource"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

// Helper for UI
const labelForTab = (tabId) => {
    switch (tabId) {
        case 'blueprint': return 'Blueprints & Diagrams';
        case 'inventory': return 'Material Inventory';
        case 'logs': return 'Daily Site Logs';
        case 'personnel': return 'Team & Personnel';
        default: return tabId;
    }
}

// Reusable Components
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

const Tab = ({ active, icon, label, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all shrink-0 ${active
            ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
            }`}
    >
        {icon} {label}
    </button>
);

const MetaBlock = ({ title, value, highlight }) => (
    <div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">{title}</p>
        <p className={`text-lg font-extrabold ${highlight ? 'text-emerald-500' : 'text-slate-900'}`}>{value}</p>
    </div>
);

export default ProjectDetail;
