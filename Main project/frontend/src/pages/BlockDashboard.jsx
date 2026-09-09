import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, LayoutDashboard, FolderOpen, Users, FileText,
    Settings, Layers, FileClock, BarChart3, ChevronRight
} from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';
import BlueprintTab from '../components/BlueprintTab';
import DailyLogsTab from '../components/DailyLogsTab';
import GlobalLoader from '../components/GlobalLoader';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ icon, text, href, active }) => (
    <a
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
            ? 'bg-white/10 text-white shadow-sm'
            : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
            }`}
    >
        {icon}
        <span>{text}</span>
    </a>
);

const BlockDashboard = () => {
    const { projectId, blockId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [block, setBlock] = useState(null);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('blueprint');

    useEffect(() => {
        const load = async () => {
            try {
                const [blockRes, projectRes] = await Promise.all([
                    api.get(`/projects/${projectId}/blocks/${blockId}`),
                    api.get(`/projects/${projectId}`)
                ]);
                setBlock(blockRes.data);
                setProject(projectRes.data);
            } catch (err) {
                console.error('Failed to load block dashboard:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId, blockId]);

    if (loading || !block || !project) return <GlobalLoader />;

    const Tab = ({ active, onClick, icon, label }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all border-b-2 ${active
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-5 flex items-center justify-center">
                    <CompanyLogo className="w-28 h-auto object-contain opacity-90" defaultLogoType="white" />
                </div>
                <nav className="flex-1 px-3 space-y-0.5 mt-2">
                    <div className="px-3 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p></div>
                    <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" href="/" />
                    <NavItem icon={<FolderOpen size={17} />} text="Projects" active href="/projects" />
                    {['Admin', 'Site Manager'].includes(currentUser?.role) && <NavItem icon={<Users size={17} />} text="Personnel" href="/personnel" />}
                    {['Admin'].includes(currentUser?.role) && <NavItem icon={<BarChart3 size={17} />} text="Budget" href="/budget" />}
                    {['Admin', 'Site Manager', 'Client'].includes(currentUser?.role) && <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />}
                    {['Admin', 'Site Manager'].includes(currentUser?.role) && (
                        <>
                            <div className="px-3 mt-6 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p></div>
                            <NavItem icon={<Settings size={17} />} text="Settings" href="/settings" />
                        </>
                    )}
                </nav>

                {/* Bottom section */}
                <div className="px-3 pb-2">
                    <div className="px-3 py-2.5 rounded-xl mb-3 border bg-violet-500/[0.08] border-violet-500/10">
                        <p className="text-[10px] text-white/30 font-semibold uppercase tracking-widest mb-0.5">Current Block</p>
                        <p className="text-xs font-medium text-white/80 truncate">{block.name}</p>
                        <p className="text-[10px] mt-0.5 text-violet-400/60 font-semibold truncate">{project.title}</p>
                    </div>
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

            {/* ─── MAIN ─── */}
            <main className="flex-1 overflow-y-auto bg-[#f6f7f9] text-gray-800">
                <div className="p-8 max-w-[1400px] mx-auto">

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-8">
                        <button
                            onClick={() => navigate('/projects')}
                            className="p-2 hover:bg-white rounded-lg hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <button onClick={() => navigate(`/projects/${projectId}`)} className="hover:text-gray-900 transition-colors">
                            {project.title}
                        </button>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-900 font-bold">{block.name}</span>
                    </div>

                    {/* Block Header Card */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                {block.name.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">{block.name}</h1>
                                {block.description && <p className="text-sm text-gray-500 mt-0.5">{block.description}</p>}
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${block.status === 'Completed'
                            ? 'bg-green-50 text-green-600 border border-green-100'
                            : block.status === 'In Progress'
                                ? 'bg-violet-50 text-violet-600 border border-violet-100'
                                : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}>
                            {block.status || 'In Progress'}
                        </span>
                    </div>

                    {/* Tabs — Blueprint + Daily Logs only (Inventory & Personnel are at project level) */}
                    <div className="flex gap-2 border-b border-gray-200 mb-8 overflow-x-auto pb-1 no-scrollbar">
                        <Tab active={activeTab === 'blueprint'} onClick={() => setActiveTab('blueprint')} icon={<Layers size={18} />} label="Blueprints" />
                        <Tab active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<FileClock size={18} />} label="Daily Logs" />
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'blueprint' && <BlueprintTab projectId={projectId} blockId={blockId} />}
                    {activeTab === 'logs' && <DailyLogsTab projectId={projectId} blockId={blockId} />}
                </div>
            </main>
        </div>
    );
};

export default BlockDashboard;
