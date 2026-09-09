const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { checkRole } = require('../middleware/roleMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, checkRole('Admin'), budgetController.getBudgetDashboard);

module.exports = router;
