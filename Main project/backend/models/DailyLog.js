const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    block_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Block',
        required: false // Optional for backward compat; populated by migration
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    day: {
        type: String,
        required: true
    },
    weather: {
        condition: { type: String, required: true }
    },
    laborers: {
        type: Number,
        required: true
    },
    labourBreakdown: [{
        role:  { type: String },   // e.g. "Mason", "Male Helper", "Female Helper"
        count: { type: Number }    // e.g. 1, 3, 1
    }],
    clearanceType: {
        type: String              // e.g. "Erection Clearance" — set if entry is a clearance
    },
    clearanceStatus: {
        type: String              // e.g. "Completed", "Cleared"
    },
    notes: {
        type: String,
        required: true
    },
    gallery: [{
        type: String // URLs or paths to uploaded images
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('DailyLog', dailyLogSchema);
