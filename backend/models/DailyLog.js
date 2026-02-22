const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
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
