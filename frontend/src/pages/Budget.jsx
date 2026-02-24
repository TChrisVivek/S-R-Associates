import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    Wallet, Building2, AlertTriangle, Hourglass, FileSpreadsheet, TrendingUp, Check, X, Moon, Filter, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Budget = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [error, setError] = useState(null);
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
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Real Data on Mount
    useEffect(() => {
        fetchBudgetData();
    }, []);

    const fetchBudgetData = async () => {
        try {
            const response = await api.get('/budget');
            setData(response.data);
        } catch (error) {
            console.error("Failed to fetch budget data:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Handle Approvals Dynamically
    const handleApproval = async (id, action) => {
        // Optimistic UI Update: Remove it from the screen immediately
        setData(prev => ({
            ...prev,
            pendingRequests: prev.pendingRequests.filter(req => req.id !== id),
            kpis: {
                ...prev.kpis,
                pendingApprovals: { ...prev.kpis.pendingApprovals, value: parseInt(prev.kpis.pendingApprovals.value) - 1 }
            }
        }));

        // TODO: Send POST request to backend to actually approve/reject in database
        console.log(`Request ${id} marked as ${action}`);
    };

    if (loading || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-blue-600 font-bold animate-pulse">Loading Financials...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden">

            {/* --- SIDEBAR --- */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col z-20 hidden md:flex shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        {companyInitial}
                    </div>
                    <span className="font-bold text-2xl text-slate-800 tracking-tight">{companyName}</span>
                </div>
                <nav className="flex-1 px-6 space-y-2 mt-4">
                    <NavItem icon={<LayoutDashboard size={22} />} text="Command Center" href="/" />
                    <NavItem icon={<FolderOpen size={22} />} text="Projects" href="/projects" />
                    <NavItem icon={<Users size={22} />} text="Personnel" href="/personnel" />
                    <NavItem icon={<PieChart size={22} />} text="Budget" active href="/budget" />
                    <NavItem icon={<FileText size={22} />} text="Reports" href="/reports" />
                    <NavItem icon={<Settings size={22} />} text="Settings" href="/settings" />
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
            <main className="flex-1 overflow-y-auto relative p-8">
                {/* Decorative Background Blob */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none z-0" />

                {/* Header */}
                <div className="relative z-10 flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Enterprise Budget Ledger</h1>
                        <p className="text-slate-500 font-medium">Financial overview, allocation tracking, and approval workflow.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-5 py-2.5 bg-white/70 backdrop-blur-md border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-white hover:shadow-md transition-all flex items-center gap-2">
                            <Filter size={18} /> All Regions
                        </button>
                        <button className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">
                            Create Disbursement
                        </button>
                    </div>
                </div>

                {/* 1. KPI Cards */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KpiCard title="Total Allocated" value={data.kpis.totalAllocated.value} subtext={data.kpis.totalAllocated.trend} icon={<Wallet />} gradient="from-blue-500 to-blue-600" />
                    <KpiCard title="Actual Spent" value={data.kpis.actualSpent.value} subtext={data.kpis.actualSpent.subtext} icon={<Building2 />} gradient="from-violet-500 to-purple-600" />
                    <KpiCard title="Budget Overruns" value={data.kpis.budgetOverruns.value} subtext={data.kpis.budgetOverruns.subtext} icon={<AlertTriangle />} gradient="from-red-500 to-rose-600" isAlert />
                    <KpiCard title="Pending Approvals" value={data.kpis.pendingApprovals.value} subtext={data.kpis.pendingApprovals.subtext} icon={<Hourglass />} gradient="from-amber-400 to-orange-500" />
                </div>

                {/* 2. Middle Section: Chart & Alerts */}
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                    {/* Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
                        <h3 className="font-bold text-slate-800 mb-6 flex justify-between items-center text-lg">
                            Budget vs. Actual Performance
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }} />
                                    <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                    <Bar dataKey="spent" name="Spent" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Overrun Alerts */}
                    <div className="bg-red-50/50 backdrop-blur-sm p-6 rounded-2xl border border-red-100 flex flex-col">
                        <h3 className="font-extrabold text-red-700 flex items-center gap-2 mb-6 text-lg">
                            <AlertTriangle size={20} /> Budget Overruns
                        </h3>
                        <div className="space-y-4 flex-1">
                            {data.overrunAlerts.map(alert => (
                                <div key={alert.id} className="bg-white p-5 rounded-xl shadow-sm border border-red-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm text-slate-800">{alert.project}</h4>
                                        <span className="bg-red-100 text-red-700 text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-lg">{alert.overage}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mb-3">{alert.reason}</p>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-gradient-to-r from-red-500 to-rose-500 h-full rounded-full w-full animate-pulse"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="text-red-600 font-bold text-sm text-center w-full mt-6 py-2 hover:bg-red-50 rounded-lg transition-colors">View All Critical Alerts</button>
                    </div>
                </div>

                {/* 3. Bottom Section: Ledger & Approvals */}
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">

                    {/* Recent Transactions Table */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 text-lg">Recent Transactions</h3>
                            <button className="text-blue-600 text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">View Ledger</button>
                        </div>
                        {data.recentTransactions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <p className="font-medium">No recent transactions found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                                        <th className="pb-4 pl-2">Description</th>
                                        <th className="pb-4">Project</th>
                                        <th className="pb-4">Date</th>
                                        <th className="pb-4 text-right pr-2">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.recentTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-4 pl-2">
                                                <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{tx.description}</p>
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">{tx.invoice}</p>
                                            </td>
                                            <td className="py-4 text-slate-600 font-medium">{tx.project}</td>
                                            <td className="py-4 text-slate-500 text-xs font-medium">
                                                {tx.date.split(',')[0]}<br />{tx.date.split(',')[1]}
                                            </td>
                                            <td className="py-4 font-bold text-slate-900 text-right pr-2">{tx.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pending Approvals Queue */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 text-lg">Pending Approvals</h3>
                            <span className="bg-blue-50 text-blue-600 text-xs font-extrabold uppercase tracking-wide px-3 py-1 rounded-lg">Priority Queue</span>
                        </div>
                        <div className="space-y-4">
                            {data.pendingRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <Check size={48} className="mb-4 text-slate-200" />
                                    <p className="font-medium">All caught up!</p>
                                    <p className="text-xs text-slate-400 mt-1">No pending approvals at this time.</p>
                                </div>
                            ) : (
                                data.pendingRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all hover:shadow-sm hover:border-blue-100 group">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${req.type === 'vendor' ? 'bg-orange-50 text-orange-600' : req.type === 'extension' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                {req.type === 'vendor' ? <FileSpreadsheet size={20} /> : req.type === 'extension' ? <TrendingUp size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">{req.title}</p>
                                                <p className="text-xs text-slate-400 font-medium mt-0.5">From: {req.from} • <span className="text-slate-600 font-bold">{req.amount}</span> • {req.project}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleApproval(req.id, 'approve')} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center hover:bg-emerald-100 hover:scale-110 shadow-sm transition-all" title="Approve">
                                                <Check size={18} strokeWidth={3} />
                                            </button>
                                            <button onClick={() => handleApproval(req.id, 'reject')} className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center hover:bg-red-100 hover:scale-110 shadow-sm transition-all" title="Reject">
                                                <X size={18} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

// Reusable Sub-components
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

const KpiCard = ({ title, value, subtext, icon, gradient, isAlert }) => (
    <div className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${isAlert ? 'border-red-100' : ''}`}>

        <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                <h3 className="text-slate-500 text-xs font-extrabold uppercase tracking-wider mb-1">{title}</h3>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
        </div>

        <div className={`relative z-10 text-xs font-bold flex items-center gap-1.5 ${isAlert ? 'text-red-600' : 'text-emerald-600'}`}>
            {isAlert ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
            {subtext}
        </div>

        {/* Decorative Circle */}
        <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-[0.05] bg-gradient-to-br ${gradient} group-hover:opacity-[0.1] transition-opacity`} />
    </div>
);

export default Budget;
