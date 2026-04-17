import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import CompanyLogo from '../components/CompanyLogo';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    Download, Calendar, Box, Wallet, UploadCloud, File as FilePdf,
    Trash2, Eye, Loader2, X, AlertCircle, FileSpreadsheet, FileDown,
    ClipboardList, TrendingUp, UserCheck, Package, ArrowRight,
    History, Archive, Zap, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useToast } from '../components/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import GlobalLoader from '../components/GlobalLoader';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
    {
        id: 'daily',
        label: 'Daily Progress',
        icon: ClipboardList,
        desc: 'Detailed logs of site activities, weather impact, and workforce distribution.',
        color: '#2563EB',
        bg: '#EFF6FF',
    },
    {
        id: 'inventory',
        label: 'Inventory Report',
        icon: Package,
        desc: 'Material tracking, consumption rates, and remaining stock for all sites.',
        color: '#16a34a',
        bg: '#F0FDF4',
    },
    {
        id: 'financial',
        label: 'Financial Summary',
        icon: TrendingUp,
        desc: 'Budget utilization, overhead costs, and projected expenditure analysis.',
        color: '#d97706',
        bg: '#FFFBEB',
    },
    {
        id: 'personnel',
        label: 'Personnel',
        icon: UserCheck,
        desc: 'Safety logs, attendance records, and subcontractor performance metrics.',
        color: '#7c3aed',
        bg: '#F5F3FF',
    },
];

