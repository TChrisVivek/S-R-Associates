const Project = require('../models/Project');
const Expense = require('../models/Expense');

const getBudgetDashboard = async (req, res) => {
    try {
        // ── Helper: convert budget to raw rupees ──
        const toRawAmount = (budget, budgetUnit) => {
            let amount = parseFloat(budget) || 0;
            const unit = budgetUnit ? budgetUnit.toLowerCase() : '';
            if (unit.includes('crore')) amount *= 10000000;
            else if (unit.includes('lakh')) amount *= 100000;
            else if (unit.includes('thousands')) amount *= 1000;
            return amount;
        };

        // ── Helper: format currency ──
        const formatCurrency = (amount) => {
            if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
            if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
            return `₹${amount.toLocaleString('en-IN')}`;
        };

        const selectedProjectId = req.query.project || null;

        // ── 1. Fetch Projects (all or one) ──
        const projects = selectedProjectId
            ? await Project.find({ _id: selectedProjectId })
            : await Project.find({});

        // ── 2. Fetch Expenses ──
        const expenseQuery = { ...(selectedProjectId ? { project: selectedProjectId } : {}) };
        const allExpensesRaw = await Expense.find(expenseQuery)
            .populate('project', 'title budget budgetUnit')
            .populate('submittedBy', 'username');

        // Filter out orphaned expenses (project was deleted but expense record survived)
        const allExpenses = allExpensesRaw.filter(e => e.project !== null);

        const approvedExpenses = allExpenses.filter(e => e.status === 'Approved');
        const pendingExpenses  = allExpenses.filter(e => e.status === 'Pending');

        // ── 3. Total Budget ──
        const totalBudget = projects.reduce((sum, p) => sum + toRawAmount(p.budget, p.budgetUnit), 0);
        const totalSpent = approvedExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const spentPercentage = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

        // ── 4. Daily average spend ──
        let dailyAvgSpend = '₹0';
        if (approvedExpenses.length > 0) {
            const dates = approvedExpenses
                .map(e => new Date(e.expenseDate || e.createdAt).getTime())
                .filter(d => !isNaN(d));
            if (dates.length > 0) {
                const earliest = Math.min(...dates);
                const daysSinceFirst = Math.max(1, Math.ceil((Date.now() - earliest) / (1000 * 60 * 60 * 24)));
                dailyAvgSpend = formatCurrency(Math.round(totalSpent / daysSinceFirst));
            }
        }

        // ── 5. Project Budget Utilization ──
        const spendingByProject = {};
        approvedExpenses.forEach(e => {
            if (e.project) {
                const pid = e.project._id.toString();
                if (!spendingByProject[pid]) spendingByProject[pid] = 0;
                spendingByProject[pid] += (parseFloat(e.amount) || 0);
            }
        });

        const projectUtilization = projects.map(p => {
            const rawBudget = toRawAmount(p.budget, p.budgetUnit);
            const spent = spendingByProject[p._id.toString()] || 0;
            const percentage = rawBudget > 0 ? parseFloat(((spent / rawBudget) * 100).toFixed(2)) : 0;
            return {
                id: p._id,
                name: p.title,
                status: p.status,
                budget: rawBudget,
                budgetFormatted: formatCurrency(rawBudget),
                spent: spent,
                spentFormatted: formatCurrency(spent),
                percentage
            };
        }).sort((a, b) => b.percentage - a.percentage);

        // ── 6. Category Breakdown ──
        const categoryTotals = {};
        approvedExpenses.forEach(e => {
            const cat = e.category || 'Miscellaneous';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
        });

        const categoryBreakdown = Object.entries(categoryTotals).map(([name, value]) => ({
            name,
            value
        })).sort((a, b) => b.value - a.value);

        // ── 7. Overruns ──
        const overrunAlerts = [];
        let totalOverrunAmount = 0;

        projectUtilization.forEach(p => {
            if (p.spent > p.budget && p.budget > 0) {
                const overage = p.spent - p.budget;
                totalOverrunAmount += overage;
                overrunAlerts.push({
                    id: p.id,
                    project: p.name,
                    overage: `+${formatCurrency(overage)}`,
                    reason: `${p.spentFormatted} spent against ${p.budgetFormatted} budget`
                });
            }
        });

        // ── 8. KPIs ──
        const kpis = {
            totalAllocated: {
                value: formatCurrency(totalBudget),
                trend: selectedProjectId
                    ? (projects[0]?.title || 'Project')
                    : `${projects.length} active projects`
            },
            actualSpent: {
                value: formatCurrency(totalSpent),
                subtext: `${spentPercentage}% of total budget`,
                dailyAvg: dailyAvgSpend
            },
            budgetOverruns: {
                value: formatCurrency(totalOverrunAmount),
                subtext: overrunAlerts.length > 0 ? `${overrunAlerts.length} active alerts` : 'All within limit'
            },
            pendingApprovals: {
                value: pendingExpenses.length.toString(),
                subtext: pendingExpenses.length > 0 ? 'Requires review' : 'None requires immediate action'
            }
        };

        // ── 9. Recent Transactions (all — no arbitrary cap) ──
        const recentTransactions = allExpenses
            .sort((a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt))
            .map(e => ({
                id: e._id,
                description: e.title,
                invoice: e.invoiceNumber || 'No invoice',
                project: e.project ? e.project.title : 'Deleted Project',
                category: e.category,
                date: e.expenseDate || e.createdAt,
                amount: formatCurrency(e.amount),
                rawAmount: e.amount,
                status: e.status,
                receipt: e.receipt
            }));

        // ── 10. Pending Requests ──
        const pendingRequests = pendingExpenses.map(e => ({
            id: e._id,
            title: e.title,
            from: e.submittedBy ? e.submittedBy.username : 'Unknown',
            amount: formatCurrency(e.amount),
            type: e.category.toLowerCase(),
            originalData: {
                title: e.title,
                amount: e.amount,
                category: e.category,
                project: e.project,
                invoiceNumber: e.invoiceNumber,
                receipt: e.receipt,
                expenseDate: e.expenseDate
            }
        }));

        // ── 11. All projects summary (for sidebar) — always global ──
        const allProjects = selectedProjectId
            ? await Project.find({})
            : projects;

        const allSpendingByProject = selectedProjectId ? (() => {
            // Re-calc globally for the sidebar list
            const map = {};
            return map;
        })() : spendingByProject;

        const projectSummaryList = await (async () => {
            if (selectedProjectId) {
                // fetch all projects + all approved expenses to build sidebar
                const ap = await Project.find({});
                const ae = await Expense.find({ status: 'Approved' }).select('project amount');
                const spMap = {};
                ae.forEach(e => {
                    if (e.project) {
                        const pid = e.project.toString();
                        spMap[pid] = (spMap[pid] || 0) + (parseFloat(e.amount) || 0);
                    }
                });
                return ap.map(p => {
                    const rawBudget = toRawAmount(p.budget, p.budgetUnit);
                    const spent = spMap[p._id.toString()] || 0;
                    const pct = rawBudget > 0 ? parseFloat(((spent / rawBudget) * 100).toFixed(1)) : 0;
                    return {
                        id: p._id,
                        name: p.title,
                        status: p.status,
                        budgetFormatted: formatCurrency(rawBudget),
                        spentFormatted: formatCurrency(spent),
                        percentage: pct
                    };
                }).sort((a, b) => b.percentage - a.percentage);
            } else {
                return projectUtilization.map(p => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                    budgetFormatted: p.budgetFormatted,
                    spentFormatted: p.spentFormatted,
                    percentage: p.percentage
                }));
            }
        })();

        // ── Return ──
        res.json({
            kpis,
            projectUtilization,
            categoryBreakdown,
            overrunAlerts,
            recentTransactions,
            pendingRequests,
            projectSummaryList,
            selectedProjectId
        });
    } catch (error) {
        console.error('Budget Dashboard Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getBudgetDashboard };

