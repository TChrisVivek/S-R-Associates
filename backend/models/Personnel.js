const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    site: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['On Site', 'Remote', 'Off Duty'],
        default: 'On Site'
    },
    avatar: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Personnel', personnelSchema);
