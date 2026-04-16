const Expense = require('../models/Expense');
const Project = require('../models/Project');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
    try {
        const query = {};
        if (req.query.project) {
            query.project = req.query.project;
        }

        const expenses = await Expense.find(query)
            .populate('project', 'title _id')
            .populate('submittedBy', 'username email _id')
            .sort({ createdAt: -1 });

        res.status(200).json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Server error fetching expenses', error: error.message });
    }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
    try {
        const { title, description, amount, category, project, status, invoiceNumber, receipt, expenseDate } = req.body;

        // Validation
        if (!title || !amount || !category || !project) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Verify project exists
        const projectExists = await Project.findById(project);
        if (!projectExists) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const expense = new Expense({
            title,
            description,
            amount,
            category,
            project,
            submittedBy: req.user.userId,
            status: status || 'Pending', // Let Admins bypass Pending state if they create it directly
            invoiceNumber,
            receipt,
            expenseDate: expenseDate || Date.now()
        });

        const createdExpense = await expense.save();

        res.status(201).json(createdExpense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Server error creating expense', error: error.message });
    }
};

// @desc    Update expense status (Approve/Reject)
// @route   PUT /api/expenses/:id/status
// @access  Private (Admin only)
const updateExpenseStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        expense.status = status;
        const updatedExpense = await expense.save();

        res.status(200).json(updatedExpense);
    } catch (error) {
        console.error('Error updating expense status:', error);
        res.status(500).json({ message: 'Server error updating expense status', error: error.message });
    }
};

// @desc    Edit expense details
// @route   PUT /api/expenses/:id
// @access  Private (Admin only)
const editExpense = async (req, res) => {
    try {
        const { title, description, amount, category, project, invoiceNumber, receipt, expenseDate } = req.body;

        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Only allow edits on Pending expenses (or optionally Approved if Admins need to correct mistakes)
        // Sticking to Admin-only route protects this, but let's allow Admins to edit even approved ones if needed, 
        // though typically accounting locks approved ones. For now, we'll allow it since it's an Admin route.

        if (title) expense.title = title;
        if (description !== undefined) expense.description = description;
        if (amount) expense.amount = amount;
        if (category) expense.category = category;
        if (project) {
            // Verify new project exists if changed
            const projectExists = await Project.findById(project);
            if (!projectExists) return res.status(404).json({ message: 'Project not found' });
            expense.project = project;
        }
        if (invoiceNumber !== undefined) expense.invoiceNumber = invoiceNumber;
        if (receipt !== undefined) expense.receipt = receipt;
        if (expenseDate) expense.expenseDate = expenseDate;

        const updatedExpense = await expense.save();
        res.status(200).json(updatedExpense);

    } catch (error) {
        console.error('Error editing expense:', error);
        res.status(500).json({ message: 'Server error editing expense', error: error.message });
    }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin only)
const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        await expense.deleteOne();
        res.status(200).json({ message: 'Expense deleted successfully', id: req.params.id });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Server error deleting expense', error: error.message });
    }
};

module.exports = {
    getExpenses,
    createExpense,
    updateExpenseStatus,
    editExpense,
    deleteExpense
};
