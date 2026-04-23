const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        enum: [
            'Vendor', 'Labor', 'Equipment', 'Material', 'Miscellaneous', 'Extension',
            'Food Allowance', 'Travel Allowance', 'Fuel Allowance', 'Bonus', 'GST'
        ],
        default: 'Vendor',
        required: true
    },

    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    invoiceNumber: {
        type: String,
        trim: true
    },
    receipt: {
        type: String,
        trim: true
    },
    expenseDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
