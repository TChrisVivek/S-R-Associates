const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Since there's only one settings document globally, we'll just store it
    companyInfo: {
        name: { type: String, default: "BuildCore Construction Ltd." },
        license: { type: String, default: "BC-8829-X" },
        address: { type: String, default: "123 Industrial Way, Suite 400, Seattle, WA" },
        logoUrl: { type: String, default: "" }
    },
    notifications: {
        lowStock: { type: Boolean, default: true },
        budgetOverrun: { type: Boolean, default: true },
        compliance: { type: Boolean, default: false }
    },
    // Labour role shortcode definitions — admin can add/edit/remove from Settings UI
    // Bot reads this list at startup and merges into its LABOUR_ROLE_MAP
    labourRoles: {
        type: [{
            shortCode: { type: String, required: true }, // e.g. "Fc"
            roleName:  { type: String, required: true }  // e.g. "Female Helper"
        }],
        default: [
            { shortCode: 'Mason',    roleName: 'Mason' },
            { shortCode: 'Helper',   roleName: 'Male Helper' },
            { shortCode: 'Help',     roleName: 'Male Helper' },
            { shortCode: 'Coolie',   roleName: 'Male Helper' },
            { shortCode: 'MC',       roleName: 'Male Helper' },
            { shortCode: 'Fc',       roleName: 'Female Helper' },
            { shortCode: 'FC',       roleName: 'Female Helper' },
            { shortCode: 'Carpenter',roleName: 'Carpenter' },
            { shortCode: 'SF',       roleName: 'Steel Fixer' },
            { shortCode: 'Electrician', roleName: 'Electrician' },
            { shortCode: 'Plumber',  roleName: 'Plumber' },
            { shortCode: 'Supervisor', roleName: 'Supervisor' },
            { shortCode: 'JCB',      roleName: 'Machine Operator' },
        ]
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
