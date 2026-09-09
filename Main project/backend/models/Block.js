const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Not Started', 'Planning', 'In Progress', 'Completed'],
        default: 'Not Started'
    },
    blueprints: [{
        url: String,         // Thumbnail / rendered image URL
        originalUrl: String, // Original PDF URL
        name: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for fast lookup by project
blockSchema.index({ project_id: 1, order: 1 });

module.exports = mongoose.model('Block', blockSchema);
