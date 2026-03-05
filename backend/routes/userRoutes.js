const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// GET /api/users?role=Manager
router.get('/', userController.getUsers);

// PUT /api/users/:id/role
router.put('/:id/role', userController.updateRole);

// PUT /api/users/:id/profile
router.put('/:id/profile', userController.updateProfile);

// GET /api/users/:id/activities
router.get('/:id/activities', userController.getActivities);

// POST /api/users/invite-client (Admin only)
router.post('/invite-client', verifyToken, checkRole('Admin'), userController.inviteClient);

module.exports = router;
