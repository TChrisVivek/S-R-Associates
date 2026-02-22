const express = require('express');
const router = express.Router();
const pinController = require('../controllers/pinController');

router.post('/', pinController.createPin);
router.get('/:blueprint_id', pinController.getPins);
router.post('/:id/comments', pinController.addComment);
router.patch('/:id/status', pinController.updatePinStatus);

module.exports = router;
