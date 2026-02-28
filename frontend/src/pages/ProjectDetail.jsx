import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings,
    ArrowLeft, MapPin, Grid, Layers, Box, FileClock, MoreVertical, AlertTriangle, ClipboardList, FileSignature, X, Upload, Loader2, Plus, UserPlus, Trash2, ChevronRight, ChevronDown, BarChart3
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { uploadMultipleToCloudinary, uploadToCloudinary } from '../utils/cloudinaryUpload';
import BlueprintTab from '../components/BlueprintTab';
import MaterialInventoryTab from '../components/MaterialInventoryTab';
import DailyLogsTab from '../components/DailyLogsTab';
import ProjectPersonnelTab from '../components/ProjectPersonnelTab';
import GlobalLoader from '../components/GlobalLoader';

const ProjectDetail = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const { showToast, ToastComponent } = useToast();

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
    const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
    const [deleteProjectConfirmText, setDeleteProjectConfirmText] = useState('');
    const [availablePersonnel, setAvailablePersonnel] = useState([]);
    const [taskToDelete, setTaskToDelete] = useState(null);
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
                taskCompleted: Number(e.target.taskCompleted.value)
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
            let imageUrls = [];
            const files = Array.from(e.target.elements.images.files);
            if (files.length > 0) {
                imageUrls = await uploadMultipleToCloudinary(files);
            }

            // Backend now expects JSON
            await api.post(`/projects/${id}/feed`, {
                title: e.target.title.value,
                location: e.target.location.value,
                images: imageUrls
            });

            await fetchProjectDetails();
            setIsFeedModalOpen(false);
            showToast("Feed added successfully", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Failed to add feed", "error");
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

    const handleDeleteTask = (taskId) => {
        setTaskToDelete(taskId);
    };

    const confirmDeleteTask = async () => {
        if (!taskToDelete) return;
        setActionLoading(true);
        try {
            await api.delete(`/projects/${id}/tasks/${taskToDelete}`);
            await fetchProjectDetails();
            setTaskToDelete(null);
            showToast("Task deleted successfully", "success");
        } catch (error) {
            console.error("Failed to delete task:", error);
            showToast("Failed to delete task. Please try again.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteProject = async () => {
        setActionLoading(true);
        try {
            await api.delete(`/projects/${id}`);
            setIsDeleteProjectModalOpen(false);
            showToast("Project deleted successfully", "success");
            navigate('/projects');
        } catch (error) {
            console.error("Failed to delete project:", error);
            showToast("Failed to delete project. Please try again.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        setActionLoading(true);
        try {
            await api.put(`/projects/${id}/settings`, { status: newStatus });
            await fetchProjectDetails();
            showToast(`Project status updated to ${newStatus}`, "success");
        } catch (error) {
            console.error("Failed to update project status:", error);
            showToast("Failed to update project status. Please try again.", "error");
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

            const imageFile = data.image;
            let imageUrl = null;

            if (imageFile && imageFile.size > 0) {
                imageUrl = await uploadToCloudinary(imageFile);
            }

            const payload = { ...data };
            if (imageUrl) {
                payload.image = imageUrl;
            } else {
                delete payload.image;
            }

            await api.put(`/projects/${id}/settings`, payload);
            await fetchProjectDetails();
            setIsSettingsModalOpen(false);
            showToast("Settings updated successfully", "success");
        } catch (error) {
            console.error("Failed to update project settings:", error);
            showToast(error.message || "Failed to update project settings. Please try again.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        if (isPersonnelModalOpen) {
            fetchAvailablePersonnel();
        }
    }, [isPersonnelModalOpen]);

    const fetchAvailablePersonnel = async () => {
        try {
            const response = await api.get('/personnel');
            // Filter out personnel who are already assigned to THIS project
            const unassigned = response.data.filter(p => p.project_id !== id);
            setAvailablePersonnel(unassigned);
        } catch (error) {
            console.error("Error fetching personnel:", error);
            showToast("Failed to fetch available personnel", "error");
        }
    };

    const handleAddPersonnel = async (e) => {
        e.preventDefault();
        const selectedId = e.target.personnelId.value;
        if (!selectedId) {
            showToast("Please select a personnel", "error");
            return;
        }

        setActionLoading(true);
        try {
            // Simply use the existing status from the dropdown
            const newStatus = e.target.status.value;

            await api.put(`/personnel/${selectedId}`, {
                project_id: id,
                site: project.location,
                status: newStatus
            });

            // Dispatch event for child tab
            window.dispatchEvent(new Event('personnelUpdated'));

            setIsPersonnelModalOpen(false);
            showToast("Personnel allocated successfully", "success");
        } catch (error) {
            console.error("Failed to allocate personnel:", error);
            showToast("Failed to allocate personnel. Please try again.", "error");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading || !project) {
        return <GlobalLoader />;
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
                        <span className="text-3xl font-semibold text-gray-900 leading-none">{percentage}%</span>
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
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
            {ToastComponent}

            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-5 flex items-center justify-center"><img src="/logo.png" alt="S R Associates" className="w-28 h-auto object-contain opacity-90" /></div>
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
                <div className="px-3 pb-2">
                    <div className={`px-3 py-2.5 rounded-xl mb-3 border ${project.status === 'Delayed' ? 'bg-red-500/[0.08] border-red-500/10' : project.status === 'Completed' ? 'bg-green-500/[0.08] border-green-500/10' : 'bg-violet-500/[0.08] border-violet-500/10'}`}>
                        <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-1">Active Project</p>
                        <p className="text-xs font-medium text-white/80 truncate" title={project.title}>{project.title}</p>
                        <p className={`text-[10px] mt-0.5 truncate font-semibold ${project.status === 'Delayed' ? 'text-red-400' : project.status === 'Completed' ? 'text-green-400' : 'text-violet-400/60'}`}>{project.phase}</p>
                    </div>
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
            <main className="flex-1 overflow-y-auto bg-[#f6f7f9] text-gray-800">

                <div className="p-8 max-w-[1400px] mx-auto z-10 relative">
                    {/* Top Header */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                        <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                            <button
                                onClick={() => navigate('/projects')}
                                className="p-2 hover:bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <span>Projects </span>
                            <span className="text-gray-300">/</span>
                            <span className="text-gray-900 font-bold">{project.title}</span>
                        </div>
                        <div className="flex gap-3 items-center">
                            <button onClick={() => setIsPersonnelModalOpen(true)} className="bg-[#1a1d2e] hover:bg-[#252840] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                                <UserPlus size={18} /> Add Personnel
                            </button>
                            <button onClick={() => setIsSettingsModalOpen(true)} className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all border border-gray-700">
                                Project Settings
                            </button>
                        </div>
                    </div>

                    {/* Project Meta Card */}
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 transition-transform hover:-translate-y-1 duration-500">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-8 gap-4">
                            <div className="flex gap-6 items-center">
                                {project.image && (
                                    <img src={project.image} alt={project.title} className="w-20 h-20 rounded-2xl object-cover shadow-sm bg-gray-50 border border-gray-100 hidden sm:block" />
                                )}
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-3">{project.title}</h1>
                                    <p className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
                                        <MapPin size={16} className="text-violet-500" />
                                        {project.location}
                                    </p>
                                </div>
                            </div>
                            <div className="relative shrink-0 flex items-center">
                                <select
                                    value={project.status || 'Planning'}
                                    onChange={handleStatusChange}
                                    className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase shadow-sm cursor-pointer focus:outline-none focus:ring-2 appearance-none pr-8 border bg-gradient-to-r ${project.status === 'Delayed'
                                        ? 'from-red-50 to-red-50/80 text-red-600 border-red-200 hover:bg-red-100 focus:ring-red-400'
                                        : project.status === 'Completed'
                                            ? 'from-green-50 to-green-50/80 text-green-600 border-green-200 hover:bg-green-100 focus:ring-green-400'
                                            : 'from-violet-50 to-violet-50/80 text-violet-600 border-violet-200 hover:bg-violet-100 focus:ring-violet-400'
                                        }`}
                                >
                                    <option value="Planning">Planning</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Delayed">Delayed</option>
                                    <option value="Completed">Completed</option>
                                </select>
                                <ChevronDown size={14} className={`absolute right-3 pointer-events-none ${project.status === 'Delayed' ? 'text-red-500' : project.status === 'Completed' ? 'text-green-500' : 'text-violet-500'}`} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 border-t border-gray-50 pt-8">
                            <MetaBlock title="Timeline" value={project.timeline} />
                            <MetaBlock title="Total Budget" value={project.budget} />
                            <MetaBlock
                                title={project.status === 'Completed' ? "Time Taken" : "Time Remaining"}
                                value={
                                    project.status === 'Completed' && project.startDate && project.endDate
                                        ? `${Math.max(1, Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24)))} Days`
                                        : project.daysLeft <= 0
                                            ? `Overdue by ${Math.abs(project.daysLeft)} Days`
                                            : `${project.daysLeft} Days`
                                }
                                highlight={project.status !== 'Delayed' && project.daysLeft > 0}
                                status={project.status === 'Delayed' || project.daysLeft <= 0 ? 'Delayed' : undefined}
                            />
                            <MetaBlock title="Current Phase" value={project.phase} status={project.status} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 border-t border-gray-50 pt-8 mt-8">
                            <MetaBlock title="Client" value={project.client} />
                            <MetaBlock title="Project Type" value={project.type} />
                            <MetaBlock title="Site Size" value={project.siteSize ? `${project.siteSize} sq ft` : 'N/A'} />
                            <MetaBlock title="Manager" value={project.manager} />
                            <MetaBlock title="Contractor" value={localStorage.getItem('companyShortName') || 'S R Associates'} />
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 border-b border-gray-200 mb-8 overflow-x-auto pb-1 no-scrollbar">
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
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Task Completion</h3>
                                    <p className="text-xs text-gray-500 mb-4 font-medium">Overall project progress</p>
                                    <CustomDonut percentage={project.stats.taskCompleted} color="#2563eb" label="COMPLETED" />
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="font-semibold text-lg text-gray-900 mb-1">Budget Burn Rate</h3>
                                    <p className="text-xs text-gray-500 mb-4 font-medium">Auto-calculated from material deliveries</p>
                                    <CustomDonut percentage={project.stats.budgetSpent} color="#6366f1" label="SPENT" />
                                </div>
                                <button onClick={() => setIsStatsModalOpen(true)} className="w-full py-3.5 bg-violet-50 text-violet-500 hover:bg-[#1a1d2e] hover:text-white rounded-2xl font-medium tracking-wide transition-all shadow-sm">
                                    Update Metrics
                                </button>
                            </div>

                            {/* Right Column (Span 2): Feeds and Tasks */}
                            <div className="xl:col-span-2 space-y-8">

                                {/* Live Site Feed */}
                                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-semibold text-xl text-gray-900">Live Site Feed</h3>
                                            <p className="text-sm text-gray-500 font-medium">Latest photos directly from the ground.</p>
                                        </div>
                                        <button onClick={() => setIsFeedModalOpen(true)} className="text-sm font-medium text-white hover:bg-[#252840] bg-[#1a1d2e] px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                            <Upload size={16} /> Add Photo
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {project.liveFeed.map(feed => (
                                            <div key={feed.id} className="relative h-48 rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                                                <img src={feed.image} alt={feed.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                                <div className="absolute bottom-4 left-4 right-4 text-white transform transition-transform group-hover:-translate-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300 mb-1">{feed.title}</p>
                                                    <p className="text-sm font-bold leading-tight truncate">{feed.time}</p>
                                                    <p className="text-xs text-gray-300 uppercase truncate mt-1 flex items-center gap-1"><MapPin size={10} /> {feed.location}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Critical Tasks */}
                                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="font-semibold text-xl text-gray-900">Critical Tasks</h3>
                                            <p className="text-sm text-gray-500 font-medium">Items requiring immediate attention.</p>
                                        </div>
                                        <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm">
                                            <AlertTriangle size={14} /> {project.criticalTasks.filter(t => t.status === 'urgent').length} Urgent
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {project.criticalTasks.map(task => (
                                            <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-2xl hover:border-gray-300 transition-colors bg-gray-50/50 hover:bg-white gap-4">
                                                <div className="flex items-start sm:items-center gap-4">
                                                    <div className={`p-3.5 rounded-xl shrink-0 ${task.status === 'urgent' ? 'bg-red-100 text-red-600 shadow-sm shadow-red-100' :
                                                        task.status === 'warning' ? 'bg-orange-100 text-orange-600 shadow-sm shadow-orange-100' :
                                                            'bg-violet-100 text-violet-500 shadow-sm shadow-sm'
                                                        }`}>
                                                        {task.icon === 'triangle' && <AlertTriangle size={20} />}
                                                        {task.icon === 'clipboard' && <ClipboardList size={20} />}
                                                        {task.icon === 'file' && <FileSignature size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 mb-0.5">{task.title}</p>
                                                        <p className="text-xs font-medium text-gray-500">{task.desc}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 self-end sm:self-auto ml-14 sm:ml-0">
                                                    {task.assignee ? (
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 text-xs font-bold flex items-center justify-center text-gray-600 border-2 border-white shadow-sm">{task.assignee}</div>
                                                    ) : (
                                                        <div className="flex -space-x-2">
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm"></div>
                                                            <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white shadow-sm"></div>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        disabled={actionLoading}
                                                        className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                                        title="Delete Task"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setIsTaskModalOpen(true)} disabled={actionLoading} className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold text-sm hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
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
                        <div className="bg-white p-16 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Box size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module
                            </h3>
                            <p className="text-gray-500 max-w-sm">This module is currently under development. Phase 2 rollout is scheduled for next quarter.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* --- MODALS --- */}

            {/* Project Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 flex flex-col border-b border-gray-100 bg-white relative sticky top-0 z-10">
                            <button onClick={() => setIsSettingsModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Settings size={22} className="text-violet-500" /> Project Settings
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">Modify metadata and core details for {project.title}.</p>
                        </div>

                        <form id="settings-form" onSubmit={handleUpdateSettings} className="p-8 space-y-8 bg-gray-50/30 overflow-y-auto max-h-[70vh]">

                            {/* Section: Core Info */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Core Identity</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Project Title</label>
                                        <input type="text" name="title" defaultValue={project.title} required className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Shortcode / ID</label>
                                        <input type="text" value={project.id} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none shadow-sm text-sm text-gray-500 font-mono cursor-not-allowed" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Location Address</label>
                                        <input type="text" name="address" defaultValue={project.location} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Project Cover Image <span className="text-gray-400 font-normal">(Optional)</span></label>
                                        <div className="flex items-center gap-4">
                                            {project.image ? (
                                                <img src={project.image} alt="Cover" className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 shadow-sm flex items-center justify-center text-gray-400">
                                                    <LayoutDashboard size={20} />
                                                </div>
                                            )}
                                            <input type="file" name="image" accept="image/*" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-600 hover:file:bg-violet-100 outline-none transition-all text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Scope & Specs */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Scope & Specifications</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Project Type</label>
                                        <select name="type" defaultValue={project.type} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm">
                                            <option value="Residential">Residential</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Renovation">Renovation</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Site Size (sq ft)</label>
                                        <input type="number" name="siteSize" defaultValue={project.siteSize} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Floors</label>
                                        <input type="number" name="floors" defaultValue={project.floors} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Scheduling & Financials */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Schedule & Budget</h4>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                                    <div className="md:col-span-2 flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-2">Budget Target</label>
                                            <input type="number" name="budget" defaultValue={project.budgetRaw} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-medium text-gray-500 mb-2">Unit</label>
                                            <select name="budgetUnit" defaultValue={project.budgetUnitRaw} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm">
                                                <option value="Lakhs">Lakhs</option>
                                                <option value="Crores">Crores</option>
                                                <option value="Thousands">Thousands</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Project Phase</label>
                                        <select name="status" defaultValue={project.status} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm">
                                            <option value="Planning">Planning</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Delayed">Delayed</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Start Date</label>
                                        <input type="date" name="startDate" defaultValue={project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Target End Date</label>
                                        <input type="date" name="endDate" defaultValue={project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Key Personnel */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Key Personnel</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Client Name</label>
                                        <input type="text" name="client" defaultValue={project.client} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Project Manager</label>
                                        <input type="text" name="manager" defaultValue={project.manager} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">General Contractor</label>
                                        <input type="text" name="contractor" defaultValue={localStorage.getItem('companyShortName') || 'S R Associates'} readOnly className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all shadow-sm text-sm text-gray-500 cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Danger Zone */}
                            <div className="pt-6 mt-8 border-t border-red-100">
                                <h4 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-4 pb-2">Danger Zone</h4>
                                <div className="p-5 border border-red-200 rounded-xl bg-red-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 mb-1">Delete this project</p>
                                        <p className="text-[13px] text-gray-500 max-w-lg">Once you delete a project, there is no going back. Please be certain.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSettingsModalOpen(false);
                                            setDeleteProjectConfirmText('');
                                            setIsDeleteProjectModalOpen(true);
                                        }}
                                        className="shrink-0 px-5 py-2.5 text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all shadow-sm"
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            </div>

                        </form>

                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10">
                            <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="px-6 py-3.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button type="submit" form="settings-form" disabled={actionLoading} className="px-8 py-3.5 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] rounded-xl shadow-md shadow-none transition-all flex items-center gap-2 disabled:opacity-70">
                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GitHub-Style Delete Confirmation Modal */}
            {isDeleteProjectModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-semibold text-red-600 flex items-center gap-2">
                                <AlertTriangle size={20} /> Delete Project
                            </h3>
                            <button onClick={() => setIsDeleteProjectModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl mb-6">
                                <p className="font-semibold mb-1">Warning: Unexpected bad things will happen if you don't read this!</p>
                                <p>This action <strong>CANNOT</strong> be undone. This will permanently delete the <strong>{project.title}</strong> project, its blueprints, daily logs, material inventory, and all associated data.</p>
                            </div>

                            <p className="text-sm font-medium text-gray-700 mb-3">
                                Please type <strong>{project.title}</strong> to confirm.
                            </p>
                            <input
                                type="text"
                                value={deleteProjectConfirmText}
                                onChange={(e) => setDeleteProjectConfirmText(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-6 focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all font-mono text-sm"
                            />

                            <button
                                onClick={handleDeleteProject}
                                disabled={deleteProjectConfirmText !== project.title || actionLoading}
                                className="w-full py-3.5 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : "I understand the consequences, delete this project"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {isStatsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800">Update Metrics</h3>
                            <button onClick={() => setIsStatsModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleUpdateStats} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Task Completion %</label>
                                <input type="number" name="taskCompleted" min="0" max="100" defaultValue={project.stats.taskCompleted} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-1 focus:ring-violet-400 outline-none transition-all" />
                            </div>
                            <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-violet-600 uppercase tracking-wider">Budget Burn Rate</span>
                                    <span className="text-xs font-bold text-violet-700">{project.stats.budgetSpent}%</span>
                                </div>
                                <p className="text-[11px] text-gray-500">This is auto-calculated from your material delivery costs vs. project budget. Add material deliveries in the Inventory tab to update this metric.</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsStatsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Metrics"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Live Feed Modal */}
            {isFeedModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800">Upload Site Photo</h3>
                            <button onClick={() => setIsFeedModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleAddFeed} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Title</label>
                                <input type="text" name="title" placeholder="e.g. Steel Delivery" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-1 focus:ring-violet-400 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Location / Zone</label>
                                <input type="text" name="location" placeholder="e.g. Block A" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-1 focus:ring-violet-400 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Image Files</label>
                                <input type="file" name="images" accept="image/*" multiple required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-600 hover:file:bg-violet-100" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsFeedModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Upload Photo"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Modal */}
            {isTaskModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-gray-800">Add Critical Task</h3>
                            <button onClick={() => setIsTaskModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleAddTask} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Task Title</label>
                                <input type="text" name="title" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Description</label>
                                <input type="text" name="desc" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Urgency</label>
                                    <select name="status" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 outline-none">
                                        <option value="urgent">Urgent</option>
                                        <option value="warning">Warning</option>
                                        <option value="info">Info</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Icon</label>
                                    <select name="icon" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 outline-none">
                                        <option value="triangle">Triangle/Warning</option>
                                        <option value="clipboard">Clipboard</option>
                                        <option value="file">File</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Initials / Assignee</label>
                                <input type="text" name="assignee" placeholder="e.g. DM" maxLength="2" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-gray-300 outline-none transition-all uppercase" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-5 py-2.5 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Add Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {taskToDelete && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={28} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Task?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Are you sure you want to delete this critical task? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setTaskToDelete(null)}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteTask}
                                    disabled={actionLoading}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Personnel Modal */}
            {isPersonnelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <UserPlus size={22} className="text-violet-500" /> Allocate Personnel
                            </h3>
                            <button onClick={() => setIsPersonnelModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddPersonnel} className="p-6 space-y-5 bg-gray-50/30 overflow-y-auto max-h-[70vh]">

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Select Personnel</label>
                                {availablePersonnel.length > 0 ? (
                                    <select name="personnelId" required className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm">
                                        <option value="" disabled selected>-- Select a team member --</option>
                                        {availablePersonnel.map((person) => (
                                            <option key={person._id} value={person._id}>
                                                {person.name} ({person.role})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200">
                                        No unassigned personnel available. Please add more members from the main Personnel page.
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Initial Status</label>
                                <select name="status" defaultValue="On Site" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-gray-300 focus:ring-2 focus:ring-violet-100 outline-none transition-all shadow-sm text-sm">
                                    <option value="On Site">On Site</option>
                                    <option value="Remote">Remote</option>
                                    <option value="Off Duty">Off Duty</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsPersonnelModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={actionLoading} className="px-6 py-2.5 text-sm font-medium text-white bg-[#1a1d2e] hover:bg-[#252840] rounded-xl shadow-md shadow-none transition-all flex items-center gap-2 disabled:opacity-70">
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
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}>
        <span className={`transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
        {active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500"></div>}
    </a>
);

const Tab = ({ active, icon, label, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all shrink-0 rounded-lg ${active ? 'bg-[#1a1d2e] text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
        {icon} {label}
    </button>
);

const MetaBlock = ({ title, value, highlight, status }) => (
    <div>
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-base font-semibold ${status === 'Delayed' ? 'text-red-500' : status === 'Completed' ? 'text-green-500' : highlight ? 'text-emerald-500' : 'text-gray-900'}`}>{value}</p>
    </div>
);

export default ProjectDetail;
