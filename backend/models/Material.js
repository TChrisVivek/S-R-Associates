const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    type: { type: String, enum: ['delivery', 'usage'], required: true },
    quantity: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    // Delivery fields
    supplier: String,
    totalCost: Number,
    deliveryChallanUrl: String,
    stackPhotoUrl: String,
    // Usage fields
    locationPurpose: String,
    usagePhotoUrl: String
});

const materialSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    inflow: { type: Number, default: 0 },
    outflow: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    iconType: { type: String, enum: ['bag', 'grid', 'layers', 'brick'], default: 'box' },
    logs: [logSchema]
}, {
    timestamps: true
});

// Auto-calculate status based on balance
materialSchema.virtual('status').get(function () {
    // 10% of total inflow as a simple low stock threshold, or hardcoded 100 for now
    if (this.balance <= 0) return 'OUT OF STOCK';
    if (this.inflow > 0 && this.balance < (this.inflow * 0.1)) return 'LOW STOCK';
    if (this.balance < 50) return 'LOW STOCK';
    return 'OPTIMAL';
});

// Ensure virtuals are included in JSON/Object conversions
materialSchema.set('toJSON', { virtuals: true });
materialSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Material', materialSchema);
