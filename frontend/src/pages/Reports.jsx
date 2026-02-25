import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, FolderOpen, Users, PieChart, FileText, Settings,
    Download, FileIcon, Calendar, Box, Wallet, UploadCloud, File as FilePdf,
    Trash2, Eye, Loader2, ChevronRight, BarChart3, CheckCircle2, X, CloudSun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('generated');
    const [uploadedDocs, setUploadedDocs] = useState([]);
    const [systemReports, setSystemReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyName, setCompanyName] = useState('BuildCore');
    const [companyInitial, setCompanyInitial] = useState('B');
    const [projects, setProjects] = useState([]);
    const [generating, setGenerating] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [logDates, setLogDates] = useState([]);
    const [loadingDates, setLoadingDates] = useState(false);
    // Inventory picker
    const [showInvPicker, setShowInvPicker] = useState(false);
    const [invSelectedProject, setInvSelectedProject] = useState('');
    const [invDateFrom, setInvDateFrom] = useState('');
    const [invDateTo, setInvDateTo] = useState('');
    const [invAvailDates, setInvAvailDates] = useState([]);
    const [loadingInv, setLoadingInv] = useState(false);
    // Financial picker
    const [showFinPicker, setShowFinPicker] = useState(false);
    const [finSelectedProject, setFinSelectedProject] = useState('');

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
            const projectsData = response.data || [];
            setProjects(projectsData);
            const docs = [];
            projectsData.forEach(project => {
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
        } catch (error) { console.error("Failed to fetch reports data", error); }
        finally { setIsLoading(false); }
    };

    // ─── PDF GENERATION HELPERS ───
    const addPdfHeader = (doc, title) => {
        const company = localStorage.getItem('companyShortName') || 'S R Associates';
        doc.setFillColor(26, 29, 46);
        doc.rect(0, 0, 210, 38, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(company, 14, 16);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Engineers & Contractors', 14, 23);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, 33);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 196, 33, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        return 46;
    };

    const generateDailyProgress = (download = false) => {
        setGenerating('daily');
        setTimeout(() => {
            try {
                const doc = new jsPDF();
                let y = addPdfHeader(doc, 'Daily Progress Report');

                // Summary
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Project Summary', 14, y);
                y += 6;

                const tableData = projects.map(p => [
                    p.title || 'Untitled',
                    p.address || 'N/A',
                    p.status || 'Planning',
                    p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A',
                    p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : 'N/A',
                    p.manager || 'Unassigned'
                ]);

                autoTable(doc, {
                    startY: y,
                    head: [['Project', 'Location', 'Status', 'Start', 'End', 'Manager']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [26, 29, 46], fontSize: 8 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: 14, right: 14 },
                });

                y = doc.lastAutoTable.finalY + 12;

                // Per-project details
                projects.forEach(p => {
                    if (y > 250) { doc.addPage(); y = 20; }
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(p.title || 'Untitled', 14, y);
                    y += 5;
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Type: ${p.type || 'N/A'}  |  Site: ${p.siteSize ? p.siteSize + ' sq ft' : 'N/A'}  |  Floors: ${p.floors || 'N/A'}  |  Client: ${p.client || 'N/A'}`, 14, y);
                    y += 5;
                    const budgetVal = p.budget ? `₹${Number(p.budget).toLocaleString('en-IN')}` : 'N/A';
                    doc.text(`Budget: ${budgetVal}  |  Contractor: ${localStorage.getItem('companyShortName') || 'S R Associates'}`, 14, y);
                    y += 8;
                });

                if (download) {
                    doc.save(`Daily_Progress_${new Date().toISOString().slice(0, 10)}.pdf`);
                }

                // Add to history
                const newReport = {
                    id: Date.now().toString(),
                    name: 'Daily Progress Report',
                    project: projects.length > 0 ? `${projects.length} Projects` : 'No Projects',
                    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    status: 'Ready',
                    size: `${Math.round(doc.output('arraybuffer').byteLength / 1024)} KB`,
                    blob: doc.output('blob')
                };
                setSystemReports(prev => [newReport, ...prev]);
            } catch (err) { console.error('PDF generation failed:', err); }
            finally { setGenerating(null); }
        }, 500);
    };

    const generateInventoryReport = (download = false) => {
        setGenerating('inventory');
        setTimeout(async () => {
            try {
                const doc = new jsPDF();
                let y = addPdfHeader(doc, 'Inventory Report');

                // Fetch inventory for each project
                for (const p of projects) {
                    if (y > 240) { doc.addPage(); y = 20; }
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(p.title || 'Untitled', 14, y);
                    y += 6;

                    try {
                        const invRes = await api.get(`/projects/${p._id}/inventory`);
                        const items = invRes.data?.materials || invRes.data || [];
                        if (items.length > 0) {
                            const invData = items.map(item => [
                                item.name || 'N/A',
                                item.category || 'N/A',
                                `${item.quantity || 0} ${item.unit || ''}`,
                                item.status || 'N/A'
                            ]);
                            autoTable(doc, {
                                startY: y,
                                head: [['Material', 'Category', 'Quantity', 'Status']],
                                body: invData,
                                theme: 'striped',
                                headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
                                bodyStyles: { fontSize: 8 },
                                margin: { left: 14, right: 14 },
                            });
                            y = doc.lastAutoTable.finalY + 10;
                        } else {
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'italic');
                            doc.text('No inventory data available', 14, y);
                            y += 8;
                        }
                    } catch {
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'italic');
                        doc.text('Inventory data unavailable', 14, y);
                        y += 8;
                    }
                }

                if (download) {
                    doc.save(`Inventory_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
                }

                const newReport = {
                    id: Date.now().toString(),
                    name: 'Inventory Report',
                    project: projects.length > 0 ? `${projects.length} Projects` : 'No Projects',
                    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    status: 'Ready',
                    size: `${Math.round(doc.output('arraybuffer').byteLength / 1024)} KB`,
                    blob: doc.output('blob')
                };
                setSystemReports(prev => [newReport, ...prev]);
            } catch (err) { console.error('Inventory report failed:', err); }
            finally { setGenerating(null); }
        }, 500);
    };

    const generateFinancialSummary = (download = false) => {
        setGenerating('financial');
        setTimeout(() => {
            try {
                const doc = new jsPDF();
                let y = addPdfHeader(doc, 'Financial Summary');

                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Budget Overview', 14, y);
                y += 6;

                const finData = projects.map(p => {
                    const budget = Number(p.budget) || 0;
                    const unit = p.budgetUnit || 'Lakhs';
                    const budgetDisplay = budget > 0 ? `₹${budget.toLocaleString('en-IN')} ${unit}` : 'N/A';
                    return [
                        p.title || 'Untitled',
                        p.client || 'N/A',
                        budgetDisplay,
                        p.status || 'Planning',
                        p.type || 'N/A'
                    ];
                });

                autoTable(doc, {
                    startY: y,
                    head: [['Project', 'Client', 'Budget', 'Status', 'Type']],
                    body: finData,
                    theme: 'striped',
                    headStyles: { fillColor: [109, 40, 217], fontSize: 8 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: 14, right: 14 },
                });

                y = doc.lastAutoTable.finalY + 12;

                // Totals
                let totalLakhs = 0;
                let totalCrores = 0;
                projects.forEach(p => {
                    const b = Number(p.budget) || 0;
                    if (p.budgetUnit === 'Crores') totalCrores += b;
                    else totalLakhs += b;
                });
                const totalInLakhs = totalLakhs + (totalCrores * 100);

                if (y > 260) { doc.addPage(); y = 20; }
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Financial Totals', 14, y);
                y += 6;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(`Total Projects: ${projects.length}`, 14, y); y += 5;
                doc.text(`Combined Budget: ₹${totalInLakhs.toLocaleString('en-IN')} Lakhs`, 14, y); y += 5;
                if (totalCrores > 0) {
                    doc.text(`  (${totalCrores} Crores + ${totalLakhs} Lakhs)`, 14, y); y += 5;
                }

                if (download) {
                    doc.save(`Financial_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
                }

                const newReport = {
                    id: Date.now().toString(),
                    name: 'Financial Summary',
                    project: projects.length > 0 ? `${projects.length} Projects` : 'No Projects',
                    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    status: 'Ready',
                    size: `${Math.round(doc.output('arraybuffer').byteLength / 1024)} KB`,
                    blob: doc.output('blob')
                };
                setSystemReports(prev => [newReport, ...prev]);
            } catch (err) { console.error('Financial report failed:', err); }
            finally { setGenerating(null); }
        }, 500);
    };

    const downloadReport = (report) => {
        const url = URL.createObjectURL(report.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name.replace(/\s+/g, '_')}_${report.date.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── DAILY LOG DATE PICKER ───
    const openDatePicker = async () => {
        setShowDatePicker(true);
        setLoadingDates(true);
        try {
            const allLogs = [];
            for (const p of projects) {
                try {
                    const res = await api.get(`/projects/${p._id}/daily-logs`);
                    const logs = res.data || [];
                    logs.forEach(log => {
                        allLogs.push({ ...log, projectTitle: p.title, projectId: p._id });
                    });
                } catch { /* skip */ }
            }

            // Group by date
            const dateMap = {};
            allLogs.forEach(log => {
                const dateKey = new Date(log.date).toISOString().slice(0, 10);
                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { dateKey, day: log.day, logs: [], totalLaborers: 0 };
                }
                dateMap[dateKey].logs.push(log);
                dateMap[dateKey].totalLaborers += (log.laborers || 0);
            });

            // Sort descending
            const sorted = Object.values(dateMap).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
            setLogDates(sorted);
        } catch (err) { console.error('Failed to fetch daily logs:', err); }
        finally { setLoadingDates(false); }
    };

    const downloadDailyLogPdf = (entry) => {
        setShowDatePicker(false);
        setGenerating('daily');
        setTimeout(() => {
            try {
                const doc = new jsPDF();
                const dateStr = new Date(entry.dateKey).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                let y = addPdfHeader(doc, `Daily Progress — ${dateStr}`);

                // Summary row
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(`Day: ${entry.day || 'N/A'}  |  Total Laborers: ${entry.totalLaborers}  |  Projects: ${entry.logs.length}`, 14, y);
                y += 8;

                entry.logs.forEach(log => {
                    if (y > 250) { doc.addPage(); y = 20; }

                    // Project header
                    doc.setFillColor(245, 245, 250);
                    doc.rect(14, y - 4, 182, 8, 'F');
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(26, 29, 46);
                    doc.text(log.projectTitle || 'Untitled Project', 16, y + 1);
                    doc.setTextColor(0, 0, 0);
                    y += 10;

                    // Details table
                    autoTable(doc, {
                        startY: y,
                        body: [
                            ['Weather', log.weather?.condition || 'N/A'],
                            ['Laborers on Site', String(log.laborers || 0)],
                            ['Notes', log.notes || 'No notes recorded'],
                        ],
                        theme: 'plain',
                        columnStyles: {
                            0: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100], fontSize: 8 },
                            1: { fontSize: 8 }
                        },
                        margin: { left: 14, right: 14 },
                        styles: { cellPadding: 2 },
                    });
                    y = doc.lastAutoTable.finalY + 8;
                });

                doc.save(`Daily_Progress_${entry.dateKey}.pdf`);

                // Add to report history
                const newReport = {
                    id: Date.now().toString(),
                    name: `Daily Progress — ${dateStr}`,
                    project: `${entry.logs.length} Projects`,
                    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    status: 'Ready',
                    size: `${Math.round(doc.output('arraybuffer').byteLength / 1024)} KB`,
                    blob: doc.output('blob')
                };
                setSystemReports(prev => [newReport, ...prev]);
            } catch (err) { console.error('Daily log PDF failed:', err); }
            finally { setGenerating(null); }
        }, 300);
    };

    // ─── INVENTORY PICKER ───
    const openInventoryPicker = () => {
        setInvSelectedProject('');
        setInvDateFrom('');
        setInvDateTo('');
        setInvAvailDates([]);
        setShowInvPicker(true);
    };

    const handleInvProjectChange = async (projectId) => {
        if (!projectId) { setInvAvailDates([]); return; }
        setLoadingInv(true);
        try {
            const res = await api.get(`/projects/${projectId}/inventory`);
            const materials = res.data?.materials || res.data || [];
            const allDates = new Set();
            materials.forEach(m => {
                (m.logs || []).forEach(log => {
                    if (log.date) allDates.add(new Date(log.date).toISOString().slice(0, 10));
                });
            });
            const sorted = [...allDates].sort();
            setInvAvailDates(sorted);
            setInvDateFrom('');
            setInvDateTo('');
        } catch (err) { console.error('Failed to fetch inventory:', err); setInvAvailDates([]); }
        finally { setLoadingInv(false); }
    };

    const downloadFilteredInventory = async () => {
        setShowInvPicker(false);
        setGenerating('inventory');
        try {
            const project = projects.find(p => p._id === invSelectedProject);
            const res = await api.get(`/projects/${invSelectedProject}/inventory`);
            const materials = res.data?.materials || res.data || [];

            const doc = new jsPDF();
            const fromDate = invDateFrom || null;
            const toDate = invDateTo || null;
            const dateLabel = fromDate && toDate
                ? `${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                : fromDate ? `From ${new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : toDate ? `Up to ${new Date(toDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : 'All dates';

            let y = addPdfHeader(doc, `Inventory Report — ${project?.title || 'Project'}`);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Site: ${project?.address || 'N/A'}  |  Period: ${dateLabel}`, 14, y);
            y += 8;

            // Summary table
            const summaryData = materials.map(m => [
                m.name || 'N/A',
                m.unit || '',
                String(m.inflow || 0),
                String(m.outflow || 0),
                String(m.balance || 0),
                m.status || 'N/A'
            ]);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Material Summary', 14, y);
            y += 6;

            autoTable(doc, {
                startY: y,
                head: [['Material', 'Unit', 'Inflow', 'Outflow', 'Balance', 'Status']],
                body: summaryData,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                margin: { left: 14, right: 14 },
            });
            y = doc.lastAutoTable.finalY + 10;

            // Filtered transaction logs
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            if (y > 260) { doc.addPage(); y = 20; }
            doc.text('Transaction Log', 14, y);
            y += 6;

            const logRows = [];
            materials.forEach(m => {
                (m.logs || []).forEach(log => {
                    const logDate = new Date(log.date).toISOString().slice(0, 10);
                    if (fromDate && logDate < fromDate) return;
                    if (toDate && logDate > toDate) return;
                    logRows.push([
                        new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
                        m.name || 'N/A',
                        log.type === 'delivery' ? 'Delivery' : 'Usage',
                        `${log.quantity || 0} ${m.unit || ''}`,
                        log.type === 'delivery' ? (log.supplier || 'N/A') : (log.locationPurpose || 'N/A'),
                        log.totalCost ? `₹${Number(log.totalCost).toLocaleString('en-IN')}` : '-'
                    ]);
                });
            });

            if (logRows.length > 0) {
                autoTable(doc, {
                    startY: y,
                    head: [['Date', 'Material', 'Type', 'Quantity', 'Supplier/Purpose', 'Cost']],
                    body: logRows,
                    theme: 'striped',
                    headStyles: { fillColor: [26, 29, 46], fontSize: 8 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: 14, right: 14 },
                });
            } else {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.text('No transactions in the selected period.', 14, y);
            }

            doc.save(`Inventory_${(project?.title || 'Report').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);

            const newReport = {
                id: Date.now().toString(),
                name: `Inventory — ${project?.title || 'Project'}`,
                project: project?.title || 'Project',
                date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                status: 'Ready',
                size: `${Math.round(doc.output('arraybuffer').byteLength / 1024)} KB`,
                blob: doc.output('blob')
            };
            setSystemReports(prev => [newReport, ...prev]);
        } catch (err) { console.error('Inventory PDF failed:', err); }
        finally { setGenerating(null); }
    };

    // ─── FINANCIAL PICKER ───
    const openFinancialPicker = () => {
        setFinSelectedProject('');
        setShowFinPicker(true);
    };

    const downloadProjectFinancial = async () => {
        if (!finSelectedProject) return;
        setShowFinPicker(false);
        setGenerating('financial');
        try {
            const project = projects.find(p => p._id === finSelectedProject);
            const doc = new jsPDF();
            let y = addPdfHeader(doc, `Financial Summary — ${project?.title || 'Project'}`);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Site: ${project?.address || 'N/A'}  |  Client: ${project?.client || 'N/A'}`, 14, y);
            y += 8;

            // Project info table
            const budget = Number(project?.budget) || 0;
            const unit = project?.budgetUnit || 'Lakhs';
            const budgetStr = budget > 0 ? `₹${budget.toLocaleString('en-IN')} ${unit}` : 'N/A';
            const startDate = project?.startDate ? new Date(project.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            const endDate = project?.endDate ? new Date(project.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

            autoTable(doc, {
                startY: y,
                body: [
                    ['Project', project?.title || 'N/A'],
                    ['Type', project?.type || 'N/A'],
                    ['Status', project?.status || 'N/A'],
                    ['Client', project?.client || 'N/A'],
                    ['Manager', project?.manager || 'N/A'],
                    ['Site Size', project?.siteSize ? `${project.siteSize} sq ft` : 'N/A'],
                    ['Floors', String(project?.floors || 'N/A')],
                    ['Budget', budgetStr],
                    ['Start Date', startDate],
                    ['Target End', endDate],
                ],
                theme: 'plain',
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100], fontSize: 9 },
                    1: { fontSize: 9 }
                },
                margin: { left: 14, right: 14 },
                styles: { cellPadding: 2 },
            });
            y = doc.lastAutoTable.finalY + 10;

            // Material cost breakdown
            try {
                const invRes = await api.get(`/projects/${finSelectedProject}/inventory`);
                const materials = invRes.data?.materials || invRes.data || [];
                if (materials.length > 0) {
                    if (y > 240) { doc.addPage(); y = 20; }
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Material Cost Breakdown', 14, y);
                    y += 6;

                    let totalMaterialCost = 0;
                    const costData = materials.map(m => {
                        let matCost = 0;
                        (m.logs || []).forEach(log => {
                            if (log.type === 'delivery' && log.totalCost) matCost += Number(log.totalCost);
                        });
                        totalMaterialCost += matCost;
                        return [
                            m.name || 'N/A',
                            m.unit || '',
                            String(m.inflow || 0),
                            String(m.outflow || 0),
                            String(m.balance || 0),
                            matCost > 0 ? `₹${matCost.toLocaleString('en-IN')}` : '-'
                        ];
                    });

                    autoTable(doc, {
                        startY: y,
                        head: [['Material', 'Unit', 'Inflow', 'Outflow', 'Balance', 'Cost']],
                        body: costData,
                        foot: [['', '', '', '', 'Total', `₹${totalMaterialCost.toLocaleString('en-IN')}`]],
                        theme: 'striped',
                        headStyles: { fillColor: [109, 40, 217], fontSize: 8 },
                        footStyles: { fillColor: [240, 240, 255], textColor: [109, 40, 217], fontStyle: 'bold', fontSize: 8 },
                        bodyStyles: { fontSize: 8 },
                        margin: { left: 14, right: 14 },
                    });
                    y = doc.lastAutoTable.finalY + 10;

                    // Budget utilization
                    if (budget > 0) {
                        if (y > 270) { doc.addPage(); y = 20; }
                        const budgetInRupees = unit === 'Crores' ? budget * 10000000 : budget * 100000;
                        const utilization = ((totalMaterialCost / budgetInRupees) * 100).toFixed(1);
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Budget Utilization', 14, y);
                        y += 6;
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`Total Budget: ${budgetStr}`, 14, y); y += 5;
                        doc.text(`Material Spend: ₹${totalMaterialCost.toLocaleString('en-IN')}`, 14, y); y += 5;
                        doc.text(`Utilization: ${utilization}%`, 14, y);
                    }
                }
            } catch { /* no inventory data */ }

            doc.save(`Financial_${(project?.title || 'Report').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);

            const newReport = {
                id: Date.now().toString(),
                name: `Financial — ${project?.title || 'Project'}`,
                project: project?.title || 'Project',
                date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                status: 'Ready',
                size: `${Math.round(doc.output('arraybuffer').byteLength / 1024)} KB`,
                blob: doc.output('blob')
            };
            setSystemReports(prev => [newReport, ...prev]);
        } catch (err) { console.error('Financial PDF failed:', err); }
        finally { setGenerating(null); }
    };

    return (
        <>
            <div className="flex h-screen bg-[#0f1117] font-sans text-white overflow-hidden">
                {/* ─── SIDEBAR ─── */}
                <aside className="w-[240px] bg-[#0f1117] flex flex-col z-20 hidden md:flex border-r border-white/[0.06]">
                    <div className="px-5 py-5 flex items-center justify-center"><img src="/logo.png" alt="S R Associates" className="w-28 h-auto object-contain opacity-90" /></div>
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
                                    <GeneratorCard
                                        title="Daily Progress" desc="Site activities, manpower usage, and milestone completions."
                                        icon={<Calendar size={16} className="text-violet-500" />}
                                        onGenerate={() => generateDailyProgress(false)}
                                        onDownload={openDatePicker}
                                        loading={generating === 'daily'}
                                    />
                                    <GeneratorCard
                                        title="Inventory Report" desc="Stock levels, consumption rates, and procurement needs."
                                        icon={<Box size={16} className="text-emerald-500" />}
                                        onGenerate={() => generateInventoryReport(false)}
                                        onDownload={openInventoryPicker}
                                        loading={generating === 'inventory'}
                                    />
                                    <GeneratorCard
                                        title="Financial Summary" desc="Spending breakdown, invoice status, and budget variances."
                                        icon={<Wallet size={16} className="text-violet-500" />}
                                        onGenerate={() => generateFinancialSummary(false)}
                                        onDownload={openFinancialPicker}
                                        loading={generating === 'financial'}
                                    />
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
                                                        <td className="py-3 px-6 text-right">
                                                            <button onClick={() => downloadReport(report)} className="text-gray-200 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors" title="Download">
                                                                <Download size={14} />
                                                            </button>
                                                        </td>
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

            {/* ─── DATE PICKER MODAL ─── */}
            {showDatePicker && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
                    <div className="absolute inset-0" onClick={() => setShowDatePicker(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-50">
                            <div>
                                <h3 className="font-semibold text-base text-gray-900">Select Log Date</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Choose a date to download the daily progress report</p>
                            </div>
                            <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            {loadingDates ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading dates...</div>
                            ) : logDates.length === 0 ? (
                                <div className="text-center py-12 text-gray-300 text-sm">No daily logs found across any project</div>
                            ) : (
                                <div className="space-y-2">
                                    {logDates.map(entry => (
                                        <button
                                            key={entry.dateKey}
                                            onClick={() => downloadDailyLogPdf(entry)}
                                            className="w-full flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all text-left group"
                                        >
                                            <div className="w-12 h-12 bg-violet-50 rounded-xl flex flex-col items-center justify-center shrink-0">
                                                <span className="text-sm font-bold text-violet-600">{new Date(entry.dateKey).getDate()}</span>
                                                <span className="text-[9px] font-medium text-violet-400 uppercase">{new Date(entry.dateKey).toLocaleDateString('en-IN', { month: 'short' })}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">{entry.day || new Date(entry.dateKey).toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                    {entry.logs.length} {entry.logs.length === 1 ? 'project' : 'projects'} • {entry.totalLaborers} laborers
                                                </p>
                                            </div>
                                            <Download size={14} className="text-gray-200 group-hover:text-violet-500 transition-colors shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── INVENTORY PICKER MODAL ─── */}
            {showInvPicker && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
                    <div className="absolute inset-0" onClick={() => setShowInvPicker(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-50">
                            <div>
                                <h3 className="font-semibold text-base text-gray-900">Inventory Report</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Select a site and date range</p>
                            </div>
                            <button onClick={() => setShowInvPicker(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {loadingInv ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading...</div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Site / Project</label>
                                        <select
                                            value={invSelectedProject}
                                            onChange={e => { setInvSelectedProject(e.target.value); handleInvProjectChange(e.target.value); }}
                                            className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-sm text-gray-700 outline-none focus:ring-1 focus:ring-gray-300"
                                        >
                                            <option value="">Select a project...</option>
                                            {projects.map(p => <option key={p._id} value={p._id}>{p.title} — {p.address || 'N/A'}</option>)}
                                        </select>
                                    </div>
                                    {invAvailDates.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1.5">From Date</label>
                                                <select value={invDateFrom} onChange={e => setInvDateFrom(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-sm text-gray-700 outline-none focus:ring-1 focus:ring-gray-300">
                                                    <option value="">Earliest</option>
                                                    {invAvailDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1.5">To Date</label>
                                                <select value={invDateTo} onChange={e => setInvDateTo(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-sm text-gray-700 outline-none focus:ring-1 focus:ring-gray-300">
                                                    <option value="">Latest</option>
                                                    {invAvailDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    {invSelectedProject && invAvailDates.length === 0 && (
                                        <p className="text-xs text-gray-300 text-center py-4">No inventory transactions found for this project</p>
                                    )}
                                    <div className="pt-2 flex justify-end gap-2">
                                        <button onClick={() => setShowInvPicker(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                                        <button
                                            onClick={downloadFilteredInventory}
                                            disabled={!invSelectedProject}
                                            className="px-4 py-2 bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
                                        >
                                            <Download size={12} /> Download PDF
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── FINANCIAL PICKER MODAL ─── */}
            {showFinPicker && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-black/30">
                    <div className="absolute inset-0" onClick={() => setShowFinPicker(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col" style={{ maxHeight: '80vh' }}>
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-50 shrink-0">
                            <div>
                                <h3 className="font-semibold text-base text-gray-900">Financial Summary</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Select a project to download its financial report</p>
                            </div>
                            <button onClick={() => setShowFinPicker(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"><X size={18} /></button>
                        </div>
                        <div className="px-6 py-4 overflow-y-auto flex-1">
                            <div className="space-y-2">
                                {projects.map(p => {
                                    const budget = Number(p.budget) || 0;
                                    const unit = p.budgetUnit || 'Lakhs';
                                    const budgetStr = budget > 0 ? `₹${budget.toLocaleString('en-IN')} ${unit}` : 'No budget set';
                                    return (
                                        <button
                                            key={p._id}
                                            onClick={() => setFinSelectedProject(p._id)}
                                            className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all text-left group ${finSelectedProject === p._id
                                                ? 'border-violet-300 bg-violet-50/50 ring-1 ring-violet-200'
                                                : 'border-gray-100 hover:border-violet-200 hover:bg-violet-50/30'
                                                }`}
                                        >
                                            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                                                <Wallet size={16} className="text-violet-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{budgetStr} • {p.status || 'Planning'}</p>
                                            </div>
                                            {finSelectedProject === p._id && <CheckCircle2 size={16} className="text-violet-500 shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-2 shrink-0 bg-white">
                            <button onClick={() => setShowFinPicker(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                            <button
                                onClick={downloadProjectFinancial}
                                disabled={!finSelectedProject}
                                className="px-4 py-2 bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1.5"
                            >
                                <Download size={12} /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const NavItem = ({ icon, text, active, href }) => (
    <a href={href || "#"} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] group ${active ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}>
        <span className={`transition-colors ${active ? 'text-violet-400' : 'text-white/20 group-hover:text-white/40'}`}>{icon}</span>
        <span className="font-medium">{text}</span>
        {active && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-violet-400 to-blue-500"></div>}
    </a>
);

const GeneratorCard = ({ title, desc, icon, onGenerate, onDownload, loading }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col hover:border-gray-200 transition-colors">
        <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center mb-3">{icon}</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{desc}</p>
        <div className="space-y-2">
            <button onClick={onGenerate} disabled={loading} className="w-full bg-[#1a1d2e] hover:bg-[#252840] text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                {loading ? <><Loader2 size={12} className="animate-spin" /> Generating...</> : 'Generate'}
            </button>
            <button onClick={onDownload} disabled={loading} className="w-full bg-gray-50 text-gray-600 text-xs font-medium py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                <Download size={12} /> Download PDF
            </button>
        </div>
    </div>
);

export default Reports;
