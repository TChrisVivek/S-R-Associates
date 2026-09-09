const mongoose = require('mongoose');

const pendingUpdateSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    type: {
        type: String,
        enum: ['daily_log', 'delivery', 'expense', 'clearance'],
        required: true
    },
    data: {
        // Daily log fields
        blockName:       String,
        laborers:        Number,
        labourBreakdown: [{ role: String, count: Number }],  // e.g. [{role:"Mason",count:1},{role:"Female Helper",count:1}]
        notes:           String,
        weatherCondition: String,
        day:             String,
        taskCompleted:   String,
        // Clearance fields (stored as daily_log)
        clearanceType:   String,  // e.g. "Erection Clearance"
        clearanceStatus: String,  // e.g. "Completed", "Cleared"
        // Delivery fields
        materialName:    String,
        unit:            String,
        quantity:        Number,
        supplier:        String,
        totalCost:       Number,
        // Expense fields
        amount:          Number,
        category:        String,
        description:     String
    },
    attachments: [{
        type: String // URLs of uploaded PDFs/images
    }],
    rawMessage: {
        type: String,
        required: true
    },
    senderName: {
        type: String,
        default: 'Unknown'
    },
    senderPhone: {
        type: String
    },
    groupName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    batchId: {
        type: String // Groups entries for one EOD approval message (e.g., "MM-20260610")
    },
    approvedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for fast EOD queries: get today's pending entries
pendingUpdateSchema.index({ status: 1, createdAt: -1 });
pendingUpdateSchema.index({ batchId: 1 });
pendingUpdateSchema.index({ project_id: 1, status: 1 });

module.exports = mongoose.model('PendingUpdate', pendingUpdateSchema);
