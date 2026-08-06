const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams gives access to :projectId from parent router

const blockController = require('../controllers/blockController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// ─── Block CRUD ───────────────────────────────────────────────────────────────
router.get('/', verifyToken, blockController.getProjectBlocks);
router.post('/', verifyToken, checkRole('Admin', 'Site Manager'), blockController.createBlock);
router.get('/:blockId', verifyToken, blockController.getBlockById);
router.put('/:blockId', verifyToken, checkRole('Admin', 'Site Manager'), blockController.updateBlock);
router.delete('/:blockId', verifyToken, checkRole('Admin', 'Site Manager'), blockController.deleteBlock);

// ─── Blueprints (Block-scoped) ────────────────────────────────────────────────
router.post('/:blockId/blueprints', verifyToken, checkRole('Admin', 'Site Manager'), blockController.uploadBlockBlueprint);
router.delete('/:blockId/blueprints/:blueprintId', verifyToken, checkRole('Admin', 'Site Manager'), blockController.deleteBlockBlueprint);

// ─── Blueprint Tasks / Pins (Block-scoped) ────────────────────────────────────
router.get('/:blockId/blueprint-tasks', verifyToken, blockController.getBlockBlueprintAndTasks);
router.post('/:blockId/blueprint-tasks', verifyToken, checkRole('Admin', 'Site Manager'), blockController.addBlockBlueprintTask);
router.delete('/:blockId/blueprint-tasks/:taskId', verifyToken, checkRole('Admin', 'Site Manager'), blockController.deleteBlockBlueprintTask);

// ─── Daily Logs (Block-scoped) ────────────────────────────────────────────────
router.get('/:blockId/daily-logs', verifyToken, blockController.getBlockDailyLogs);
router.post('/:blockId/daily-logs', verifyToken, checkRole('Admin', 'Site Manager', 'Contractor'), blockController.createBlockDailyLog);

// ─── Material Inventory (Block-scoped) ────────────────────────────────────────
router.get('/:blockId/inventory', verifyToken, blockController.getBlockInventory);
router.post('/:blockId/materials/delivery', verifyToken, checkRole('Admin', 'Site Manager'), blockController.logBlockDelivery);
router.post('/:blockId/materials/usage', verifyToken, checkRole('Admin', 'Site Manager', 'Contractor'), blockController.logBlockUsage);
router.patch('/:blockId/materials/:materialId/threshold', verifyToken, checkRole('Admin', 'Site Manager'), blockController.updateBlockMaterialThreshold);

module.exports = router;
