const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: false // Optional for Google OAuth users
    },
    role: {
        type: String,
        enum: ['Admin', 'Site Manager', 'Contractor', 'Client', 'Pending'],
        default: 'Pending'
    },
    phone: {
        type: String
    },
    profile_image: {
        type: String
    },
    assigned_projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    skills: [String],
    last_active: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
