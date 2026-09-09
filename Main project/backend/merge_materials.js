require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Material = require('./models/Material');

async function run() {
    await connectDB();

    try {
        const materials = await Material.find();

        // Group by project_id and lowercase name
        const grouped = {};
        for (const mat of materials) {
            const key = `${mat.project_id}_${mat.name.toLowerCase()}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(mat);
        }

        let mergedCount = 0;

        for (const key in grouped) {
            if (grouped[key].length > 1) {
                const items = grouped[key];
                // Sort to keep the one with the most logs or oldest as primary
                items.sort((a, b) => b.logs.length - a.logs.length);

                const primary = items[0];

                for (let i = 1; i < items.length; i++) {
                    const dup = items[i];
                    // Merge inflow, outflow, balance
                    primary.inflow += dup.inflow;
                    primary.outflow += dup.outflow;
                    primary.balance += dup.balance;

                    // Merge logs
                    primary.logs.push(...dup.logs);

                    // Delete duplicate
                    await Material.findByIdAndDelete(dup._id);
                    mergedCount++;
                }

                // Recalculate average unit price based on delivery logs
                let totalCost = 0;
                let totalQty = 0;
                for (const log of primary.logs) {
                    if (log.type === 'delivery') {
                        totalCost += log.totalCost || 0;
                        totalQty += log.quantity || 0;
                    }
                }
                if (totalQty > 0) {
                    primary.unitPrice = totalCost / totalQty;
                }

                await primary.save();
                console.log(`Merged duplicates into ${primary.name}`);
            }
        }

        console.log(`Deduplication complete. Merged ${mergedCount} duplicate items.`);
    } catch (err) {
        console.error(err);
    }

    process.exit(0);
}

run();
