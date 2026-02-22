const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    client: String,
    address: String,
    siteSize: Number,
    floors: Number,
    type: {
        type: String,
        enum: ['Residential', 'Commercial', 'Renovation'],
        default: 'Residential'
    },
    budget: Number,
    budgetUnit: String,
    startDate: Date,
    endDate: Date,
    manager: String, // You might want to link this to a User ObjectId later
    contractor: String,
    status: {
        type: String,
        enum: ['Planning', 'In Progress', 'On Track', 'Delayed', 'Completed'],
        default: 'Planning'
    },
    image: String, // URL to project image
    blueprints: [{
        url: String, // Thumbnail URL
        originalUrl: String, // Original PDF URL
        name: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    stats: {
        taskCompleted: { type: Number, default: 0 },
        budgetSpent: { type: Number, default: 0 }
    },
    liveFeed: [{
        title: String,
        location: String,
        image: String,
        createdAt: { type: Date, default: Date.now }
    }],
    criticalTasks: [{
        title: String,
        desc: String,
        status: { type: String, enum: ['urgent', 'warning', 'info'], default: 'info' },
        icon: { type: String, enum: ['triangle', 'clipboard', 'file'], default: 'file' },
        assignee: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

// Index for fast lookup by user
projectSchema.index({ "team_members.user_id": 1 });

module.exports = mongoose.model('Project', projectSchema);
