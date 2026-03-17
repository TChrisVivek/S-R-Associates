const express = require('express');
const router = express.Router();
const { getExpenses, createExpense, updateExpenseStatus, editExpense } = require('../controllers/expenseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(verifyToken);

// All authenticated users can get expenses and submit them
router.get('/', getExpenses);
router.post('/', createExpense);

// Only Admins (or Site Managers if desired, setting Admin for now) can approve/reject and edit
router.put('/:id/status', checkRole('Admin'), updateExpenseStatus);
router.put('/:id', checkRole('Admin'), editExpense);

module.exports = router;
