const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users?role=Manager
router.get('/', userController.getUsers);

// PUT /api/users/:id/role
router.put('/:id/role', userController.updateRole);

// PUT /api/users/:id/profile
router.put('/:id/profile', userController.updateProfile);

module.exports = router;
