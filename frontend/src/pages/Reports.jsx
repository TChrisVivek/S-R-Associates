import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    Download, FileIcon, Calendar, Box, Wallet, UploadCloud, File as FilePdf, Trash2, Eye, Bell, Moon, Loader2, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Reports = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('generated');
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [systemReports, setSystemReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/projects');
            const projects = response.data || [];

            const docs = [];
            projects.forEach(project => {
                if (project.blueprints && Array.isArray(project.blueprints)) {
                    project.blueprints.forEach(bp => {
                        docs.push({
                            id: bp._id || Math.random().toString(),
                            name: bp.name || 'Unknown Document',
                            url: bp.url,
                            originalUrl: bp.originalUrl || bp.url.replace("-1.jpg", ".pdf"),
                            project: project.title || 'Unknown Project',
                            uploadedBy: project.manager || 'System',
                            date: bp.uploadedAt ? new Date(bp.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown Date',
                            type: 'Blueprint',
                            size: 'Unknown'
                        });
                    });
                }
            });

            setUploadedDocs(docs);
            setSystemReports([]); // Empty for now as discussed
        } catch (error) {
            console.error("Failed to fetch reports data", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-800 relative">

            {/* --- SIDEBAR --- */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col z-20 hidden md:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        {companyInitial}
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">{companyName}</span>
                </div>
                <nav className="flex-1 px-4 space-y-1 mt-2">
                    <NavItem icon={<LayoutDashboard size={20} />} text="Command Center" href="/" />
                    <NavItem icon={<FolderOpen size={20} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={20} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<PieChart size={20} />} text="Budget" href="/budget" />
                    <NavItem icon={<FileText size={20} />} text="Reports" active href="/reports" />
                    <NavItem icon={<Settings size={20} />} text="Settings" href="/settings" />
                </nav>
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

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto">

                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                        <p className="text-sm text-gray-500">Generate and manage construction business insights</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="text-gray-400 hover:text-gray-600"><Bell size={20} /></button>
                        <div className="flex items-center gap-3 border-l pl-6 border-gray-200 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition" onClick={() => navigate('/profile')}>
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-800">{currentUser?.username || 'User'}</p>
                                <p className="text-xs text-gray-500">{currentUser?.role || 'Guest'}</p>
                            </div>
                            {currentUser?.profile_image ? (
                                <img src={currentUser.profile_image} alt="User" className="w-10 h-10 rounded-full border border-gray-200" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 font-bold">
                                    {currentUser?.username?.[0] || 'U'}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-8">

                    {/* Custom Tab Navigation */}
                    <div className="flex gap-4 border-b border-gray-200 mb-8">
                        <button
                            onClick={() => setActiveTab('generated')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'generated' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            System Reports
                        </button>
                        <button
                            onClick={() => setActiveTab('vault')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'vault' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            Document Vault (Uploads)
                        </button>
                    </div>

                    {/* =========================================
              TAB 1: GENERATED REPORTS (From Screenshot) 
              ========================================= */}
                    {activeTab === 'generated' && (
                        <div className="animate-in fade-in duration-300">

                            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <PieChart size={18} className="text-blue-500" /> Available Reports
                            </h2>

                            {/* Report Generators */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <GeneratorCard
                                    title="Daily Progress"
                                    desc="Detailed log of site activities, manpower usage, and milestone completions for the last 24 hours."
                                    icon={<Calendar size={20} className="text-blue-500" />}
                                />
                                <GeneratorCard
                                    title="Inventory Report"
                                    desc="Current stock levels, material consumption rates, and upcoming procurement requirements."
                                    icon={<Box size={20} className="text-emerald-500" />}
                                />
                                <GeneratorCard
                                    title="Financial Summary"
                                    desc="Comprehensive breakdown of project spending, invoice status, and budget variances."
                                    icon={<Wallet size={20} className="text-orange-500" />}
                                />
                            </div>

                            {/* Recent History Table */}
                            <div className="flex justify-between items-end mb-4">
                                <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    <FileText size={18} className="text-blue-500" /> Recent History
                                </h2>
                                <button className="text-sm text-blue-600 font-bold hover:underline">View All History</button>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            <th className="py-3 px-6">Report Name</th>
                                            <th className="py-3 px-6">Project</th>
                                            <th className="py-3 px-6">Date Generated</th>
                                            <th className="py-3 px-6">Status</th>
                                            <th className="py-3 px-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {systemReports.length > 0 ? (
                                            systemReports.map(report => (
                                                <tr key={report.id} className="hover:bg-gray-50 transition">
                                                    <td className="py-4 px-6 flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded"><FileIcon size={16} /></div>
                                                        <div>
                                                            <p className="font-bold text-gray-800">{report.name}</p>
                                                            <p className="text-xs text-gray-400">{report.size}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-gray-600">{report.project}</td>
                                                    <td className="py-4 px-6 text-gray-600">{report.date}</td>
                                                    <td className="py-4 px-6">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${report.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            • {report.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded transition"><Download size={18} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-gray-500">
                                                    {isLoading ? (
                                                        <div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin text-blue-500" size={18} /> Loading records...</div>
                                                    ) : "No generated reports found."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Custom Banner */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold mb-2">Need a Custom Report?</h2>
                                    <p className="text-blue-100 max-w-lg mb-6 text-sm leading-relaxed">Our data team can help you build specialized visualizations and data exports for your specific stakeholder needs.</p>
                                    <button className="bg-white text-blue-600 font-bold py-2.5 px-6 rounded-lg shadow-sm hover:bg-gray-50 transition">Request Custom Build</button>
                                </div>
                                {/* Decorative element mimicking the screenshot */}
                                <PieChart size={200} className="absolute -right-10 -bottom-10 text-white opacity-10" />
                            </div>
                        </div>
                    )}

                    {/* =========================================
              TAB 2: DOCUMENT VAULT (For Manual Uploads)
              ========================================= */}
                    {activeTab === 'vault' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">Project Documents</h2>
                                    <p className="text-sm text-gray-500">Manage uploaded blueprints, permits, and invoices.</p>
                                </div>
                                <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm transition">
                                    <UploadCloud size={18} /> Upload File
                                </button>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            <th className="py-3 px-6">File Name</th>
                                            <th className="py-3 px-6">Project / Tag</th>
                                            <th className="py-3 px-6">Uploaded By</th>
                                            <th className="py-3 px-6">Date</th>
                                            <th className="py-3 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {uploadedDocs.length > 0 ? (
                                            uploadedDocs.map(doc => (
                                                <tr key={doc.id} className="hover:bg-gray-50 transition group">
                                                    <td className="py-4 px-6 flex items-start gap-3">
                                                        <div className={`p-2 rounded mt-1 ${doc.type === 'Blueprint' ? 'bg-purple-50 text-purple-600' : 'bg-red-50 text-red-600'}`}>
                                                            <FilePdf size={20} />
                                                        </div>
                                                        <div>
                                                            {/* Truncate long file names like your Mahanth Motors PDF */}
                                                            <p className="font-bold text-gray-800 max-w-md truncate" title={doc.name}>{doc.name}</p>
                                                            <p className="text-xs text-gray-400">{doc.size} • {doc.type}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-gray-600">{doc.project}</td>
                                                    <td className="py-4 px-6 text-gray-600">{doc.uploadedBy}</td>
                                                    <td className="py-4 px-6 text-gray-500">{doc.date}</td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {doc.originalUrl && (
                                                                <a href={doc.originalUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="View"><Eye size={18} /></a>
                                                            )}
                                                            {doc.originalUrl && (
                                                                <a href={doc.originalUrl} download target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded transition" title="Download"><Download size={18} /></a>
                                                            )}
                                                            <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Delete"><Trash2 size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-gray-500">
                                                    {isLoading ? (
                                                        <div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin text-blue-500" size={18} /> Loading documents...</div>
                                                    ) : "No documents uploaded yet."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
};

// Reusable Components
const NavItem = ({ icon, text, active, href }) => (
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
        {icon}
        <span className="font-medium text-sm">{text}</span>
    </a>
);

const GeneratorCard = ({ title, desc, icon }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
            {icon}
        </div>
        <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">{desc}</p>

        <div className="space-y-2 mt-auto">
            <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm">
                Generate
            </button>
            <button className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-2 rounded-lg text-sm hover:bg-gray-50 transition flex items-center justify-center gap-2 shadow-sm">
                <Download size={16} /> Download PDF
            </button>
        </div>
    </div>
);

export default Reports;
