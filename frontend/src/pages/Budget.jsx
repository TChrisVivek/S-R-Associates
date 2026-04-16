import React, { useState, useEffect, useCallback } from 'react';
import CompanyLogo from '../components/CompanyLogo';
import {
    LayoutDashboard, FolderOpen, Users, FileText, Settings,
    Wallet, Building2, AlertTriangle, Hourglass, FileSpreadsheet,
    Check, X, ChevronRight, BarChart3, Plus, Loader2, Edit2,
    Package, Wrench, HardHat, Image, Trash2, Search,
    ChevronDown, CircleDot, Activity, ReceiptText,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GlobalLoader from '../components/GlobalLoader';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

/* ── Design tokens ─────────────────────────────────────────── */
const CAT_COLORS = {
    Vendor: '#7c3aed', Labor: '#6366f1', Material: '#0ea5e9',
    Equipment: '#a78bfa', Extension: '#e879f9', Miscellaneous: '#94a3b8',
};
const STATUS_CFG = {
    Approved: { pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dot: 'bg-emerald-500' },
    Pending:  { pill: 'bg-amber-50  text-amber-700  ring-1 ring-amber-200/60',     dot: 'bg-amber-400'  },
    Rejected: { pill: 'bg-red-50    text-red-700    ring-1 ring-red-200/60',       dot: 'bg-red-400'    },
};
const TABS = ['Overview', 'Projects', 'Expenses', 'Approvals'];

const inputCls =
    'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-900 bg-white ' +
    'outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 ' +
    'placeholder-gray-300 transition-all leading-none';

/* ═══════════════════════════════════════════════════════════
   BUDGET PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Budget() {
    const navigate = useNavigate();
    const { user: cu } = useAuth();

    const [data,          setData]          = useState(null);
    const [loading,       setLoading]       = useState(true);
    const [activeTab,     setActiveTab]     = useState('Overview');
    const [projectCache,  setProjectCache]  = useState({});   // shared with ProjectsTab

    /* modal */
    const [modalOpen,        setModalOpen]        = useState(false);
    const [editId,           setEditId]           = useState(null);
    const [projectsList,     setProjectsList]     = useState([]);
    const [form,             setForm]             = useState(blankForm());
    const [saving,           setSaving]           = useState(false);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [formError,        setFormError]        = useState('');
    const { showToast, ToastComponent } = useToast();

    function blankForm(pid = '') {
        return { title: '', amount: '', category: 'Vendor', project: pid,
                 invoiceNumber: '', receipt: '', expenseDate: isoToday() };
    }
    function isoToday() { return new Date().toISOString().split('T')[0]; }

    /* data */
    const fetchData = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/budget'); setData(r.data); }
        catch (err) { console.error(err); showToast('Failed to load budget data', 'error'); }
        finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    /* actions */
    const handleApproval = async (id, action) => {
        try {
            await api.put(`/expenses/${id}/status`, { status: action === 'approve' ? 'Approved' : 'Rejected' });
            showToast(action === 'approve' ? 'Expense approved!' : 'Expense rejected', 'success');
            fetchData();
        } catch { showToast('Action failed', 'error'); }
    };
    const handleDelete = async (id, projectId = null) => {
        if (!window.confirm('Permanently delete this expense?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            showToast('Expense deleted', 'success');
            // If deleted from a project accordion, bust that project's cache so it re-fetches
            if (projectId) {
                setProjectCache(prev => {
                    const updated = { ...prev };
                    delete updated[projectId.toString()];
                    return updated;
                });
            }
            fetchData();
        } catch { showToast('Failed to delete', 'error'); }
    };

    /* modal */
    const loadProjects = async () => {
        try { const r = await api.get('/projects'); setProjectsList(r.data); }
        catch { showToast('Could not load projects', 'error'); }
    };
    const openCreate = (pid = '') => {
        setEditId(null); setFormError(''); setForm(blankForm(pid));
        loadProjects(); setModalOpen(true);
    };
    const openEdit = (req) => {
        if (!req?.originalData) return;
        const d = req.originalData;
        setEditId(req.id); setFormError('');
        setForm({
            title: d.title || '', amount: d.amount || '', category: d.category || 'Vendor',
            project: d.project?._id || d.project || '',
            invoiceNumber: d.invoiceNumber || '', receipt: d.receipt || '',
            expenseDate: d.expenseDate ? new Date(d.expenseDate).toISOString().split('T')[0] : isoToday(),
        });
        loadProjects(); setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); setEditId(null); setFormError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setFormError('');
        if (!form.title || !form.amount || !form.category || !form.project)
            return setFormError('All starred fields are required.');
        try {
            setSaving(true);
            if (editId) { await api.put(`/expenses/${editId}`, form); showToast('Expense updated!', 'success'); }
            else         { await api.post('/expenses', form);          showToast('Expense submitted!', 'success'); }
            closeModal(); fetchData();
        } catch (err) { setFormError(err.response?.data?.message || 'Something went wrong.'); }
        finally { setSaving(false); }
    };
    const handleReceiptUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { setUploadingReceipt(true); const url = await uploadToCloudinary(file); setForm(p => ({ ...p, receipt: url })); showToast('Receipt uploaded!', 'success'); }
        catch { showToast('Upload failed', 'error'); }
        finally { setUploadingReceipt(false); }
    };

    if (loading || !data) return <GlobalLoader />;

    const pendingCount = data.pendingRequests?.length ?? 0;
    const isAdmin = cu?.role === 'Admin';
    const canAdd  = ['Admin', 'Site Manager'].includes(cu?.role);

    /* ── Render ── */
    return (
        <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif", backgroundColor: '#0f1117' }}>
            {ToastComponent}

            {/* ══ NAV SIDEBAR ══ */}
            <aside className="w-[220px] shrink-0 hidden md:flex flex-col border-r border-white/[0.06]">
                <div className="px-5 py-5 flex justify-center border-b border-white/[0.04]">
                    <CompanyLogo className="w-28 h-auto opacity-90" defaultLogoType="white" />
                </div>
                <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
                    <p className="px-3 mb-3 text-[9px] font-semibold tracking-[0.15em] text-white/20 uppercase">Navigation</p>
                    <NavLink icon={<LayoutDashboard size={15} />} label="Dashboard"  href="/" />
                    <NavLink icon={<FolderOpen size={15} />}      label="Projects"   href="/projects" />
                    {['Admin', 'Site Manager'].includes(cu?.role) && <NavLink icon={<Users size={15} />} label="Personnel" href="/personnel" />}
                    {isAdmin && <NavLink icon={<BarChart3 size={15} />} label="Budget" href="/budget" active />}
                    {['Admin', 'Site Manager', 'Client'].includes(cu?.role) && <NavLink icon={<FileText size={15} />} label="Reports" href="/reports" />}
                    {['Admin', 'Site Manager'].includes(cu?.role) && <>
                        <p className="px-3 pt-5 mb-3 text-[9px] font-semibold tracking-[0.15em] text-white/20 uppercase">System</p>
                        <NavLink icon={<Settings size={15} />} label="Settings" href="/settings" />
                    </>}
                </nav>
                <div className="px-3 pb-4 border-t border-white/[0.04] pt-3">
                    <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group">
                        {cu?.profile_image
                            ? <img src={cu.profile_image} referrerPolicy="no-referrer" className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/10 shrink-0" alt="" />
                            : <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-violet-500/10 text-violet-300 text-xs font-semibold flex items-center justify-center shrink-0">{cu?.username?.[0] || 'U'}</div>}
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-[12px] font-medium text-white/70 truncate">{cu?.username}</p>
                            <p className="text-[10px] text-white/25 mt-0.5">{cu?.role}</p>
                        </div>
                        <ChevronRight size={11} className="text-white/15 group-hover:text-white/40 shrink-0 transition-colors" />
                    </button>
                </div>
            </aside>

            {/* ══ MAIN ══ */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#f5f6f8' }}>

                {/* Page header */}
                <header className="shrink-0 h-[60px] px-8 flex items-center justify-between" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                    <div>
                        <h1 className="text-[16px] font-semibold text-gray-900 tracking-[-0.01em]">Budget Portfolio</h1>
                        <p className="text-[11.5px] text-gray-400 mt-0.5 tracking-[0.01em]">Financial overview & expense management</p>
                    </div>
                    {canAdd && (
                        <button onClick={() => openCreate()}
                            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shadow-violet-500/20">
                            <Plus size={14} strokeWidth={2.5} /> Add Expense
                        </button>
                    )}
                </header>

                {/* Tab bar */}
                <div className="shrink-0 px-8" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                    <div className="flex -mb-px">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`relative inline-flex items-center gap-2 px-1 mr-6 py-3.5 text-[13px] font-medium transition-colors border-b-2 ${
                                    activeTab === tab
                                        ? 'text-violet-700 border-violet-600'
                                        : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-200'
                                }`}>
                                {tab}
                                {tab === 'Approvals' && pendingCount > 0 && (
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-semibold leading-none">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'Overview'  && <OverviewTab  data={data} />}
                    {activeTab === 'Projects'  && <ProjectsTab  data={data} onAddExpense={openCreate} isAdmin={isAdmin} canAdd={canAdd} onDelete={handleDelete} cache={projectCache} setCache={setProjectCache} />}
                    {activeTab === 'Expenses'  && <ExpensesTab  data={data} isAdmin={isAdmin} onDelete={handleDelete} />}
                    {activeTab === 'Approvals' && <ApprovalsTab data={data} onApprove={handleApproval} onEdit={openEdit} />}
                </div>
            </div>

            {/* ══ MODAL ══ */}
            {modalOpen && (
                <div className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-[3px] flex items-center justify-center p-4"
                    onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className="bg-white rounded-2xl shadow-xl shadow-black/10 w-full max-w-[460px] overflow-hidden ring-1 ring-black/[0.04]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-[15px] font-semibold text-gray-900">{editId ? 'Edit Expense' : 'New Expense'}</h2>
                                <p className="text-[11.5px] text-gray-400 mt-0.5">{editId ? 'Update transaction details' : 'Log a transaction against a project'}</p>
                            </div>
                            <button onClick={closeModal} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <AlertTriangle size={13} className="text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-[12px] text-red-700 font-medium">{formError}</p>
                                </div>
                            )}
                            <FormField label="Project" required>
                                <select value={form.project} onChange={e => setForm(p => ({ ...p, project: e.target.value }))} className={inputCls} required>
                                    <option value="" disabled>Select project…</option>
                                    {projectsList.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                </select>
                            </FormField>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Title" required>
                                    <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="e.g. Cement delivery" required />
                                </FormField>
                                <FormField label="Amount (₹)" required>
                                    <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputCls} placeholder="50000" min="0" step="0.01" required />
                                </FormField>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Category" required>
                                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inputCls}>
                                        {Object.keys(CAT_COLORS).map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Invoice No.">
                                    <input type="text" value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} className={inputCls} placeholder="INV-0001 (optional)" />
                                </FormField>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Date" required>
                                    <input type="date" value={form.expenseDate} onChange={e => setForm(p => ({ ...p, expenseDate: e.target.value }))} className={inputCls} required />
                                </FormField>
                                <FormField label="Receipt">
                                    <div className="relative cursor-pointer group">
                                        <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} disabled={uploadingReceipt} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                                        <div className={`${inputCls} flex items-center justify-between`}>
                                            <span className={`text-[12.5px] truncate ${form.receipt ? 'text-violet-600 font-medium' : 'text-gray-400'}`}>
                                                {uploadingReceipt ? 'Uploading…' : form.receipt ? 'Attached ✓' : 'Upload file'}
                                            </span>
                                            {uploadingReceipt
                                                ? <Loader2 size={13} className="animate-spin text-gray-400 shrink-0" />
                                                : <Image size={13} className={`shrink-0 ${form.receipt ? 'text-violet-500' : 'text-gray-400'}`} />}
                                        </div>
                                    </div>
                                </FormField>
                            </div>
                            <div className="flex justify-end gap-2.5 pt-2 mt-2 border-t border-gray-100">
                                <button type="button" onClick={closeModal}
                                    className="px-4 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="px-5 py-2 text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-2 min-w-[110px] justify-center disabled:opacity-50 shadow-sm shadow-violet-500/20">
                                    {saving ? <Loader2 size={13} className="animate-spin" /> : editId ? 'Save Changes' : 'Submit Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════ */
function OverviewTab({ data }) {
    return (
        <div className="px-8 py-6 space-y-5 max-w-[1180px]">
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-4">
                <KpiCard icon={<Wallet size={16} />}        pal="violet" label="Total Allocated"  value={data.kpis.totalAllocated.value}  sub={data.kpis.totalAllocated.trend} />
                <KpiCard icon={<Building2 size={16} />}     pal="blue"   label="Actual Spent"      value={data.kpis.actualSpent.value}      sub={data.kpis.actualSpent.subtext} extra={data.kpis.actualSpent.dailyAvg !== '₹0' ? `${data.kpis.actualSpent.dailyAvg} avg / day` : null} />
                <KpiCard icon={<AlertTriangle size={16} />} pal="red"    label="Overruns"           value={data.kpis.budgetOverruns.value}   sub={data.kpis.budgetOverruns.subtext} />
                <KpiCard icon={<Hourglass size={16} />}     pal="amber"  label="Pending Approvals"  value={data.kpis.pendingApprovals.value} sub={data.kpis.pendingApprovals.subtext} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <CardHeader title="Project Budget Utilization" sub="Approved expense spend vs. allocated budget" />
                    <div className="p-5 space-y-4">
                        {data.projectUtilization.length === 0
                            ? <Placeholder icon={<FolderOpen size={20} />} text="No projects yet" />
                            : data.projectUtilization.map(p => <UtilBar key={p.id} project={p} />)}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <CardHeader title="Spend by Category" sub="Approved expenses breakdown" />
                    {data.categoryBreakdown.length === 0
                        ? <div className="flex-1 flex items-center justify-center"><Placeholder icon={<CircleDot size={20} />} text="No data yet" /></div>
                        : <div className="p-4 pb-5 flex flex-col gap-4">
                            <ResponsiveContainer width="100%" height={164}>
                                <PieChart>
                                    <Pie data={data.categoryBreakdown} cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                                        {data.categoryBreakdown.map((e, i) => <Cell key={i} fill={CAT_COLORS[e.name] || '#94a3b8'} />)}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: '1px solid #f1f5f9', fontSize: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', fontFamily: "'Outfit',sans-serif" }}
                                        formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-3 px-1">
                                {data.categoryBreakdown.map(c => (
                                    <div key={c.name} className="flex items-center gap-2 min-w-0">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[c.name] || '#94a3b8' }} />
                                        <span className="text-[11.5px] text-gray-500 truncate">{c.name}</span>
                                    </div>
                                ))}
                            </div>
                          </div>
                    }
                </div>
            </div>

            {/* Overruns */}
            {data.overrunAlerts.length > 0 && (
                <div className="bg-red-50/70 border border-red-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={13} className="text-red-600" />
                        </div>
                        <h3 className="text-[13px] font-semibold text-gray-800">Budget Overrun Alerts</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {data.overrunAlerts.map(a => (
                            <div key={a.id} className="bg-white border border-red-100 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <p className="text-[13px] font-semibold text-gray-900 leading-snug">{a.project}</p>
                                    <span className="text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-md shrink-0">{a.overage}</span>
                                </div>
                                <p className="text-[11.5px] text-gray-400 leading-relaxed">{a.reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   PROJECTS TAB
   ═══════════════════════════════════════════════════════════ */
function ProjectsTab({ data, onAddExpense, isAdmin, canAdd, onDelete, cache, setCache }) {
    const [expanded, setExpanded] = useState(null);
    const [loading,  setLoading]  = useState(null);
    const projects = data.projectSummaryList || [];

    const toggle = async (pid) => {
        const key = pid?.toString();
        if (expanded === key) { setExpanded(null); return; }
        setExpanded(key);
        if (cache[key]) return;   // already fetched — use cached
        try {
            setLoading(key);
            const res = await api.get(`/expenses?project=${pid}`);
            setCache(prev => ({ ...prev, [key]: res.data }));
        } catch { }
        finally { setLoading(null); }
    };

    return (
        <div className="px-8 py-6 max-w-[940px] space-y-2.5">
            <p className="text-[12px] text-gray-400 mb-3 font-medium">{projects.length} project{projects.length !== 1 ? 's' : ''} · Click a row to see its expenses</p>

            {projects.length === 0 && <Placeholder icon={<FolderOpen size={22} />} text="No projects found" />}

            {projects.map(p => {
                const key    = p.id?.toString();
                const isOpen = expanded === key;
                const exps   = cache[key] || [];
                const pct    = Math.min(p.percentage, 100);
                const barCls = p.percentage >= 90 ? 'bg-red-500' : p.percentage >= 70 ? 'bg-amber-400' : 'bg-violet-500';
                const pctCls = p.percentage >= 90 ? 'text-red-600' : p.percentage >= 70 ? 'text-amber-600' : 'text-violet-600';

                return (
                    <div key={p.id} className={`bg-white rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-violet-200' : 'border-gray-200 hover:border-gray-300'}`} style={{ boxShadow: isOpen ? '0 2px 8px rgba(109,40,217,0.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                        {/* Row */}
                        <button onClick={() => toggle(p.id)} className="w-full flex items-center gap-4 px-6 py-4 text-left">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-violet-100 text-violet-600' : 'bg-gray-50 text-gray-400'}`}>
                                <FolderOpen size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <p className="text-[14px] font-semibold text-gray-900 truncate tracking-[-0.01em]">{p.name}</p>
                                    <ProjStatusPill status={p.status} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${barCls} rounded-full`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className={`text-[11px] font-semibold shrink-0 tabular-nums ${pctCls}`}>{p.percentage}%</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[14px] font-semibold text-gray-900 tabular-nums tracking-[-0.01em]">{p.spentFormatted}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">of {p.budgetFormatted}</p>
                            </div>
                            <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Expanded */}
                        {isOpen && (
                            <div className="border-t border-gray-100">
                                <div className="flex items-center justify-between px-6 py-2.5 bg-gray-50/60">
                                    <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-[0.1em]">Expenses</p>
                                    {canAdd && (
                                        <button onClick={() => onAddExpense(p.id?.toString())}
                                            className="flex items-center gap-1.5 text-[11.5px] font-medium text-violet-600 bg-white hover:bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg transition-colors">
                                            <Plus size={11} strokeWidth={2.5} /> Add Expense
                                        </button>
                                    )}
                                </div>

                                {loading === key
                                    ? <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-violet-400" /></div>
                                    : exps.length === 0
                                        ? <div className="py-8"><Placeholder icon={<ReceiptText size={18} />} text="No expenses for this project" /></div>
                                        : <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-gray-100">
                                                        <th className={thCls + ' pl-6'}>Expense</th>
                                                        <th className={thCls}>Category</th>
                                                        <th className={thCls}>Date</th>
                                                        <th className={thCls}>Status</th>
                                                        <th className={thCls + ' pr-6 text-right'}>Amount</th>
                                                        {isAdmin && <th className="w-10" />}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {exps.map(ex => {
                                                        const sc  = STATUS_CFG[ex.status] || {};
                                                        const dt  = ex.expenseDate ? new Date(ex.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                                                        const amt = fmtAmt(ex.amount);
                                                        return (
                                                            <tr key={ex._id} className="hover:bg-gray-50/50 group transition-colors">
                                                                <td className="py-3 pl-6 pr-4">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot || 'bg-gray-300'}`} />
                                                                        <div>
                                                                            <p className="text-[13px] font-medium text-gray-900">{ex.title}</p>
                                                                            {ex.invoiceNumber && <p className="text-[10.5px] text-gray-400 mt-0.5">{ex.invoiceNumber}</p>}
                                                                        </div>
                                                                        {ex.receipt && <ProofLink href={ex.receipt} />}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4"><CatChip cat={ex.category} /></td>
                                                                <td className="py-3 px-4 text-[12px] text-gray-500 whitespace-nowrap tabular-nums">{dt}</td>
                                                                <td className="py-3 px-4"><StatusChip status={ex.status} /></td>
                                                                <td className="py-3 pl-4 pr-6 text-right text-[13.5px] font-semibold text-gray-900 tabular-nums">{amt}</td>
                                                                {isAdmin && <td className="py-3 pr-3">
                                                                    <button
                                                                        onClick={() => onDelete(ex._id, p.id)}
                                                                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all"
                                                                        title="Delete expense"
                                                                    ><Trash2 size={10} /></button>
                                                                </td>}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                          </div>
                                }
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   EXPENSES TAB
   ═══════════════════════════════════════════════════════════ */
function ExpensesTab({ data, isAdmin, onDelete }) {
    const [search,    setSearch]    = useState('');
    const [statusF,   setStatusF]   = useState('All');
    const [catF,      setCatF]      = useState('All');
    const [projF,     setProjF]     = useState('All');

    const txs      = data.recentTransactions || [];
    const projects = [...new Set(txs.map(t => t.project).filter(Boolean))];
    const cats     = Object.keys(CAT_COLORS);

    const filtered = txs.filter(tx => {
        const q = search.toLowerCase();
        return (!q || tx.description?.toLowerCase().includes(q) || tx.project?.toLowerCase().includes(q) || tx.invoice?.toLowerCase().includes(q))
            && (statusF === 'All' || tx.status   === statusF)
            && (catF    === 'All' || tx.category === catF)
            && (projF   === 'All' || tx.project  === projF);
    });

    const hasFilter = search || statusF !== 'All' || catF !== 'All' || projF !== 'All';

    return (
        <div className="px-8 py-6 max-w-[1180px] space-y-4">
            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by expense, project or invoice…"
                        className="w-full pl-8 pr-4 py-2 text-[12.5px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-gray-50 placeholder-gray-300 transition-all" />
                </div>
                <SelFilter label="Status"   value={statusF} onChange={setStatusF} opts={['All', 'Approved', 'Pending', 'Rejected']} />
                <SelFilter label="Category" value={catF}    onChange={setCatF}    opts={['All', ...cats]} />
                <SelFilter label="Project"  value={projF}   onChange={setProjF}   opts={['All', ...projects]} />
                {hasFilter && (
                    <button onClick={() => { setSearch(''); setStatusF('All'); setCatF('All'); setProjF('All'); }}
                        className="text-[12px] font-medium text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        Clear
                    </button>
                )}
                <span className="ml-auto text-[12px] text-gray-400 font-medium tabular-nums">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {filtered.length === 0
                    ? <Placeholder icon={<Activity size={22} />} text="No expenses match your filters" />
                    : <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/60">
                                    <th className={thCls + ' pl-6'}>Expense</th>
                                    <th className={thCls}>Project</th>
                                    <th className={thCls}>Category</th>
                                    <th className={thCls}>Status</th>
                                    <th className={thCls}>Date</th>
                                    <th className={thCls + ' pr-6 text-right'}>Amount</th>
                                    {isAdmin && <th className="w-10" />}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(tx => {
                                    const sc = STATUS_CFG[tx.status] || {};
                                    const dt = tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50/40 group transition-colors">
                                            <td className="py-3 pl-6 pr-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot || 'bg-gray-300'}`} />
                                                    <div>
                                                        <p className="text-[13px] font-medium text-gray-900">{tx.description}</p>
                                                        {tx.invoice !== 'No invoice' && <p className="text-[10.5px] text-gray-400 mt-0.5">{tx.invoice}</p>}
                                                        {tx.receipt && <ProofLink href={tx.receipt} />}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-[12.5px] text-gray-600 max-w-[130px] truncate">{tx.project}</td>
                                            <td className="py-3 px-4"><CatChip cat={tx.category} /></td>
                                            <td className="py-3 px-4"><StatusChip status={tx.status} /></td>
                                            <td className="py-3 px-4 text-[12px] text-gray-500 whitespace-nowrap tabular-nums">{dt}</td>
                                            <td className="py-3 pl-4 pr-6 text-right text-[13.5px] font-semibold text-gray-900 tabular-nums whitespace-nowrap">{tx.amount}</td>
                                            {isAdmin && <td className="py-3 pr-3">
                                                <button onClick={() => onDelete(tx.id)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all"><Trash2 size={10} /></button>
                                            </td>}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                      </div>
                }
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   APPROVALS TAB
   ═══════════════════════════════════════════════════════════ */
function ApprovalsTab({ data, onApprove, onEdit }) {
    const reqs = data.pendingRequests || [];

    const typeIcon = t => t === 'vendor'    ? <FileSpreadsheet size={14} /> :
                          t === 'labor'     ? <HardHat size={14} /> :
                          t === 'material'  ? <Package size={14} /> :
                          t === 'equipment' ? <Wrench size={14} /> :
                          <ReceiptText size={14} />;
    const typeBg   = t => t === 'vendor'    ? 'bg-violet-50 text-violet-600' :
                          t === 'labor'     ? 'bg-indigo-50 text-indigo-600' :
                          t === 'material'  ? 'bg-sky-50 text-sky-600' :
                          t === 'equipment' ? 'bg-purple-50 text-purple-600' :
                          'bg-slate-50 text-slate-600';

    return (
        <div className="px-8 py-6 max-w-[780px]">
            <div className="flex items-center gap-3 mb-5">
                <h2 className="text-[15px] font-semibold text-gray-900 tracking-[-0.01em]">Pending Approvals</h2>
                {reqs.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                        {reqs.length} waiting
                    </span>
                )}
            </div>

            {reqs.length === 0
                ? <div className="bg-white rounded-xl border border-gray-100 py-16 flex flex-col items-center gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <Check size={20} className="text-emerald-500" />
                    </div>
                    <p className="text-[14px] font-semibold text-gray-800">All caught up!</p>
                    <p className="text-[12.5px] text-gray-400">No expenses awaiting approval.</p>
                  </div>
                : <div className="space-y-2">
                    {reqs.map(req => (
                        <div key={req.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-all group" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBg(req.type)}`}>
                                {typeIcon(req.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[14px] font-semibold text-gray-900 tracking-[-0.01em]">{req.title}</p>
                                    {req.originalData?.receipt && <ProofLink href={req.originalData.receipt} />}
                                </div>
                                <p className="text-[12px] text-gray-400 mt-0.5">
                                    Submitted by <span className="font-medium text-gray-600">{req.from}</span>
                                    {' · '}<span className="text-gray-900 font-semibold tabular-nums">{req.amount}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <ActionBtn onClick={() => onApprove(req.id, 'approve')} color="emerald" icon={<Check size={13} strokeWidth={2.5} />} label="Approve" />
                                <ActionBtn onClick={() => onEdit(req)}                  color="blue"    icon={<Edit2 size={12} />}                   label="Edit" />
                                <ActionBtn onClick={() => onApprove(req.id, 'reject')} color="red"     icon={<X size={13} strokeWidth={2.5} />}       label="Reject" />
                            </div>
                        </div>
                    ))}
                  </div>
            }
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════ */
const NavLink = ({ icon, label, href, active }) => (
    <a href={href || '#'}
        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all group ${active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.05] hover:text-white/60'}`}>
        <span className={`shrink-0 transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="truncate">{label}</span>
        {active && <div className="ml-auto w-[3px] h-4 rounded-full bg-gradient-to-b from-violet-400 to-violet-600 shrink-0" />}
    </a>
);

const KpiCard = ({ icon, pal, label, value, sub, extra }) => {
    const map = {
        violet: { iconBg: 'bg-violet-50',  iconTxt: 'text-violet-500',  subTxt: 'text-violet-600', border: '#ede9fe' },
        blue:   { iconBg: 'bg-blue-50',    iconTxt: 'text-blue-500',    subTxt: 'text-blue-600',   border: '#dbeafe' },
        red:    { iconBg: 'bg-red-50',     iconTxt: 'text-red-500',     subTxt: 'text-red-600',    border: '#fee2e2' },
        amber:  { iconBg: 'bg-amber-50',   iconTxt: 'text-amber-500',   subTxt: 'text-amber-600',  border: '#fef3c7' },
    };
    const c = map[pal] || map.violet;
    return (
        <div className={`bg-white rounded-xl p-5`} style={{ border: `1px solid ${c.border}` }}>
            <div className="flex items-start justify-between mb-3.5">
                <p className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-[0.08em] leading-tight">{label}</p>
                <div className={`w-8 h-8 ${c.iconBg} rounded-lg flex items-center justify-center ${c.iconTxt} shrink-0`}>{icon}</div>
            </div>
            <p className="text-[22px] font-semibold text-gray-900 tracking-[-0.02em] leading-none tabular-nums">{value}</p>
            {sub   && <p className={`text-[11.5px] mt-2 font-medium ${c.subTxt}`}>{sub}</p>}
            {extra && <p className="text-[11px] mt-0.5 text-gray-400">{extra}</p>}
        </div>
    );
};

const CardHeader = ({ title, sub }) => (
    <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-[13px] font-semibold text-gray-900 tracking-[-0.01em]">{title}</h3>
        {sub && <p className="text-[11.5px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
);

const UtilBar = ({ project: p }) => {
    const pct = Math.min(p.percentage, 100);
    const bar = p.percentage >= 90 ? 'bg-red-500' : p.percentage >= 70 ? 'bg-amber-400' : 'bg-violet-500';
    const col = p.percentage >= 90 ? 'text-red-600' : p.percentage >= 70 ? 'text-amber-600' : 'text-violet-600';
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-[13px] font-medium text-gray-800 tracking-[-0.005em]">{p.name}</p>
                <div className="flex items-center gap-3">
                    <p className="text-[11px] text-gray-400 tabular-nums">{p.spentFormatted} of {p.budgetFormatted}</p>
                    <span className={`text-[11.5px] font-semibold tabular-nums ${col}`}>{p.percentage}%</span>
                </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%`, minWidth: pct > 0 ? undefined : '0px' }} />
            </div>
        </div>
    );
};

const SelFilter = ({ label, value, onChange, opts }) => (
    <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11.5px] text-gray-400 font-medium">{label}</span>
        <select value={value} onChange={e => onChange(e.target.value)}
            className="text-[12.5px] font-medium text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all cursor-pointer">
            {opts.map(o => <option key={o}>{o}</option>)}
        </select>
    </div>
);

const CatChip = ({ cat }) => {
    const m = { Vendor: 'bg-violet-50 text-violet-700', Labor: 'bg-indigo-50 text-indigo-700', Material: 'bg-sky-50 text-sky-700', Equipment: 'bg-purple-50 text-purple-700', Extension: 'bg-fuchsia-50 text-fuchsia-700', Miscellaneous: 'bg-slate-50 text-slate-600' };
    return <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${m[cat] || m.Miscellaneous}`}>{cat}</span>;
};

const StatusChip = ({ status }) => {
    const sc = STATUS_CFG[status] || {};
    return <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${sc.pill || 'bg-gray-50 text-gray-500 ring-1 ring-gray-200/60'}`}>{status}</span>;
};

const ProjStatusPill = ({ status }) => {
    const m = { 'In Progress': 'bg-blue-50 text-blue-700 ring-blue-200/60', Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', Delayed: 'bg-red-50 text-red-700 ring-red-200/60', Planning: 'bg-amber-50 text-amber-700 ring-amber-200/60', 'On Hold': 'bg-slate-50 text-slate-600 ring-slate-200/60' };
    return status ? <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ring-1 ${m[status] || 'bg-gray-50 text-gray-500 ring-gray-200/60'}`}>{status}</span> : null;
};

const ProofLink = ({ href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-1.5 py-0.5 rounded-md transition-colors">
        <Image size={9} /> Proof
    </a>
);

const ActionBtn = ({ onClick, color, icon, label }) => {
    const m = { emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-emerald-200/60', blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 ring-blue-200/60', red: 'bg-red-50 text-red-700 hover:bg-red-100 ring-red-200/60' };
    return (
        <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium ring-1 transition-colors ${m[color]}`}>
            {icon} {label}
        </button>
    );
};

const FormField = ({ label, required, children }) => (
    <div>
        <label className="block text-[10.5px] font-semibold text-gray-500 uppercase tracking-[0.08em] mb-1.5">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const Placeholder = ({ icon, text }) => (
    <div className="flex flex-col items-center gap-2 py-12 text-gray-300">
        <div className="text-gray-200">{icon}</div>
        <p className="text-[13px] text-gray-400">{text}</p>
    </div>
);

const thCls = 'py-2.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] text-left';

function fmtAmt(amount) {
    const v = Number(amount);
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000)   return `₹${(v / 100000).toFixed(2)} L`;
    return `₹${v.toLocaleString('en-IN')}`;
}
