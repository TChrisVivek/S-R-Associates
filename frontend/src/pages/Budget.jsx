import React, { useState, useEffect } from 'react';
import CompanyLogo from '../components/CompanyLogo';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings,
    Wallet, Building2, AlertTriangle, Hourglass, FileSpreadsheet,
    TrendingUp, TrendingDown, Check, X, ChevronRight, BarChart3, Plus, Loader2, Edit2,
    ArrowDownRight, Package, Wrench, HardHat, Puzzle, CircleDot, Image
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GlobalLoader from '../components/GlobalLoader';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const CATEGORY_COLORS = {
    Vendor: '#7c3aed',
    Labor: '#6366f1',
    Material: '#0ea5e9',
    Equipment: '#a78bfa',
    Extension: '#e879f9',
    Miscellaneous: '#94a3b8'
};

const Budget = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [companyName, setCompanyName] = useState('S R Associates');
    const [companyInitial, setCompanyInitial] = useState('B');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Expense Modal States
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
    const [editExpenseId, setEditExpenseId] = useState(null);
    const [projectsList, setProjectsList] = useState([]);
    const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: 'Vendor', project: '', invoiceNumber: '', receipt: '', expenseDate: new Date().toISOString().split('T')[0] });
    const [expenseLoading, setExpenseLoading] = useState(false);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [formError, setFormError] = useState('');
    const { showToast, ToastComponent } = useToast();

    useEffect(() => {
        const updateCompanyDisplay = () => {
            const shortName = localStorage.getItem('companyShortName');
            if (shortName) { setCompanyName(shortName); setCompanyInitial(shortName[0].toUpperCase()); }
            else { setCompanyName('S R Associates'); setCompanyInitial('B'); }
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
        try {
            const status = action === 'approve' ? 'Approved' : 'Rejected';
            await api.put(`/expenses/${id}/status`, { status });
            showToast(`Expense ${status.toLowerCase()} successfully!`, 'success');
            fetchBudgetData();
        } catch (error) {
            console.error(`Failed to ${action} expense:`, error);
            showToast(`Failed to ${action} expense`, 'error');
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjectsList(res.data);
            if (res.data.length > 0 && !expenseForm.project && !editExpenseId) {
                setExpenseForm(prev => ({ ...prev, project: res.data[0]._id }));
            }
        } catch (error) {
            console.error('Failed to fetch projects for expense form');
            showToast('Failed to load projects list', 'error');
        }
    };

    const handleEditExpense = (expenseId) => {
        const req = data.pendingRequests.find(r => r.id === expenseId);
        if (req && req.originalData) {
            setEditExpenseId(expenseId);
            setExpenseForm({
                title: req.originalData.title || '',
                amount: req.originalData.amount || '',
                category: req.originalData.category || 'Vendor',
                project: req.originalData.project?._id || req.originalData.project || '',
                invoiceNumber: req.originalData.invoiceNumber || '',
                receipt: req.originalData.receipt || '',
                expenseDate: req.originalData.expenseDate ? new Date(req.originalData.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
            fetchProjects();
            setIsAddExpenseModalOpen(true);
        }
    };

    const handleAddExpenseSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!expenseForm.title || !expenseForm.amount || !expenseForm.category || !expenseForm.project) {
            return setFormError('Please fill in all required fields.');
        }

        try {
            setExpenseLoading(true);
            if (editExpenseId) {
                await api.put(`/expenses/${editExpenseId}`, expenseForm);
                showToast('Expense updated successfully!', 'success');
            } else {
                await api.post('/expenses', expenseForm);
                showToast('Expense submitted successfully!', 'success');
            }
            setIsAddExpenseModalOpen(false);
            setEditExpenseId(null);
            setExpenseForm({ title: '', amount: '', category: 'Vendor', project: '', invoiceNumber: '', receipt: '', expenseDate: new Date().toISOString().split('T')[0] });
            fetchBudgetData();
        } catch (error) {
            console.error('Add/Edit Expense Error:', error);
            setFormError(error.response?.data?.message || `Failed to ${editExpenseId ? 'update' : 'submit'} expense.`);
        } finally {
            setExpenseLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditExpenseId(null);
        setExpenseForm({ title: '', amount: '', category: 'Vendor', project: '', invoiceNumber: '', receipt: '', expenseDate: new Date().toISOString().split('T')[0] });
        fetchProjects();
        setIsAddExpenseModalOpen(true);
    };

    const handleReceiptUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setIsUploadingReceipt(true);
            const url = await uploadToCloudinary(file);
            setExpenseForm(prev => ({ ...prev, receipt: url }));
            showToast('Receipt uploaded successfully!', 'success');
        } catch (error) {
            console.error('Failed to upload receipt:', error);
            showToast('Failed to upload receipt', 'error');
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    if (loading || !data) {
        return <GlobalLoader />;
    }

    return (
        <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
            {ToastComponent}
            {/* ─── SIDEBAR ─── */}
            <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                <div className="px-5 py-5 flex items-center justify-center"><CompanyLogo className="w-28 h-auto object-contain opacity-90" defaultLogoType="white" /></div>
                <nav className="flex-1 px-3 space-y-0.5 mt-2">
                    <div className="px-3 mb-3"><p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">Menu</p></div>
                    <NavItem icon={<LayoutDashboard size={17} />} text="Dashboard" href="/" />
                    <NavItem icon={<FolderOpen size={17} />} text="Projects" href="/projects" />
                    {['Admin', 'Site Manager'].includes(currentUser?.role) && <NavItem icon={<Users size={17} />} text="Personnel" href="/personnel" />}
                    {['Admin'].includes(currentUser?.role) && <NavItem icon={<BarChart3 size={17} />} text="Budget" active href="/budget" />}
                    {['Admin', 'Site Manager', 'Client'].includes(currentUser?.role) && <NavItem icon={<FileText size={17} />} text="Reports" href="/reports" />}
                    {['Admin', 'Site Manager'].includes(currentUser?.role) && (
                        <>
                            <div className="px-3 mt-6 mb-3">
                                <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p>
                            </div>
                            <NavItem icon={<Settings size={17} />} text="Settings" href="/settings" />
                        </>
                    )}
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
                        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Budget Portfolio</h1>
                        <p className="text-[13px] text-gray-400 mt-0.5">Global financial health and approval tracking</p>
                    </div>
                    {['Admin', 'Site Manager'].includes(currentUser?.role) && (
                        <button
                            onClick={openCreateModal}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
                        >
                            <Plus size={16} /> Add Expense
                        </button>
                    )}
                </header>

                <div className="px-8 py-6 space-y-6">
                    {/* ─── KPI CARDS ─── */}
                    <div className="grid grid-cols-4 gap-4">
                        <KpiCard
                            title="Total Allocated"
                            value={data.kpis.totalAllocated.value}
                            sub={data.kpis.totalAllocated.trend}
                            icon={<Wallet size={16} />}
                            color="violet"
                        />
                        <KpiCard
                            title="Actual Spent"
                            value={data.kpis.actualSpent.value}
                            sub={data.kpis.actualSpent.subtext}
                            extra={data.kpis.actualSpent.dailyAvg !== '₹0' ? `↓ ${data.kpis.actualSpent.dailyAvg} avg. daily` : null}
                            icon={<Building2 size={16} />}
                            color="blue"
                        />
                        <KpiCard
                            title="Budget Overruns"
                            value={data.kpis.budgetOverruns.value}
                            sub={data.kpis.budgetOverruns.subtext}
                            icon={<AlertTriangle size={16} />}
                            color="red"
                        />
                        <KpiCard
                            title="Pending Approvals"
                            value={data.kpis.pendingApprovals.value}
                            sub={data.kpis.pendingApprovals.subtext}
                            icon={<Hourglass size={16} />}
                            color="amber"
                        />
                    </div>

                    {/* ─── PROJECT UTILIZATION + CATEGORY BREAKDOWN ─── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Project Budget Utilization */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900">Project Budget Utilization</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Resource allocation consumption per project</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-5 max-h-[360px] overflow-y-auto">
                                {data.projectUtilization.length === 0 ? (
                                    <div className="flex flex-col items-center py-12 text-gray-300">
                                        <FolderOpen size={28} className="mb-3 text-gray-200" />
                                        <p className="text-sm">No projects found</p>
                                    </div>
                                ) : (
                                    data.projectUtilization.map(project => (
                                        <ProjectBar key={project.id} project={project} />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Expense Allocation Donut */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-gray-900">Expense Allocation</h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">Distribution across business categories</p>
                            </div>
                            {data.categoryBreakdown.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-8">
                                    <CircleDot size={28} className="mb-3 text-gray-200" />
                                    <p className="text-sm">No expenses recorded yet</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={data.categoryBreakdown}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={85}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {data.categoryBreakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '10px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', fontSize: '12px' }}
                                                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                                        {data.categoryBreakdown.map(cat => (
                                            <div key={cat.name} className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#94a3b8' }}></div>
                                                <span className="text-[11px] text-gray-500 truncate">{cat.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ─── OVERRUN ALERTS (only if there are any) ─── */}
                    {data.overrunAlerts.length > 0 && (
                        <div className="bg-red-50/50 rounded-2xl border border-red-100/50 p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <AlertTriangle size={14} className="text-red-500" /> Budget Overrun Alerts
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {data.overrunAlerts.map(alert => (
                                    <div key={alert.id} className="bg-white border border-red-100/50 rounded-xl p-3.5">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-xs font-medium text-gray-900">{alert.project}</h4>
                                            <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">{alert.overage}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-400">{alert.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── TRANSACTIONS + APPROVALS ─── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Transactions */}
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
                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                                            <th className="py-3 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.recentTransactions.map(tx => (
                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <StatusDot status={tx.status} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                                                                {tx.receipt && (
                                                                    <a href={tx.receipt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-md bg-violet-50 text-[10px] font-semibold text-violet-600 hover:bg-violet-100 transition-colors" title="View Proof of Expense">
                                                                        <Image size={11} strokeWidth={2.5} />
                                                                        <span>Proof</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-gray-300 mt-0.5">{tx.invoice}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-xs text-gray-500">{tx.project}</td>
                                                <td className="py-3 px-4">
                                                    <CategoryBadge category={tx.category} />
                                                </td>
                                                <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">{tx.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pending Approvals */}
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
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${req.type === 'vendor' ? 'bg-violet-50 text-violet-500' :
                                                    req.type === 'labor' ? 'bg-indigo-50 text-indigo-500' :
                                                    req.type === 'material' ? 'bg-sky-50 text-sky-500' :
                                                    req.type === 'equipment' ? 'bg-purple-50 text-purple-500' :
                                                        'bg-slate-50 text-slate-500'
                                                    }`}>
                                                    {req.type === 'vendor' ? <FileSpreadsheet size={15} /> :
                                                     req.type === 'labor' ? <HardHat size={15} /> :
                                                     req.type === 'material' ? <Package size={15} /> :
                                                     req.type === 'equipment' ? <Wrench size={15} /> :
                                                     <FileText size={15} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[13px] font-medium text-gray-900">{req.title}</p>
                                                        {req.originalData?.receipt && (
                                                            <a href={req.originalData.receipt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-md bg-violet-50 text-[10px] font-semibold text-violet-600 hover:bg-violet-100 transition-colors" title="View Proof of Expense">
                                                                <Image size={11} strokeWidth={2.5} />
                                                                <span>Proof</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-400">{req.from} • <span className="text-gray-600 font-medium">{req.amount}</span></p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleApproval(req.id, 'approve')} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title="Approve">
                                                    <Check size={14} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => handleEditExpense(req.id)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors" title="Edit">
                                                    <Edit2 size={14} strokeWidth={2.5} />
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

            {/* Add Expense Modal */}
            {isAddExpenseModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm lg:pl-64 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{editExpenseId ? 'Edit Expense' : 'Add New Expense'}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{editExpenseId ? 'Update transaction details' : 'Submit a transaction against a project budget'}</p>
                            </div>
                            <button onClick={() => setIsAddExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddExpenseSubmit} className="p-6">
                            {formError && (
                                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                    <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-sm font-medium text-red-700">{formError}</p>
                                </div>
                            )}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Project <span className="text-red-500">*</span></label>
                                    <select
                                        value={expenseForm.project}
                                        onChange={(e) => setExpenseForm(prev => ({ ...prev, project: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all bg-gray-50/50"
                                        required
                                    >
                                        <option value="" disabled>Select Project...</option>
                                        {projectsList.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={expenseForm.title}
                                            onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                                            placeholder="e.g. Cement Order"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Amount (₹) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            value={expenseForm.amount}
                                            onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                                            placeholder="50000"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Category <span className="text-red-500">*</span></label>
                                        <select
                                            value={expenseForm.category}
                                            onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all bg-gray-50/50"
                                        >
                                            <option value="Vendor">Vendor</option>
                                            <option value="Material">Material</option>
                                            <option value="Equipment">Equipment</option>
                                            <option value="Labor">Labor</option>
                                            <option value="Extension">Extension</option>
                                            <option value="Miscellaneous">Miscellaneous</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Invoice Number</label>
                                        <input
                                            type="text"
                                            value={expenseForm.invoiceNumber}
                                            onChange={(e) => setExpenseForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                                            placeholder="INV-XXXX (Optional)"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Expense Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            value={expenseForm.expenseDate}
                                            onChange={(e) => setExpenseForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all bg-gray-50/50"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Receipt / Bill Image</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleReceiptUpload}
                                                disabled={isUploadingReceipt}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                            />
                                            <div className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50/50 flex items-center justify-between transition-all group-hover:bg-gray-100 group-hover:border-violet-200 group-hover:text-violet-700">
                                                <span className={`truncate pr-4 ${expenseForm.receipt ? 'text-violet-600 font-medium' : 'text-gray-500 group-hover:text-violet-500'}`}>
                                                    {isUploadingReceipt ? 'Uploading...' : expenseForm.receipt ? 'Receipt Attached ✓' : 'Click to upload proof'}
                                                </span>
                                                {isUploadingReceipt ? <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" /> : <Image size={16} className={`${expenseForm.receipt ? 'text-violet-500' : 'text-gray-400 group-hover:text-violet-400'} shrink-0`} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsAddExpenseModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={expenseLoading}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-sm flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {expenseLoading ? <Loader2 size={16} className="animate-spin" /> : (editExpenseId ? 'Save Changes' : 'Submit Expense')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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

const KpiCard = ({ title, value, sub, extra, icon, color }) => {
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
            {extra && <p className="text-[11px] mt-1 text-gray-400">{extra}</p>}
        </div>
    );
};

const ProjectBar = ({ project }) => {
    const pct = Math.min(project.percentage, 100);
    const overrun = project.percentage > 100;

    // Color coding: violet <70%, amber 70-90%, red >90%
    let barColor = 'bg-violet-500';
    let barBg = 'bg-violet-50';
    let pctColor = 'text-violet-600';
    if (project.percentage >= 90 || overrun) {
        barColor = 'bg-red-500';
        barBg = 'bg-red-50';
        pctColor = 'text-red-600';
    } else if (project.percentage >= 70) {
        barColor = 'bg-amber-500';
        barBg = 'bg-amber-50';
        pctColor = 'text-amber-600';
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div>
                    <p className="text-[13px] font-medium text-gray-900">{project.name}</p>
                    <p className="text-[11px] text-gray-400">{project.spentFormatted} spent of {project.budgetFormatted}</p>
                </div>
                <span className={`text-xs font-semibold ${pctColor}`}>
                    {overrun ? `${project.percentage.toFixed(1)}%` : `${project.percentage}%`}
                </span>
            </div>
            <div className={`h-2 ${barBg} rounded-full overflow-hidden`}>
                <div
                    className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%` }}
                ></div>
            </div>
        </div>
    );
};

const StatusDot = ({ status }) => {
    const colors = {
        Approved: 'bg-emerald-500',
        Pending: 'bg-amber-400',
        Rejected: 'bg-red-400'
    };
    return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || 'bg-gray-300'}`} title={status}></div>;
};

const CategoryBadge = ({ category }) => {
    const styles = {
        Vendor: 'bg-violet-50 text-violet-600',
        Labor: 'bg-indigo-50 text-indigo-600',
        Material: 'bg-sky-50 text-sky-600',
        Equipment: 'bg-purple-50 text-purple-600',
        Extension: 'bg-fuchsia-50 text-fuchsia-600',
        Miscellaneous: 'bg-slate-50 text-slate-500'
    };
    return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${styles[category] || styles.Miscellaneous}`}>
            {category}
        </span>
    );
};

export default Budget;
