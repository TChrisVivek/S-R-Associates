const mongoose = require('mongoose');

const personnelAttendanceSchema = new mongoose.Schema({
    personnel_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Personnel',
        required: true
    },
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: false // Null if 'Off Duty' or unassigned
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['On Site', 'Remote', 'Off Duty', 'On Leave'],
        required: true
    }
}, {
    timestamps: true
});

// Create a compound index so a person only has one attendance record per day
// (personnel_id + date, not per-project — a person has one status per day)
personnelAttendanceSchema.index({ personnel_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PersonnelAttendance', personnelAttendanceSchema);
