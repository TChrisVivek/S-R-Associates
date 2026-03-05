const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');
const { checkRole } = require('../middleware/roleMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.getPersonnel);
router.get('/attendance-report', verifyToken, checkRole('Admin', 'Site Manager', 'Client'), personnelController.getAttendanceReport);
router.post('/', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.addPersonnel);
router.put('/:id', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.updatePersonnel);
router.patch('/:id/status', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.updatePersonnelStatus);
router.delete('/:id', verifyToken, checkRole('Admin', 'Site Manager'), personnelController.deletePersonnel);

module.exports = router;
