const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        // E.g., 'LOGGED_IN', 'CREATED_PROJECT', 'LOGGED_DELIVERY', 'UPLOADED_DOCUMENT'
    },
    entityType: {
        type: String,
        enum: ['Project', 'Material', 'DailyLog', 'Document', 'System', 'Personnel', 'User'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // Optional, some system actions don't have an entity
    },
    details: {
        type: String,
        required: true // 'Added 500 Bags of Cement to ABC Site'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
