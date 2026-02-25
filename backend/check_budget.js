const mongoose = require('mongoose');
const Material = require('./models/Material');
const Project = require('./models/Project');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("Connected to DB\n");

    const projects = await Project.find({}, 'title budget budgetUnit');
    console.log("=== ALL PROJECTS ===");
    projects.forEach(p => {
        console.log("ID: " + p._id + " | Title: " + p.title + " | Budget: " + p.budget + " " + p.budgetUnit);
    });

    for (const p of projects) {
        const materials = await Material.find({ project_id: p._id });
        console.log("\n=== Materials for " + p.title + " (" + p._id + ") === Found: " + materials.length);

        let totalSpend = 0;
        materials.forEach(m => {
            console.log("  Material: " + m.name + " | Logs count: " + m.logs.length);
            m.logs.forEach(l => {
                if (l.type === 'delivery') {
                    console.log("    DELIVERY -> qty: " + l.quantity + " | totalCost: " + l.totalCost + " | supplier: " + l.supplier);
                    totalSpend += (l.totalCost || 0);
                }
            });
        });

        console.log("  >>> TOTAL MATERIAL SPEND: " + totalSpend);

        if (p.budget && p.budget > 0) {
            var mult = 1;
            var u = (p.budgetUnit || 'Lakhs').toLowerCase();
            if (u === 'crores') mult = 10000000;
            else if (u === 'lakhs') mult = 100000;
            else if (u === 'thousands') mult = 1000;

            var raw = p.budget * mult;
            var pct = (totalSpend / raw) * 100;
            console.log("  >>> RAW BUDGET (rupees): " + raw + " | BURN RATE: " + pct.toFixed(2) + "%");
        } else {
            console.log("  >>> NO BUDGET SET for this project");
        }
    }

    await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
