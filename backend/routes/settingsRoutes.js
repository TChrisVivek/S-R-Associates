const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { checkRole } = require('../middleware/roleMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/logo', settingsController.getLogo);
router.get('/', verifyToken, checkRole('Admin'), settingsController.getSettings);
router.put('/', verifyToken, checkRole('Admin'), settingsController.updateSettings);

module.exports = router;
