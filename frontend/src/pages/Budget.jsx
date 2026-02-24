import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings,
    Wallet, Building2, AlertTriangle, Hourglass, FileSpreadsheet,
    TrendingUp, Check, X, ChevronRight, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Budget = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [companyName, setCompanyName] = useState('BuildCore');
    const [companyInitial, setCompanyInitial] = useState('B');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => { fetchBudgetData(); }, []);

    const fetchBudgetData = async () => {
        try { const response = await api.get('/budget'); setData(response.data); }
        catch (error) { console.error("Failed to fetch budget data:", error); }
        finally { setLoading(false); }
    };

    const handleApproval = async (id, action) => {
        setData(prev => ({
            ...prev,
            pendingRequests: prev.pendingRequests.filter(req => req.id !== id),
            kpis: { ...prev.kpis, pendingApprovals: { ...prev.kpis.pendingApprovals, value: parseInt(prev.kpis.pendingApprovals.value) - 1 } }
        }));
        console.log(`Request ${id} marked as ${action}`);
    };

    if (loading || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f6f7f9]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm">Loading financials...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-6 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0"><img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" /></div>
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
                    <NavItem icon={<BarChart3 size={17} />} text="Budget" active href="/budget" />
                    <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />
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
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Budget</h1>
                        <p className="text-[13px] text-gray-400 mt-0.5">Financial overview and approval workflow</p>
                    </div>
                </header>

                <div className="px-8 py-6 space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-4 gap-4">
                        <KpiCard title="Total Allocated" value={data.kpis.totalAllocated.value} sub={data.kpis.totalAllocated.trend} icon={<Wallet size={16} />} color="violet" />
                        <KpiCard title="Actual Spent" value={data.kpis.actualSpent.value} sub={data.kpis.actualSpent.subtext} icon={<Building2 size={16} />} color="blue" />
                        <KpiCard title="Budget Overruns" value={data.kpis.budgetOverruns.value} sub={data.kpis.budgetOverruns.subtext} icon={<AlertTriangle size={16} />} color="red" />
                        <KpiCard title="Pending Approvals" value={data.kpis.pendingApprovals.value} sub={data.kpis.pendingApprovals.subtext} icon={<Hourglass size={16} />} color="amber" />
                    </div>

                    {/* Chart + Overruns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-5">Budget vs. Actual</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={6}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '10px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '12px' }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} />
                                        <Bar dataKey="allocated" name="Allocated" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="spent" name="Spent" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <AlertTriangle size={13} className="text-red-500" /> Overruns
                            </h3>
                            <div className="space-y-3 flex-1">
                                {data.overrunAlerts.map(alert => (
                                    <div key={alert.id} className="bg-red-50/50 border border-red-100/50 rounded-xl p-3.5">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-xs font-medium text-gray-900">{alert.project}</h4>
                                            <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">{alert.overage}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400">{alert.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Transactions + Approvals */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
                            </div>
                            {data.recentTransactions.length === 0 ? (
                                <div className="px-6 py-16 text-center text-gray-300 text-sm">No recent transactions</div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.recentTransactions.map(tx => (
                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-6">
                                                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                                                    <p className="text-[11px] text-gray-300 mt-0.5">{tx.invoice}</p>
                                                </td>
                                                <td className="py-3 px-6 text-xs text-gray-500">{tx.project}</td>
                                                <td className="py-3 px-6 text-sm font-semibold text-gray-900 text-right">{tx.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-gray-900">Pending Approvals</h3>
                                <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{data.pendingRequests.length} pending</span>
                            </div>
                            <div className="p-4 space-y-3">
                                {data.pendingRequests.length === 0 ? (
                                    <div className="flex flex-col items-center py-12 text-gray-300">
                                        <Check size={32} className="mb-3 text-gray-200" />
                                        <p className="text-sm">All caught up!</p>
                                    </div>
                                ) : (
                                    data.pendingRequests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${req.type === 'vendor' ? 'bg-amber-50 text-amber-500' :
                                                        req.type === 'extension' ? 'bg-violet-50 text-violet-500' :
                                                            'bg-violet-50 text-violet-500'
                                                    }`}>
                                                    {req.type === 'vendor' ? <FileSpreadsheet size={15} /> : req.type === 'extension' ? <TrendingUp size={15} /> : <FileText size={15} />}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-medium text-gray-900">{req.title}</p>
                                                    <p className="text-[11px] text-gray-400">{req.from} • <span className="text-gray-600 font-medium">{req.amount}</span></p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleApproval(req.id, 'approve')} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="Approve">
                                                    <Check size={14} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => handleApproval(req.id, 'reject')} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors" title="Reject">
                                                    <X size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
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

const KpiCard = ({ title, value, sub, icon, color }) => {
    const colors = {
        violet: { bg: 'bg-violet-50', ic: 'text-violet-500', sub: 'text-violet-600' },
        blue: { bg: 'bg-violet-50', ic: 'text-violet-500', sub: 'text-violet-500' },
        red: { bg: 'bg-red-50', ic: 'text-red-500', sub: 'text-red-600' },
        amber: { bg: 'bg-amber-50', ic: 'text-amber-500', sub: 'text-amber-600' },
    };
    const c = colors[color] || colors.violet;
    return (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{title}</p>
                <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center ${c.ic}`}>{icon}</div>
            </div>
            <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
            {sub && <p className={`text-xs mt-1.5 ${c.sub} font-medium`}>{sub}</p>}
        </div>
    );
};

export default Budget;
