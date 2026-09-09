const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

const debugBudgets = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const projects = await Project.find({}, 'title budget budgetUnit');
        console.log("Projects Found:", projects.length);

        let total = 0;
        projects.forEach(p => {
            let amount = parseFloat(p.budget) || 0;
            const unit = p.budgetUnit ? p.budgetUnit.toLowerCase() : '';

            let amountInRupees = 0;

            if (unit.includes('crore')) {
                amountInRupees = amount * 10000000;
            } else if (unit.includes('lakh')) {
                amountInRupees = amount * 100000;
            } else if (unit.includes('thousand')) {
                amountInRupees = amount * 1000;
            } else {
                amountInRupees = amount;
            }

            console.log(`Project: ${p.title} | Budget: ${p.budget} ${p.budgetUnit} -> ₹${amountInRupees.toLocaleString('en-IN')}`);
            total += amountInRupees;
        });

        const formatCurrency = (amount) => {
            if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
            if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
            return `₹${amount.toLocaleString('en-IN')}`;
        };

        console.log("--------------------------------");
        console.log(`Corrected Total: ${formatCurrency(total)}`);

        mongoose.connection.close();
    } catch (error) {
        console.error(error);
    }
};

debugBudgets();
