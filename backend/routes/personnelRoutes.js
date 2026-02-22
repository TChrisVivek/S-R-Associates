const express = require('express');
const router = express.Router();
const personnelController = require('../controllers/personnelController');

router.get('/', personnelController.getPersonnel);
router.post('/', personnelController.addPersonnel);
router.delete('/:id', personnelController.deletePersonnel);

module.exports = router;
