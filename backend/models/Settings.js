const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Since there's only one settings document globally, we'll just store it
    companyInfo: {
        name: { type: String, default: "BuildCore Construction Ltd." },
        license: { type: String, default: "BC-8829-X" },
        address: { type: String, default: "123 Industrial Way, Suite 400, Seattle, WA" }
    },
    notifications: {
        lowStock: { type: Boolean, default: true },
        budgetOverrun: { type: Boolean, default: true },
        compliance: { type: Boolean, default: false }
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
