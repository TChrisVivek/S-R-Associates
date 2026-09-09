const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/google', authController.googleAuth);
router.get('/me', authController.getMe);

module.exports = router;
