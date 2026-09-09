const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, updateExpenseStatus, editExpense, deleteExpense } = require('../controllers/expenseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(verifyToken);

// All authenticated users can get expenses and submit them
router.get('/', getExpenses);
router.post('/', createExpense);

// Only Admins can approve/reject, edit, and delete
router.put('/:id/status', checkRole('Admin'), updateExpenseStatus);
router.put('/:id', checkRole('Admin'), editExpense);
router.delete('/:id', checkRole('Admin'), deleteExpense);

module.exports = router;

