const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    company: {
        type: String,
        required: true
    },
    trade: {
        type: String,
        required: true
    },
    contactPerson: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        enum: ['wrench', 'zap', 'ruler'],
        default: 'wrench'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Vendor', vendorSchema);
