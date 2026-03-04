const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');
const { checkRole } = require('../middleware/roleMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.getPersonnel);
router.post('/', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.addPersonnel);
router.put('/:id', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.updatePersonnel);
router.delete('/:id', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.deletePersonnel);

module.exports = router;
