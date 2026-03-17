const Project = require('../models/Project');
const Expense = require('../models/Expense');

const getBudgetDashboard = async (req, res) => {
    try {
        const projects = await Project.find({});

        // ── Helper: convert budget to raw rupees ──
        const toRawAmount = (budget, budgetUnit) => {
            let amount = parseFloat(budget) || 0;
            const unit = budgetUnit ? budgetUnit.toLowerCase() : '';
            if (unit.includes('crore')) amount *= 10000000;
            else if (unit.includes('lakh')) amount *= 100000;
            else if (unit.includes('thousand')) amount *= 1000;
            return amount;
        };

        // ── Helper: format currency ──
        const formatCurrency = (amount) => {
            if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
            if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
            return `₹${amount.toLocaleString('en-IN')}`;
        };

        // ── 1. Total Budget ──
        const totalBudget = projects.reduce((sum, p) => sum + toRawAmount(p.budget, p.budgetUnit), 0);

        // ── 2. Fetch Expenses (with submittedBy populated!) ──
        const allExpenses = await Expense.find()
            .populate('project', 'title budget budgetUnit')
            .populate('submittedBy', 'username');

        const approvedExpenses = allExpenses.filter(e => e.status === 'Approved');
        const pendingExpenses = allExpenses.filter(e => e.status === 'Pending');
        const totalSpent = approvedExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const spentPercentage = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;

        // ── 3. Daily average spend ──
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

        // ── 4. Project Budget Utilization ──
        // First, aggregate spending per project from approved expenses
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
        }).sort((a, b) => b.percentage - a.percentage); // highest utilization first

        // ── 5. Category Breakdown ──
        const categoryTotals = {};
        approvedExpenses.forEach(e => {
            const cat = e.category || 'Miscellaneous';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
        });

        const categoryBreakdown = Object.entries(categoryTotals).map(([name, value]) => ({
            name,
            value
        })).sort((a, b) => b.value - a.value);

        // ── 6. Overruns ──
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

        // ── 7. KPIs ──
        const kpis = {
            totalAllocated: {
                value: formatCurrency(totalBudget),
                trend: `${projects.length} active projects`
            },
            actualSpent: {
                value: formatCurrency(totalSpent),
                subtext: `${spentPercentage}% of total budget`,
                dailyAvg: dailyAvgSpend
            },
            budgetOverruns: {
                value: formatCurrency(totalOverrunAmount),
                subtext: overrunAlerts.length > 0 ? `${overrunAlerts.length} active alerts` : "All projects within limit"
            },
            pendingApprovals: {
                value: pendingExpenses.length.toString(),
                subtext: pendingExpenses.length > 0 ? "Requires review" : "None requires immediate action"
            }
        };

        // ── 8. Recent Transactions (enhanced) ──
        const recentTransactions = allExpenses
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 8)
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

        // ── 9. Pending Requests ──
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

        // ── Return ──
        res.json({
            kpis,
            projectUtilization,
            categoryBreakdown,
            overrunAlerts,
            recentTransactions,
            pendingRequests
        });
    } catch (error) {
        console.error("Budget Dashboard Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getBudgetDashboard };
