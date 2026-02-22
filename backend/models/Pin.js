const mongoose = require('mongoose');

const pinSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    blueprint_id: {
        type: mongoose.Schema.Types.ObjectId, // Assuming blueprints are sub-docs or just IDs
        required: true
    },
    title: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Ready for Inspection', 'Closed'],
        default: 'Open'
    },
    x_cord: {
        type: Number,
        required: true
    },
    y_cord: {
        type: Number,
        required: true
    },
    comments: [{
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    photos: [{
        url: String,
        caption: String,
        uploaded_at: {
            type: Date,
            default: Date.now
        }
    }],
    history: [{
        changed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        field: String,
        old_value: String,
        new_value: String,
        date: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Index for efficient filtering
pinSchema.index({ project_id: 1, status: 1 });

module.exports = mongoose.model('Pin', pinSchema);
