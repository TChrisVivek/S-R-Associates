import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    Download, FileIcon, Calendar, Box, Wallet, UploadCloud, File as FilePdf,
    Trash2, Eye, Loader2, ChevronRight, BarChart3
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
            if (shortName) { setCompanyName(shortName); setCompanyInitial(shortName[0].toUpperCase()); }
            else { setCompanyName('BuildCore'); setCompanyInitial('B'); }
        };
        updateCompanyDisplay();
        window.addEventListener('companyNameUpdated', updateCompanyDisplay);
        return () => window.removeEventListener('companyNameUpdated', updateCompanyDisplay);
    }, []);

    useEffect(() => { fetchData(); }, []);

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
                            type: 'Blueprint', size: 'Unknown'
                        });
                    });
                }
            });
            setUploadedDocs(docs);
            setSystemReports([]);
        } catch (error) { console.error("Failed to fetch reports data", error); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
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
                    <NavItem icon={<FileText size={17} />} text="Reports" active href="/reports" />
                    <div className="px-3 mt-6 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p></div>
                    <NavItem icon={<Settings size={17} />} text="Settings" href="/settings" />
                </nav>
                <div className="px-3 pb-4">
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
            <main className="flex-1 overflow-y-auto bg-[#f6f7f9]">
                <header className="sticky top-0 z-10 px-8 py-5 flex justify-between items-center bg-[#f6f7f9]/90 backdrop-blur-sm border-b border-gray-100">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Reports</h1>
                        <p className="text-[13px] text-gray-400 mt-0.5">Generate and manage construction insights</p>
                    </div>
                </header>

                <div className="px-8 py-6 space-y-6">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit">
                        <button onClick={() => setActiveTab('generated')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'generated' ? 'bg-[#1a1d2e] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                            System Reports
                        </button>
                        <button onClick={() => setActiveTab('vault')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'vault' ? 'bg-[#1a1d2e] text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                            Document Vault
                        </button>
                    </div>

                    {/* TAB 1: System Reports */}
                    {activeTab === 'generated' && (
                        <div className="space-y-6">
                            {/* Report Generators */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <GeneratorCard title="Daily Progress" desc="Site activities, manpower usage, and milestone completions." icon={<Calendar size={16} className="text-violet-500" />} />
                                <GeneratorCard title="Inventory Report" desc="Stock levels, consumption rates, and procurement needs." icon={<Box size={16} className="text-emerald-500" />} />
                                <GeneratorCard title="Financial Summary" desc="Spending breakdown, invoice status, and budget variances." icon={<Wallet size={16} className="text-violet-500" />} />
                            </div>

                            {/* History Table */}
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-50">
                                    <h3 className="text-sm font-semibold text-gray-900">Report History</h3>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Report</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {systemReports.length > 0 ? (
                                            systemReports.map(report => (
                                                <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-3 px-6 flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center"><FileIcon size={14} className="text-violet-500" /></div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{report.name}</p>
                                                            <p className="text-[11px] text-gray-300">{report.size}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-6 text-xs text-gray-500">{report.project}</td>
                                                    <td className="py-3 px-6 text-xs text-gray-400">{report.date}</td>
                                                    <td className="py-3 px-6"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${report.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{report.status}</span></td>
                                                    <td className="py-3 px-6 text-right"><button className="text-gray-200 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"><Download size={14} /></button></td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="py-16 text-center text-gray-300 text-sm">
                                                    {isLoading ? <span className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading...</span> : "No generated reports yet"}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* CTA Banner */}
                            <div className="bg-gradient-to-br from-[#1a1d2e] to-[#252840] rounded-2xl p-6 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-base font-semibold mb-1">Need a Custom Report?</h2>
                                    <p className="text-white/40 text-sm mb-4 max-w-md">Build specialized visualizations and data exports for your stakeholders.</p>
                                    <button className="bg-white text-gray-900 text-xs font-medium py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors">Request Custom Build</button>
                                </div>
                                <PieChart size={140} className="absolute -right-6 -bottom-6 text-white/[0.03]" />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Document Vault */}
                    {activeTab === 'vault' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Project Documents</h3>
                                        <p className="text-[11px] text-gray-400 mt-0.5">{uploadedDocs.length} files uploaded</p>
                                    </div>
                                    <button className="bg-[#1a1d2e] hover:bg-[#252840] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors">
                                        <UploadCloud size={13} /> Upload
                                    </button>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">File</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Uploaded By</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {uploadedDocs.length > 0 ? (
                                            uploadedDocs.map(doc => (
                                                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="py-3 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center"><FilePdf size={14} className="text-violet-500" /></div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 max-w-[250px] truncate">{doc.name}</p>
                                                                <p className="text-[11px] text-gray-300">{doc.type}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-6 text-xs text-gray-500">{doc.project}</td>
                                                    <td className="py-3 px-6 text-xs text-gray-500">{doc.uploadedBy}</td>
                                                    <td className="py-3 px-6 text-xs text-gray-400">{doc.date}</td>
                                                    <td className="py-3 px-6 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {doc.originalUrl && <a href={doc.originalUrl} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-violet-500 p-1.5 rounded-lg hover:bg-violet-50 transition-colors"><Eye size={13} /></a>}
                                                            {doc.originalUrl && <a href={doc.originalUrl} download target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"><Download size={13} /></a>}
                                                            <button className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="py-16 text-center text-gray-300 text-sm">
                                                    {isLoading ? <span className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading...</span> : "No documents uploaded yet"}
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

const NavItem = ({ icon, text, active, href }) => (
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}>
        <span className={`transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
        {active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500"></div>}
    </a>
);

const GeneratorCard = ({ title, desc, icon }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col hover:border-gray-200 transition-colors">
        <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center mb-3">{icon}</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{desc}</p>
        <div className="space-y-2">
            <button className="w-full bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-medium py-2 rounded-lg transition-colors">Generate</button>
            <button className="w-full bg-gray-50 text-gray-600 text-xs font-medium py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5">
                <Download size={12} /> Download PDF
            </button>
        </div>
    </div>
);

export default Reports;
