const Project = require('../models/Project');

const getBudgetDashboard = async (req, res) => {
    try {
        const projects = await Project.find({});

        // 1. Calculate KPIs
        const totalBudget = projects.reduce((sum, p) => {
            let amount = parseFloat(p.budget) || 0;
            const unit = p.budgetUnit ? p.budgetUnit.toLowerCase() : '';

            if (unit.includes('crore')) {
                amount *= 10000000;
            } else if (unit.includes('lakh')) {
                amount *= 100000;
            } else if (unit.includes('thousand')) {
                amount *= 1000;
            }
            // If no unit or 'Rupees', assume raw value (or handle as needed)

            return sum + amount;
        }, 0);

        // Format to Cr/Lakhs
        const formatCurrency = (amount) => {
            if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
            if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
            return `₹${amount.toLocaleString('en-IN')}`;
        };

        const kpis = {
            totalAllocated: {
                value: formatCurrency(totalBudget),
                trend: "Based on active projects"
            },
            actualSpent: {
                value: "₹0",
                subtext: "0% of annual budget"
            },
            budgetOverruns: {
                value: "₹0",
                subtext: "No active alerts"
            },
            pendingApprovals: {
                value: "0",
                subtext: "All caught up"
            }
        };

        // 2. Prepare Chart Data (Allocated by Month)
        // Group projects by Start Date Month
        const monthlyData = {};
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Initialize current year months
        months.forEach(m => monthlyData[m] = 0);

        projects.forEach(p => {
            if (p.startDate) {
                const date = new Date(p.startDate);
                const monthName = months[date.getMonth()];

                // Calculate amount in Crores for consistency
                let amountInCrores = parseFloat(p.budget) || 0;
                const unit = p.budgetUnit ? p.budgetUnit.toLowerCase() : '';

                if (unit.includes('lakh')) {
                    amountInCrores /= 100; // 50 Lakhs = 0.5 Cr
                } else if (unit.includes('crore')) {
                    // already in Crores
                } else if (unit.includes('thousand')) {
                    amountInCrores /= 10000;
                } else {
                    // Assume raw rupees, convert to Cr
                    amountInCrores /= 10000000;
                }

                monthlyData[monthName] += amountInCrores;
            }
        });

        const chartData = months.map(m => ({
            name: m,
            allocated: parseFloat(monthlyData[m].toFixed(2)),
            spent: 0
        }));

        // 3. Return Clean Data structure
        const dashboardData = {
            kpis,
            chartData,
            overrunAlerts: [],
            recentTransactions: [],
            pendingRequests: []
        };

        res.json(dashboardData);
    } catch (error) {
        console.error("Budget Dashboard Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getBudgetDashboard };