const EXPORT_FORMATS = [
    { id: 'pdf',   label: 'Adobe PDF',        sublabel: 'Standard distribution',  icon: FilePdf,        color: '#dc2626' },
    { id: 'excel', label: 'Microsoft Excel',   sublabel: 'Data analysis ready',    icon: FileSpreadsheet, color: '#16a34a' },
    { id: 'csv',   label: 'CSV Format',        sublabel: 'Raw data dump',          icon: FileDown,        color: '#2563EB' },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────

const filterByDate = (items, dateKey, from, to) => {
    if (!from && !to) return items;
    return items.filter(item => {
        const d = new Date(item[dateKey]).toISOString().slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    });
};

// Column letter helper for ExcelJS merge ranges
const numToCol = (n) => {
    let s = '';
    while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
    return s;
};

const downloadBlob = (content, filename, mime) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const Reports = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { showToast, ToastComponent } = useToast();

    // ── Loading & data ────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [companyName, setCompanyName] = useState('S R Associates');

    // ── Report history (persisted) ────────────────────────────────────────────
    const [systemReports, setSystemReports] = useState(() => {
        const saved = localStorage.getItem('S R Associates_reports_history');
        try { return saved ? JSON.parse(saved) : []; } catch { return []; }
    });

    // ── Main tabs ─────────────────────────────────────────────────────────────
    const [mainTab, setMainTab] = useState('generate'); // 'generate' | 'vault' | 'history'

    // ── Form state ────────────────────────────────────────────────────────────
    const [reportType, setReportType]       = useState('daily');
    const [exportFormat, setExportFormat]   = useState('pdf');
    const [formProject, setFormProject]     = useState('');     // '' = all projects
    const [formDateFrom, setFormDateFrom]   = useState('');
    const [formDateTo, setFormDateTo]       = useState('');
    const [isGenerating, setIsGenerating]   = useState(false);

    // ── Vault state ───────────────────────────────────────────────────────────
    const [documentToDelete, setDocumentToDelete]   = useState(null);
    const [showUploadModal, setShowUploadModal]      = useState(false);
    const [uploadFile, setUploadFile]               = useState(null);
    const [uploadProject, setUploadProject]         = useState('');
    const [uploading, setUploading]                 = useState(false);

    // ── History state ─────────────────────────────────────────────────────────
    const [reportToDelete, setReportToDelete]               = useState(null);
    const [reportDeleteConfirmText, setReportDeleteConfirmText] = useState('');

    // ── Derived ───────────────────────────────────────────────────────────────
    const selectedProject  = formProject ? projects.find(p => p._id === formProject) : null;
    const siteManager      = selectedProject?.manager || (formProject ? '—' : 'All Managers');
    const getDateParams    = () => {
        const from  = formDateFrom ? new Date(formDateFrom) : new Date();
        const to    = formDateTo   ? new Date(formDateTo)   : from;
        return {
            month:    from.getMonth() + 1,
            endMonth: to.getMonth() + 1,
            year:     from.getFullYear(),
        };
    };

    // ─── PERSISTENCE ──────────────────────────────────────────────────────────
    useEffect(() => {
        try { localStorage.setItem('S R Associates_reports_history', JSON.stringify(systemReports.slice(0, 10))); }
        catch (e) { console.error('Storage quota exceeded'); }
    }, [systemReports]);

    useEffect(() => {
        const update = () => {
            const n = localStorage.getItem('companyShortName');
            setCompanyName(n || 'S R Associates');
        };
        update();
        window.addEventListener('companyNameUpdated', update);
        return () => window.removeEventListener('companyNameUpdated', update);
    }, []);

    // ─── DATA FETCH ───────────────────────────────────────────────────────────
    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/projects');
            const pd  = res.data || [];
            setProjects(pd);
            const docs = [];
            pd.forEach(project => {
                (project.blueprints || []).forEach(bp => {
                    const rawUrl = bp.url && bp.url.includes('/image/upload/')
                        ? bp.url.replace('/image/upload/', '/raw/upload/').replace(/-\d+\.jpg$/, '').replace(/\.jpg$/, '')
                        : bp.url;
                    docs.push({
                        id: bp._id || Math.random().toString(),
                        projectId: project._id,
                        name: bp.name || 'Unknown Document',
                        url: bp.url,
                        originalUrl: bp.originalUrl || rawUrl,
                        project: project.title || 'Unknown Project',
                        uploadedBy: project.manager || 'System',
                        date: bp.uploadedAt
                            ? new Date(bp.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : 'Unknown Date',
                        type: 'Blueprint',
                    });
                });
            });
            setUploadedDocs(docs);
        } catch (e) { console.error('Failed to fetch data', e); }
        finally { setIsLoading(false); }
    };

    // ─── PDF HELPERS ──────────────────────────────────────────────────────────

    const addPdfHeader = (doc, title) => {
        const company = localStorage.getItem('companyShortName') || 'S R Associates';
        doc.setFillColor(26, 29, 46);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFillColor(109, 40, 217);
        doc.rect(0, 40, 210, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22); doc.setFont('helvetica', 'bold');
        doc.text(company, 14, 18);
        doc.setFontSize(9); doc.setFont('helvetica', 'italic');
        doc.setTextColor(200, 200, 215);
        doc.text('Engineers & Contractors', 14, 25);
        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), 14, 35);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 200, 215);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 196, 35, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        return 55;
    };

    const addPdfFooter = (doc) => {
        const pageCount = doc.internal.getNumberOfPages();
        const company   = localStorage.getItem('companyShortName') || 'S R Associates';
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.5);
            doc.line(14, 285, 196, 285);
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 150, 150);
            doc.text(`© ${new Date().getFullYear()} ${company}. All rights reserved.`, 14, 290);
            doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
        }
        doc.setTextColor(0, 0, 0);
    };

    const addReportToHistory = (doc, name, project = '') => {
        const newReport = {
            id: Date.now().toString(),
            name,
            project,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            status: 'Ready',
            size: `${Math.round(doc.output('arraybuffer').byteLength / 1024)} KB`,
            dataUri: doc.output('datauristring'),
        };
        setSystemReports(prev => [newReport, ...prev]);
    };

    // ─── PDF GENERATORS ───────────────────────────────────────────────────────

    const generateDailyPDF = async ({ projectId, dateFrom, dateTo }) => {
        const doc = new jsPDF();
        const projList = projectId ? projects.filter(p => p._id === projectId) : projects.filter(p => !['Completed', 'On Hold'].includes(p.status));
        let isFirstPage = true;

        for (const p of projList) {
            const res  = await api.get(`/projects/${p._id}/daily-logs`);
            const logs = res.data?.logs || [];
            const filtered = filterByDate(logs, 'date', dateFrom, dateTo).sort((a, b) => new Date(b.date) - new Date(a.date));

            if (!isFirstPage) doc.addPage();
            isFirstPage = false;

            let y = addPdfHeader(doc, `Daily Logs — ${p.title}`);
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
            doc.text(`Total recorded logs: ${filtered.length}`, 196, y, { align: 'right' });
            doc.setTextColor(26, 29, 46); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('Project Daily Logs', 14, y);
            y += 8;

            if (filtered.length === 0) {
                doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
                doc.text('No daily logs for the selected period.', 14, y);
            } else {
                const tableData = filtered.map(log => [
                    new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    log.day || '-',
                    log.weather?.condition || '-',
                    log.laborers || 0,
                    log.notes || '-'
                ]);
                autoTable(doc, {
                    startY: y,
                    head: [['Date', 'Day', 'Weather', 'Laborers', 'Notes / Activities']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [26, 29, 46], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
                    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
                    alternateRowStyles: { fillColor: [250, 250, 252] },
                    margin: { left: 14, right: 14 },
                    styles: { cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.1, overflow: 'linebreak' },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 26, halign: 'center' },
                        1: { cellWidth: 24, halign: 'center' },
                        2: { cellWidth: 24, halign: 'center' },
                        3: { cellWidth: 22, halign: 'center' },
                        4: { cellWidth: 'auto' }
                    }
                });
            }
            addPdfFooter(doc);
        }

        const label = projectId ? (selectedProject?.title || 'Project') : 'All_Projects';
        doc.save(`Daily_Logs_${label.replace(/\s+/g, '_')}.pdf`);
        addReportToHistory(doc, `Daily Logs — ${label}`, label);
    };

    const generateInventoryPDF = async ({ projectId, dateFrom, dateTo }) => {
        const doc      = new jsPDF();
        const projList = projectId ? projects.filter(p => p._id === projectId) : projects;
        let isFirstPage = true;

        for (const p of projList) {
            const res       = await api.get(`/projects/${p._id}/inventory`);
            const materials = res.data?.materials || res.data || [];
            if (!isFirstPage) doc.addPage();
            isFirstPage = false;

            let y = addPdfHeader(doc, `Inventory Report — ${p.title}`);
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Material Summary', 14, y);
            y += 6;

            const summaryData = materials.map(m => [m.name || 'N/A', m.unit || '', String(m.inflow || 0), String(m.outflow || 0), String(m.balance || 0), m.status || 'N/A']);
            autoTable(doc, {
                startY: y,
                head: [['Material', 'Unit', 'Inflow', 'Outflow', 'Balance', 'Status']],
                body: summaryData,
                theme: 'grid',
                headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
                alternateRowStyles: { fillColor: [250, 250, 252] },
                margin: { left: 14, right: 14 },
                styles: { cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0.1 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 5) {
                        const v = (data.cell.raw || '').toString().toUpperCase();
                        if (v.includes('OUT')) data.cell.styles.textColor = [220, 38, 38];
                        else if (v.includes('LOW')) data.cell.styles.textColor = [234, 138, 0];
                        else if (v.includes('OPTIMAL')) data.cell.styles.textColor = [22, 163, 74];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
            y = doc.lastAutoTable.finalY + 10;

            // Transaction log
            const logRows = [];
            materials.forEach(m => {
                filterByDate(m.logs || [], 'date', dateFrom, dateTo).forEach(log => {
                    logRows.push([
                        new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
                        m.name || 'N/A',
                        log.type === 'delivery' ? 'Delivery' : 'Usage',
                        `${log.quantity || 0} ${m.unit || ''}`,
                        log.type === 'delivery' ? (log.supplier || 'N/A') : (log.locationPurpose || 'N/A'),
                        log.totalCost ? `Rs.${Number(log.totalCost).toLocaleString('en-IN')}` : '-'
                    ]);
                });
            });

            if (logRows.length > 0) {
                if (y > 240) { doc.addPage(); y = 20; }
                doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Transaction Log', 14, y);
                y += 6;
                autoTable(doc, {
                    startY: y,
                    head: [['Date', 'Material', 'Type', 'Qty', 'Supplier/Purpose', 'Cost']],
                    body: logRows,
                    theme: 'grid',
                    headStyles: { fillColor: [26, 29, 46], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
                    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
                    alternateRowStyles: { fillColor: [250, 250, 252] },
                    margin: { left: 14, right: 14 },
                    styles: { cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.1 },
                });
            }
            addPdfFooter(doc);
        }

        const label = projectId ? (selectedProject?.title || 'Project') : 'All_Projects';
        doc.save(`Inventory_${label.replace(/\s+/g, '_')}.pdf`);
        addReportToHistory(doc, `Inventory — ${label}`, label);
    };

    const generateFinancialPDF = async ({ projectId }) => {
        const doc      = new jsPDF();
        const projList = projectId ? projects.filter(p => p._id === projectId) : projects;
        let isFirstPage = true;

        for (const p of projList) {
            if (!isFirstPage) doc.addPage();
            isFirstPage = false;
            let y = addPdfHeader(doc, `Financial Summary — ${p.title}`);

            const budget     = Number(p.budget) || 0;
            const unit       = p.budgetUnit || 'Lakhs';
            const budgetStr  = budget > 0 ? `Rs.${budget.toLocaleString('en-IN')} ${unit}` : 'N/A';
            const startDate  = p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const endDate    = p.endDate   ? new Date(p.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

            autoTable(doc, {
                startY: y,
                body: [
                    ['Project', p.title || 'N/A'], ['Type', p.type || 'N/A'], ['Status', p.status || 'N/A'],
                    ['Client', p.client || 'N/A'], ['Manager', p.manager || 'N/A'],
                    ['Site', p.address || 'N/A'], ['Budget', budgetStr],
                    ['Start Date', startDate], ['Target End', endDate],
                ],
                theme: 'plain',
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 50, textColor: [100, 100, 100], fontSize: 9 },
                    1: { fontSize: 9, textColor: [40, 40, 40] }
                },
                margin: { left: 14, right: 14 },
                styles: { cellPadding: 3 },
                didParseCell: (data) => {
                    if (data.row.index === 6 && data.column.index === 1) {
                        data.cell.styles.textColor = [22, 163, 74];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
            y = doc.lastAutoTable.finalY + 10;

            // ── Expenses (sorted by date desc) ───────────────────────────────
            try {
                const expRes   = await api.get('/expenses', { params: { project: p._id } });
                const expenses = (expRes.data || []).sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));
                if (expenses.length > 0) {
                    if (y > 220) { doc.addPage(); y = 20; }
                    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 29, 46);
                    doc.text('Project Expenses', 14, y); y += 6;
                    const CATEGORY_COLORS = {
                        Vendor: [37, 99, 235], Labor: [22, 163, 74], Equipment: [217, 119, 6],
                        Material: [109, 40, 217], Miscellaneous: [107, 114, 128], Extension: [220, 38, 38]
                    };
                    let totalApproved = 0;
                    const expData = expenses.map(e => {
                        if (e.status === 'Approved') totalApproved += Number(e.amount);
                        return [
                            e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—',
                            e.title || '—', e.category || '—',
                            `Rs.${Number(e.amount).toLocaleString('en-IN')}`,
                            e.invoiceNumber || '—', e.status || '—'
                        ];
                    });
                    autoTable(doc, {
                        startY: y,
                        head: [['Date', 'Title', 'Category', 'Amount', 'Invoice #', 'Status']],
                        body: expData,
                        theme: 'grid',
                        headStyles: { fillColor: [26, 29, 46], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
                        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
                        alternateRowStyles: { fillColor: [250, 250, 252] },
                        margin: { left: 14, right: 14 },
                        styles: { cellPadding: 3.5, lineColor: [230, 230, 230], lineWidth: 0.1 },
                        columnStyles: {
                            0: { cellWidth: 24, halign: 'center' },
                            2: { cellWidth: 28, halign: 'center' },
                            3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
                            4: { cellWidth: 28, halign: 'center' },
                            5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
                        },
                        didParseCell: (data) => {
                            if (data.section === 'body' && data.column.index === 2) {
                                const clr = CATEGORY_COLORS[data.cell.raw] || [107, 114, 128];
                                data.cell.styles.textColor = clr;
                            }
                            if (data.section === 'body' && data.column.index === 5) {
                                const s = data.cell.raw;
                                data.cell.styles.textColor = s === 'Approved' ? [22, 163, 74] : s === 'Rejected' ? [220, 38, 38] : [217, 119, 6];
                            }
                        }
                    });
                    y = doc.lastAutoTable.finalY + 6;
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(26, 29, 46);
                    doc.text(`Total: ${expenses.length} expense(s)`, 14, y);
                    doc.text(`Approved Total: Rs.${totalApproved.toLocaleString('en-IN')}`, 196, y, { align: 'right' });
                    y += 10;
                }
            } catch (e) { /* skip */ }

            // ── Material costs ───────────────────────────────────────────────
            try {
                const invRes    = await api.get(`/projects/${p._id}/inventory`);
                const materials = invRes.data?.materials || invRes.data || [];
                if (materials.length > 0) {
                    if (y > 240) { doc.addPage(); y = 20; }
                    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Material Cost Breakdown', 14, y);
                    y += 6;
                    let totalCost = 0;
                    const costData = materials.map(m => {
                        let c = 0;
                        (m.logs || []).forEach(l => { if (l.type === 'delivery' && l.totalCost) c += Number(l.totalCost); });
                        totalCost += c;
                        return [m.name || 'N/A', m.unit || '', String(m.inflow || 0), String(m.outflow || 0), String(m.balance || 0), c > 0 ? `Rs.${c.toLocaleString('en-IN')}` : '-'];
                    });
                    autoTable(doc, {
                        startY: y,
                        head: [['Material', 'Unit', 'Inflow', 'Outflow', 'Balance', 'Cost']],
                        body: costData,
                        theme: 'grid',
                        headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
                        bodyStyles: { fontSize: 8 },
                        alternateRowStyles: { fillColor: [250, 250, 252] },
                        margin: { left: 14, right: 14 },
                        styles: { cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0.1 },
                    });
                    y = doc.lastAutoTable.finalY + 8;
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
                    doc.text(`Total Material Cost: Rs.${totalCost.toLocaleString('en-IN')}`, 196, y, { align: 'right' });
                }
            } catch (e) { /* skip */ }
            addPdfFooter(doc);
        }

        const label = projectId ? (selectedProject?.title || 'Project') : 'All_Projects';
        doc.save(`Financial_${label.replace(/\s+/g, '_')}.pdf`);
        addReportToHistory(doc, `Financial — ${label}`, label);
    };

    const generateAttendancePDF = async ({ projectId, month, endMonth, year }) => {
        const doc      = new jsPDF();
        const projList = projectId ? projects.filter(p => p._id === projectId) : projects.filter(p => !['Completed', 'On Hold'].includes(p.status));
        const monthNames = [];
        let isFirstPage = true;

        for (let m = month; m <= endMonth; m++) {
            const mName = new Date(year, m - 1).toLocaleString('en-US', { month: 'long' });
            monthNames.push(mName);

            for (const p of projList) {
                const res  = await api.get('/personnel/attendance-report', { params: { projectId: p._id, month: m, year } });
                const data = res.data || [];

                if (!isFirstPage) doc.addPage();
                isFirstPage = false;

                let y = addPdfHeader(doc, projectId ? `Attendance Report: ${mName} ${year}` : `Global Attendance: ${mName} ${year}`);
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 29, 46);
                doc.text(`Project: ${p.title}`, 14, y);
                y += 8;

                if (data.length === 0) {
                    doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(150, 150, 150);
                    doc.text('No attendance data found for this period.', 14, y);
                } else {
                    const tableData = data.map(person => [
                        person.name, person.role || 'Personnel',
                        String(person['On Site'] || 0), String(person['Remote'] || 0),
                        String(person['On Leave'] || 0), String(person['Off Duty'] || 0),
                        String(person.totalDays || 0)
                    ]);
                    autoTable(doc, {
                        startY: y,
                        head: [['Name', 'Role', 'On Site Days', 'Remote Days', 'Leave Days', 'Off Duty', 'Total']],
                        body: tableData,
                        theme: 'grid',
                        headStyles: { fillColor: [109, 40, 217], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
                        bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
                        alternateRowStyles: { fillColor: [250, 250, 252] },
                        margin: { left: 14, right: 14 },
                        styles: { cellPadding: 4, lineColor: [230, 230, 230], lineWidth: 0.1 },
                        columnStyles: {
                            0: { fontStyle: 'bold', textColor: [26, 29, 46] },
                            2: { halign: 'center', fontStyle: 'bold', textColor: [22, 163, 74] },
                            3: { halign: 'center' }, 4: { halign: 'center', textColor: [234, 138, 0] },
                            5: { halign: 'center' }, 6: { halign: 'center', fontStyle: 'bold' }
                        }
                    });
                }
                addPdfFooter(doc);
            }
        }

        const periodStr = month === endMonth ? `${monthNames[0]} ${year}` : `${monthNames[0]}-${monthNames[monthNames.length - 1]} ${year}`;
        const label     = projectId ? (selectedProject?.title || 'Project') : 'All_Projects';
        doc.save(`Attendance_${label.replace(/\s+/g, '_')}_${periodStr.replace(/\s+/g, '_')}.pdf`);
        addReportToHistory(doc, `Attendance: ${periodStr} — ${label}`, label);
    };

    // ─── EXCEL GENERATOR (ExcelJS — fully styled) ──────────────────────────────

    const generateExcelReport = async ({ projectId, dateFrom, dateTo, month, endMonth, year }) => {
        const projList = projectId ? projects.filter(p => p._id === projectId) : projects;
        const label    = projectId ? (selectedProject?.title || 'Project') : 'All Projects';
        const co       = companyName || 'S R Associates';
        const genDate  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

        // ── ExcelJS helpers ──────────────────────────────────────────────────
        const DARK        = '1A1D2E';
        const VIOLET      = '6D28D9';
        const VIOLET_LITE = 'EDE9FE';
        const WHITE       = 'FFFFFF';
        const GRAY_ROW    = 'F9FAFB';
        const TEXT_DARK   = '111827';
        const TEXT_GRAY   = '6B7280';
        const BORDER_CLR  = 'E5E7EB';

        const wb = new ExcelJS.Workbook();
        wb.creator = co;
        wb.created = new Date();

        /**
         * Add a styled worksheet with branding header + column headers + data rows.
         */
        const addSheet = (name, reportTitle, subtitle, headers, rows) => {
            const ws      = wb.addWorksheet(name);
            const nCols   = headers.length;
            const lastCol = numToCol(nCols);

            // ── Row 1: Company banner ────────────────────────────────────────
            ws.mergeCells(`A1:${lastCol}1`);
            const bannerCell = ws.getCell('A1');
            Object.assign(bannerCell, {
                value: `${co}  —  Engineers & Contractors`,
                font:  { bold: true, size: 11, color: { argb: WHITE } },
                fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } },
                alignment: { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: false },
            });
            bannerCell.border = { outline: true, top: { style: 'medium', color: { argb: DARK } }, bottom: { style: 'thin', color: { argb: VIOLET } }, left: { style: 'medium', color: { argb: DARK } }, right: { style: 'medium', color: { argb: DARK } } };
            ws.getRow(1).height = 28;

            // ── Row 2: Report title ──────────────────────────────────────────
            ws.mergeCells(`A2:${lastCol}2`);
            const titleCell = ws.getCell('A2');
            Object.assign(titleCell, {
                value: reportTitle,
                font:  { bold: true, size: 13, color: { argb: DARK } },
                fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: VIOLET_LITE } },
                alignment: { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: false },
            });
            titleCell.border = { left: { style: 'medium', color: { argb: DARK } }, right: { style: 'medium', color: { argb: DARK } } };
            ws.getRow(2).height = 26;

            // ── Row 3: Subtitle / generated date ────────────────────────────
            ws.mergeCells(`A3:${lastCol}3`);
            const subCell = ws.getCell('A3');
            Object.assign(subCell, {
                value: subtitle || `Generated on ${genDate}`,
                font:  { size: 9, italic: true, color: { argb: TEXT_GRAY } },
                fill:  { type: 'pattern', pattern: 'solid', fgColor: { argb: VIOLET_LITE } },
                alignment: { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: false },
            });
            subCell.border = { left: { style: 'medium', color: { argb: DARK } }, right: { style: 'medium', color: { argb: DARK } }, bottom: { style: 'thin', color: { argb: 'CCCCCC' } } };
            ws.getRow(3).height = 18;

            // ── Row 4: Column headers ────────────────────────────────────────
            const hdrBorder = { style: 'thin', color: { argb: '5B21B6' } };
            headers.forEach((h, i) => {
                const cell = ws.getCell(4, i + 1);
                cell.value = h;
                cell.font  = { bold: true, size: 10, color: { argb: WHITE } };
                cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: VIOLET } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
                cell.border = { top: hdrBorder, bottom: hdrBorder, left: hdrBorder, right: hdrBorder };
            });
            ws.getRow(4).height = 22;

            // ── Rows 5+: Data ────────────────────────────────────────────────
            const dataBorder = { style: 'hair', color: { argb: BORDER_CLR } };
            const cellBorder = { top: dataBorder, bottom: dataBorder, left: dataBorder, right: dataBorder };

            rows.forEach((row, idx) => {
                const isEven  = idx % 2 === 0;
                const wsRow   = ws.getRow(5 + idx);
                const isSectionHeader = row.length === 1 || (row[1] === '' && row[2] === ''); // project separator rows

                row.forEach((val, c) => {
                    const cell = wsRow.getCell(c + 1);
                    cell.value  = val;
                    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: isSectionHeader ? VIOLET_LITE : (isEven ? GRAY_ROW : WHITE) } };
                    cell.font   = { size: 9, bold: (c === 0 || isSectionHeader), color: { argb: isSectionHeader ? VIOLET : TEXT_DARK } };
                    cell.border = cellBorder;
                    // All cells: vertically centered, no wrapping
                    cell.alignment = {
                        horizontal: typeof val === 'number' ? 'center' : 'center',
                        vertical: 'middle',
                        wrapText: false,
                        indent: c === 0 && !isSectionHeader ? 1 : 0,
                    };
                    // Numbers get accounting-style right alignment
                    if (typeof val === 'number') cell.alignment.horizontal = 'right';
                });
                wsRow.height = isSectionHeader ? 18 : 18;
                // Merge section header across all columns for clean divider look
                if (isSectionHeader && nCols > 1) {
                    try { ws.mergeCells(5 + idx, 1, 5 + idx, nCols); } catch {}
                }
            });

            // ── Auto column widths ───────────────────────────────────────────
            headers.forEach((h, i) => {
                const colVals = rows.map(r => (r[i] ?? '').toString().length);
                const maxLen  = Math.max(h.toString().length, ...colVals);
                ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 4, 12), 55);
            });

            // ── Freeze top 4 rows ────────────────────────────────────────────
            ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 0, topLeftCell: 'A5' }];

            // ── Auto-filter on header row ────────────────────────────────────
            ws.autoFilter = { from: `A4`, to: `${lastCol}4` };

            return ws;
        };

        // ── Build content per report type ────────────────────────────────────
        if (reportType === 'daily') {
            for (const p of projList) {
                const res  = await api.get(`/projects/${p._id}/daily-logs`);
                const logs = filterByDate(res.data?.logs || [], 'date', dateFrom, dateTo)
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                const rows = logs.map(l => [
                    new Date(l.date).toLocaleDateString('en-IN'),
                    l.day || '-', l.weather?.condition || '-',
                    l.laborers || 0, l.notes || '-'
                ]);
                addSheet(
                    p.title.slice(0, 31),
                    `Daily Progress Report — ${p.title}`,
                    `Period: ${dateFrom || 'All dates'} to ${dateTo || 'present'}  |  Generated: ${genDate}`,
                    ['Date', 'Day', 'Weather', 'Laborers', 'Notes / Activities'],
                    rows
                );
            }
        } else if (reportType === 'inventory') {
            for (const p of projList) {
                const res       = await api.get(`/projects/${p._id}/inventory`);
                const materials = res.data?.materials || res.data || [];
                addSheet(
                    (p.title.slice(0, 25) + ' — Summary').slice(0, 31),
                    `Inventory Report — ${p.title}`,
                    `Generated: ${genDate}  |  Project: ${p.title}`,
                    ['Material', 'Unit', 'Inflow', 'Outflow', 'Balance', 'Status'],
                    materials.map(m => [m.name, m.unit, m.inflow || 0, m.outflow || 0, m.balance || 0, m.status || '-'])
                );
                const txRows = [];
                materials.forEach(m => filterByDate(m.logs || [], 'date', dateFrom, dateTo).forEach(log => {
                    txRows.push([
                        new Date(log.date).toLocaleDateString('en-IN'), m.name,
                        log.type === 'delivery' ? 'Delivery' : 'Usage',
                        log.quantity || 0, m.unit,
                        log.type === 'delivery' ? (log.supplier || '') : (log.locationPurpose || ''),
                        log.totalCost ? Number(log.totalCost) : 0
                    ]);
                }));
                if (txRows.length > 0) {
                    addSheet(
                        (p.title.slice(0, 22) + ' — Logs').slice(0, 31),
                        `Inventory Transactions — ${p.title}`,
                        `Period: ${dateFrom || 'All dates'} to ${dateTo || 'present'}`,
                        ['Date', 'Material', 'Type', 'Qty', 'Unit', 'Supplier/Purpose', 'Cost (Rs)'],
                        txRows
                    );
                }
            }
        } else if (reportType === 'financial') {
            const finRows = projList.map(p => [
                p.title, p.client || '—', p.manager || '—',
                p.budget ? Number(p.budget) : 0, p.budgetUnit || 'Lakhs',
                p.status || '—', p.type || '—',
                p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—',
                p.endDate   ? new Date(p.endDate).toLocaleDateString('en-IN')   : '—',
            ]);
            addSheet(
                'Financial Summary',
                'Financial Summary Report',
                `Generated: ${genDate}  |  Scope: ${label}`,
                ['Project', 'Client', 'Manager', 'Budget', 'Unit', 'Status', 'Type', 'Start Date', 'End Date'],
                finRows
            );
            // Expenses sheet — sorted by date desc
            const expRows = [];
            for (const p of projList) {
                try {
                    const res    = await api.get('/expenses', { params: { project: p._id } });
                    const sorted = (res.data || []).sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));
                    if (sorted.length > 0) {
                        expRows.push([p.title, '', '', '', '', '']); // project section header
                        sorted.forEach(e => expRows.push([
                            e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('en-IN') : '—',
                            e.title || '—', e.category || '—',
                            Number(e.amount) || 0,
                            e.invoiceNumber || '—', e.status || '—'
                        ]));
                    }
                } catch {}
            }
            if (expRows.length > 0) {
                addSheet(
                    'Expenses',
                    'Project Expenses',
                    `Sorted by date (newest first)  |  Generated: ${genDate}`,
                    ['Date', 'Title', 'Category', 'Amount (Rs)', 'Invoice #', 'Status'],
                    expRows
                );
            }
            // Material costs sheet
            const costRows = [];
            for (const p of projList) {
                try {
                    const res = await api.get(`/projects/${p._id}/inventory`);
                    (res.data?.materials || res.data || []).forEach(m => {
                        let cost = 0;
                        (m.logs || []).forEach(l => { if (l.type === 'delivery' && l.totalCost) cost += Number(l.totalCost); });
                        costRows.push([p.title, m.name, m.unit, m.inflow || 0, m.outflow || 0, m.balance || 0, cost]);
                    });
                } catch {}
            }
            if (costRows.length > 0) {
                addSheet(
                    'Material Costs',
                    'Material Cost Breakdown',
                    `Generated: ${genDate}`,
                    ['Project', 'Material', 'Unit', 'Inflow', 'Outflow', 'Balance', 'Total Cost (Rs)'],
                    costRows
                );
            }
        } else if (reportType === 'personnel') {
            for (let m = month; m <= endMonth; m++) {
                const mName = new Date(year, m - 1).toLocaleString('en-US', { month: 'long' });
                const rows  = [];
                for (const p of projList) {
                    const res  = await api.get('/personnel/attendance-report', { params: { projectId: p._id, month: m, year } });
                    const data = res.data || [];
                    if (data.length > 0) {
                        rows.push([`${p.title}`, '', '', '', '', '', '']); // section header
                        data.forEach(per => rows.push([
                            per.name, per.role || '—',
                            per['On Site'] || 0, per['Remote'] || 0,
                            per['On Leave'] || 0, per['Off Duty'] || 0,
                            per.totalDays || 0
                        ]));
                    }
                }
                addSheet(
                    `${mName.slice(0, 3)} ${year}`.slice(0, 31),
                    `Personnel Attendance — ${mName} ${year}`,
                    `Scope: ${label}  |  Generated: ${genDate}`,
                    ['Name', 'Role', 'On Site Days', 'Remote Days', 'Leave Days', 'Off Duty', 'Total Recorded'],
                    rows
                );
            }
        }

        if (wb.worksheets.length === 0) {
            showToast('No data found for the selected parameters.', 'error');
            return;
        }

        const buffer = await wb.xlsx.writeBuffer();
        downloadBlob(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${co.replace(/\s+/g, '_')}_${reportType}_${label.replace(/\s+/g, '_')}.xlsx`
        );
    };

    // ─── CSV GENERATOR (professional with UTF-8 BOM + metadata) ──────────────────

    const generateCsvReport = async ({ projectId, dateFrom, dateTo, month, year }) => {
        const projList = projectId ? projects.filter(p => p._id === projectId) : projects;
        const label    = projectId ? (selectedProject?.title || 'Project') : 'All Projects';
        const co       = companyName || 'S R Associates';
        const genDate  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const typeLabel = REPORT_TYPES.find(r => r.id === reportType)?.label || reportType;

        // Helper to escape CSV values
        const esc = (v) => {
            const s = (v ?? '').toString();
            return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const toRow = (arr) => arr.map(esc).join(',');

        const lines = [
            // UTF-8 BOM for Excel auto-detect
            `\uFEFF`,
            // Metadata block
            toRow([`# Company: ${co} — Engineers & Contractors`]),
            toRow([`# Report Type: ${typeLabel}`]),
            toRow([`# Project Scope: ${label}`]),
            toRow([`# Generated: ${genDate}`]),
            toRow([`# Date Range: ${dateFrom || 'All dates'} to ${dateTo || 'present'}`]),
            toRow(['']),  // blank separator
        ];

        const dataRows = [];

        if (reportType === 'daily') {
            dataRows.push(['Date', 'Day', 'Weather', 'Laborers', 'Notes', 'Project']);
            for (const p of projList) {
                const res  = await api.get(`/projects/${p._id}/daily-logs`);
                filterByDate(res.data?.logs || [], 'date', dateFrom, dateTo)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .forEach(l => dataRows.push([
                        new Date(l.date).toLocaleDateString('en-IN'),
                        l.day || '', l.weather?.condition || '',
                        l.laborers || 0, l.notes || '', p.title
                    ]));
            }
        } else if (reportType === 'inventory') {
            dataRows.push(['Project', 'Material', 'Unit', 'Inflow', 'Outflow', 'Balance', 'Status']);
            for (const p of projList) {
                const res = await api.get(`/projects/${p._id}/inventory`);
                (res.data?.materials || res.data || []).forEach(m =>
                    dataRows.push([p.title, m.name, m.unit, m.inflow || 0, m.outflow || 0, m.balance || 0, m.status || ''])
                );
            }
        } else if (reportType === 'financial') {
            dataRows.push(['Project', 'Client', 'Budget', 'Unit', 'Status', 'Type', 'Manager', 'Start Date', 'End Date']);
            projList.forEach(p => dataRows.push([
                p.title, p.client || '', p.budget || 0, p.budgetUnit || 'Lakhs',
                p.status || '', p.type || '', p.manager || '',
                p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '',
                p.endDate   ? new Date(p.endDate).toLocaleDateString('en-IN')   : ''
            ]));
            // Expenses — sorted by date desc
            dataRows.push([]);
            dataRows.push(['--- EXPENSES (sorted newest first) ---']);
            dataRows.push(['Date', 'Title', 'Category', 'Amount (Rs)', 'Invoice #', 'Status', 'Project']);
            for (const p of projList) {
                try {
                    const res = await api.get('/expenses', { params: { project: p._id } });
                    (res.data || [])
                        .sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate))
                        .forEach(e => dataRows.push([
                            e.expenseDate ? new Date(e.expenseDate).toLocaleDateString('en-IN') : '',
                            e.title || '', e.category || '',
                            Number(e.amount) || 0,
                            e.invoiceNumber || '', e.status || '', p.title
                        ]));
                } catch {}
            }
        } else if (reportType === 'personnel') {
            dataRows.push(['Project', 'Name', 'Role', 'On Site Days', 'Remote Days', 'Leave Days', 'Off Duty', 'Total Recorded']);
            for (const p of projList) {
                const res  = await api.get('/personnel/attendance-report', { params: { projectId: p._id, month, year } });
                (res.data || []).forEach(per => dataRows.push([
                    p.title, per.name, per.role || '',
                    per['On Site'] || 0, per['Remote'] || 0,
                    per['On Leave'] || 0, per['Off Duty'] || 0,
                    per.totalDays || 0
                ]));
            }
        }

        dataRows.forEach(r => lines.push(toRow(r)));

        const csv = lines.join('\n');
        downloadBlob(
            new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
            `${co.replace(/\s+/g, '_')}_${typeLabel.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}.csv`
        );
    };

    // ─── UNIFIED GENERATE ─────────────────────────────────────────────────────

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        try {
            const { month, endMonth, year } = getDateParams();
            const params = { projectId: formProject || null, dateFrom: formDateFrom || null, dateTo: formDateTo || null, month, endMonth, year };

            if (exportFormat === 'pdf') {
                if (reportType === 'daily')       await generateDailyPDF(params);
                else if (reportType === 'inventory')   await generateInventoryPDF(params);
                else if (reportType === 'financial')   await generateFinancialPDF(params);
                else if (reportType === 'personnel')   await generateAttendancePDF(params);
            } else if (exportFormat === 'excel') {
                await generateExcelReport(params);
            } else {
                await generateCsvReport(params);
            }
            showToast('Report generated successfully!', 'success');
            if (exportFormat === 'pdf') setMainTab('history');
        } catch (err) {
            console.error('Report generation failed:', err);
            showToast('Failed to generate report. Check parameters and try again.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // ─── DOCUMENT VAULT HANDLERS ──────────────────────────────────────────────

    const handleDeleteDocument = (doc) => {
        if (!doc.projectId || !doc.id) { showToast('Cannot delete: missing identifiers.', 'error'); return; }
        setDocumentToDelete(doc);
    };

    const confirmDeleteDocument = async () => {
        if (!documentToDelete) return;
        try {
            await api.delete(`/projects/${documentToDelete.projectId}/blueprints/${documentToDelete.id}`);
            setUploadedDocs(uploadedDocs.filter(d => d.id !== documentToDelete.id));
            showToast('Document deleted.', 'success');
        } catch (e) { console.error(e); showToast('Failed to delete document.', 'error'); }
        setDocumentToDelete(null);
    };

    const handleDocumentUpload = async (e) => {
        e.preventDefault();
        if (!uploadProject || !uploadFile) return;
        setUploading(true);
        try {
            showToast('Uploading to Cloudinary…', 'info');
            const fileUrl = await uploadToCloudinary(uploadFile);
            await api.post(`/projects/${uploadProject}/blueprints`, { plans: [fileUrl] });
            setShowUploadModal(false); setUploadFile(null); setUploadProject('');
            fetchData();
            showToast('Document uploaded!', 'success');
        } catch (e) { console.error(e); showToast(e.message || 'Upload failed', 'error'); }
        finally { setUploading(false); }
    };

    const downloadReport = (report) => {
        if (!report.dataUri && !report.blob) return;
        const url = report.blob ? URL.createObjectURL(report.blob) : report.dataUri;
        const a   = document.createElement('a');
        a.href = url;
        a.download = `${report.name.replace(/\s+/g, '_')}.pdf`;
        a.click();
        if (report.blob) URL.revokeObjectURL(url);
    };

    const confirmDeleteReport = () => {
        if (!reportToDelete) return;
        setSystemReports(systemReports.filter(r => r.id !== reportToDelete.id));
        showToast('Report deleted.', 'success');
        setReportToDelete(null); setReportDeleteConfirmText('');
    };

    // ─── RENDER ───────────────────────────────────────────────────────────────

    if (isLoading) return <GlobalLoader />;

    const NAV_ITEMS = [
        { icon: <LayoutDashboard size={16} />, text: 'Dashboard',  href: '/dashboard' },
        { icon: <FolderOpen size={16} />,      text: 'Projects',   href: '/projects' },
        { icon: <Users size={16} />,           text: 'Personnel',  href: '/personnel' },
        { icon: <PieChart size={16} />,        text: 'Budget',     href: '/budget' },
        { icon: <FileText size={16} />,        text: 'Reports',    href: '/reports', active: true },
    ];

    return (
        <>
            {ToastComponent}
            <div className="flex h-screen bg-[#f5f5f7] font-sans overflow-hidden">

                {/* ── Sidebar ── */}
                <aside className="w-60 bg-[#1a1d2e] shrink-0 flex flex-col border-r border-white/[0.06]">
                    <div className="px-5 py-5 flex justify-center border-b border-white/[0.04]">
                        <CompanyLogo className="w-28 h-auto opacity-90" defaultLogoType="white" />
                    </div>
                    <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
                        <p className="px-3 mb-3 text-[9px] font-semibold tracking-[0.15em] text-white/20 uppercase">Menu</p>
                        {NAV_ITEMS.map(item => (
                            <a key={item.href} href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${item.active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}>
                                <span className={`transition-colors ${item.active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{item.icon}</span>
                                <span className="font-medium">{item.text}</span>
                                {item.active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500" />}
                            </a>
                        ))}
                        <div className="pt-4 mt-2 border-t border-white/[0.04]">
                            <p className="px-3 mb-3 text-[9px] font-semibold tracking-[0.15em] text-white/20 uppercase">System</p>
                            <a href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/30 hover:bg-white/[0.04] hover:text-white/60 text-[13px] group">
                                <span className="text-white/20 group-hover:text-white/40"><Settings size={16} /></span>
                                <span className="font-medium">Settings</span>
                            </a>
                        </div>
                    </nav>
                    {currentUser && (
                        <a href="/settings" className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors mt-4">
                            <img src={currentUser.avatar || `https://i.pravatar.cc/150?u=${currentUser._id}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-white truncate">{currentUser.name || 'User'}</p>
                                <p className="text-[10px] text-white/30 capitalize">{currentUser.role || 'Member'}</p>
                            </div>
                            <ChevronRight size={14} className="text-white/20 shrink-0" />
                        </a>
                    )}
                </aside>

                {/* ── Main Content ── */}
                <main className="flex-1 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="px-8 pt-7 pb-5 bg-white border-b border-gray-100 shrink-0">
                        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Generate and export construction insights</p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="bg-white border-b border-gray-100 px-8 flex gap-1 shrink-0">
                        {[
                            { id: 'generate', label: 'Generate Report', icon: <Zap size={13} /> },
                            { id: 'vault',    label: 'Document Vault',  icon: <Archive size={13} /> },
                            { id: 'history',  label: 'Report History',  icon: <History size={13} /> },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setMainTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${mainTab === tab.id ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-8">

                        {/* ── GENERATE TAB ── */}
                        {mainTab === 'generate' && (
                            <div className="max-w-5xl space-y-8">

                                {/* Phase 01 */}
                                <section>
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="shrink-0">
                                            <span className="text-[10px] font-bold tracking-widest text-violet-600 uppercase bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">Phase 01</span>
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-gray-900">Select Report Type</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">Choose a report template to initialize the generation engine.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-4">
                                        {REPORT_TYPES.map(type => {
                                            const Icon     = type.icon;
                                            const selected = reportType === type.id;
                                            return (
                                                <button key={type.id} onClick={() => setReportType(type.id)}
                                                    className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-150 hover:shadow-sm ${selected ? 'border-violet-400 bg-white shadow-md shadow-violet-100' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                                                    {selected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-2xl" />}
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                                                        style={{ backgroundColor: selected ? type.bg : '#f5f5f7' }}>
                                                        <Icon size={20} style={{ color: selected ? type.color : '#9ca3af' }} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-gray-900 mb-1.5">{type.label}</h3>
                                                    <p className="text-[11px] leading-relaxed" style={{ color: selected ? type.color + 'cc' : '#9ca3af' }}>{type.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Phase 02 */}
                                <section>
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="shrink-0">
                                            <span className="text-[10px] font-bold tracking-widest text-violet-600 uppercase bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">Phase 02</span>
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-gray-900">Configuration</h2>
                                            <p className="text-xs text-gray-400 mt-0.5">Define the parameters and select your export format.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-5 gap-5">

                                        {/* Project Parameters */}
                                        <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                                            <div className="flex items-center gap-2 mb-5">
                                                <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                                                    <Box size={14} className="text-gray-400" />
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-800">Project Parameters</h3>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Project</label>
                                                    <select value={formProject} onChange={e => setFormProject(e.target.value)}
                                                        className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all">
                                                        <option value="">All Projects</option>
                                                        {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Site Manager</label>
                                                    <div className="w-full bg-gray-50 border border-gray-100 px-3 py-2.5 rounded-xl text-sm text-gray-500 cursor-default select-none">
                                                        {siteManager}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                                    Date Range {reportType === 'personnel' ? '(Month / Year used for Attendance)' : ''}
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <input type="date" value={formDateFrom} onChange={e => setFormDateFrom(e.target.value)}
                                                        className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all" />
                                                    <span className="text-gray-300 font-medium text-sm">to</span>
                                                    <input type="date" value={formDateTo} onChange={e => setFormDateTo(e.target.value)}
                                                        className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all" />
                                                </div>
                                                <p className="text-[10px] text-gray-300 mt-1.5">Leave empty to include all dates.</p>
                                            </div>
                                        </div>

                                        {/* Export Format + Generate */}
                                        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col">
                                            <div className="flex items-center gap-2 mb-5">
                                                <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100">
                                                    <Download size={14} className="text-gray-400" />
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-800">Export Format</h3>
                                            </div>

                                            <div className="space-y-2.5 flex-1">
                                                {EXPORT_FORMATS.map(fmt => {
                                                    const FmtIcon  = fmt.icon;
                                                    const selected = exportFormat === fmt.id;
                                                    return (
                                                        <button key={fmt.id} onClick={() => setExportFormat(fmt.id)}
                                                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left group ${selected ? 'border-violet-400 bg-violet-50/30' : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'}`}>
                                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                                style={{ backgroundColor: fmt.color + '18' }}>
                                                                <FmtIcon size={17} style={{ color: fmt.color }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-gray-900">{fmt.label}</p>
                                                                <p className="text-[10px] text-gray-400">{fmt.sublabel}</p>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${selected ? 'border-violet-500' : 'border-gray-300'}`}>
                                                                {selected && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <button onClick={handleGenerateReport} disabled={isGenerating}
                                                className="w-full mt-5 py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-100">
                                                {isGenerating
                                                    ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                                                    : <><ArrowRight size={15} /> GENERATE REPORT</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ── VAULT TAB ── */}
                        {mainTab === 'vault' && (
                            <div className="max-w-4xl">
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">Project Documents</h3>
                                            <p className="text-[11px] text-gray-400 mt-0.5">{uploadedDocs.length} files uploaded</p>
                                        </div>
                                        <button onClick={() => setShowUploadModal(true)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-semibold rounded-xl transition-colors">
                                            <UploadCloud size={13} /> Upload
                                        </button>
                                    </div>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-50">
                                                <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">File</th>
                                                <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Project</th>
                                                <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Uploaded by</th>
                                                <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Date</th>
                                                <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {uploadedDocs.length > 0 ? uploadedDocs.map(doc => (
                                                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="py-3.5 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                                                                <FilePdf size={14} className="text-violet-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900 max-w-[200px] truncate">{doc.name}</p>
                                                                <p className="text-[10px] text-gray-300">{doc.type}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-6 text-xs text-gray-500">{doc.project}</td>
                                                    <td className="py-3.5 px-6 text-xs text-gray-500">{doc.uploadedBy}</td>
                                                    <td className="py-3.5 px-6 text-xs text-gray-400">{doc.date}</td>
                                                    <td className="py-3.5 px-6 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {doc.originalUrl && (
                                                                <a href={doc.originalUrl} target="_blank" rel="noopener noreferrer" title="View"
                                                                    className="text-gray-400 hover:text-violet-600 p-1.5 rounded-lg hover:bg-violet-50 transition-colors">
                                                                    <Eye size={13} />
                                                                </a>
                                                            )}
                                                            {doc.originalUrl && (
                                                                <a href={doc.originalUrl} download target="_blank" rel="noopener noreferrer" title="Download"
                                                                    className="text-gray-400 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                                                    <Download size={13} />
                                                                </a>
                                                            )}
                                                            <button onClick={() => handleDeleteDocument(doc)} title="Delete"
                                                                className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="5" className="py-16 text-center text-gray-300 text-sm">No documents uploaded yet</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ── HISTORY TAB ── */}
                        {mainTab === 'history' && (
                            <div className="max-w-4xl">
                                {systemReports.length === 0 ? (
                                    <div className="text-center py-24 text-gray-300">
                                        <History size={40} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">No reports generated yet.</p>
                                        <button onClick={() => setMainTab('generate')} className="mt-4 text-xs text-violet-500 hover:underline">Generate your first report →</button>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">Generated Reports</h3>
                                                <p className="text-[11px] text-gray-400 mt-0.5">{systemReports.length} report{systemReports.length !== 1 ? 's' : ''} in history</p>
                                            </div>
                                        </div>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-50">
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Report</th>
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Project</th>
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Date</th>
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-left">Size</th>
                                                    <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {systemReports.map(report => (
                                                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3.5 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                                                                    <FilePdf size={14} className="text-violet-500" />
                                                                </div>
                                                                <p className="text-sm font-semibold text-gray-900">{report.name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-6 text-xs text-gray-500">{report.project}</td>
                                                        <td className="py-3.5 px-6 text-xs text-gray-400">{report.date}</td>
                                                        <td className="py-3.5 px-6 text-xs text-gray-400">{report.size}</td>
                                                        <td className="py-3.5 px-6 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => downloadReport(report)} title="Download"
                                                                    className="text-gray-400 hover:text-gray-800 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                                                    <Download size={13} />
                                                                </button>
                                                                <button onClick={() => { setReportToDelete(report); setReportDeleteConfirmText(''); }} title="Delete"
                                                                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* ── UPLOAD MODAL ── */}
            {showUploadModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
                    <div className="absolute inset-0" onClick={() => !uploading && setShowUploadModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-50">
                            <div>
                                <h3 className="font-bold text-base text-gray-900">Upload Document</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Add a new file to the Document Vault</p>
                            </div>
                            <button onClick={() => !uploading && setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleDocumentUpload} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Project</label>
                                <select required value={uploadProject} onChange={e => setUploadProject(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-200">
                                    <option value="">Select a project…</option>
                                    {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">File</label>
                                <input required type="file" onChange={e => setUploadFile(e.target.files[0])}
                                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm text-gray-700 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-600 hover:file:bg-violet-100 cursor-pointer" />
                            </div>
                            <div className="pt-2 flex justify-end gap-2 border-t border-gray-50">
                                <button type="button" onClick={() => setShowUploadModal(false)} disabled={uploading} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit" disabled={uploading || !uploadProject || !uploadFile}
                                    className="px-5 py-2 bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-50">
                                    {uploading ? <><Loader2 size={12} className="animate-spin" /> Uploading…</> : <><UploadCloud size={12} /> Upload</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── DELETE DOCUMENT MODAL ── */}
            {documentToDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 p-6 text-center">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-2">Delete Document?</h3>
                        <p className="text-sm text-gray-500 mb-6">Are you sure you want to permanently delete "<strong>{documentToDelete.name}</strong>"?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDocumentToDelete(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl">Cancel</button>
                            <button onClick={confirmDeleteDocument} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE REPORT MODAL ── */}
            {reportToDelete && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-red-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-red-600 flex items-center gap-2"><AlertCircle size={18} /> Delete Report</h3>
                            <button onClick={() => { setReportToDelete(null); setReportDeleteConfirmText(''); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="p-6">
                            <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl mb-5">
                                <p className="font-semibold mb-1">This action cannot be undone.</p>
                                <p>This will permanently delete <strong>{reportToDelete.name}</strong> from your history.</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-3">Type <strong>{reportToDelete.name}</strong> to confirm.</p>
                            <input type="text" value={reportDeleteConfirmText} onChange={e => setReportDeleteConfirmText(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-red-400 outline-none mb-5 text-sm" />
                            <button onClick={confirmDeleteReport} disabled={reportDeleteConfirmText !== reportToDelete.name}
                                className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold rounded-xl transition-all disabled:opacity-40 border border-red-200">
                                I understand, delete this report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Reports;
