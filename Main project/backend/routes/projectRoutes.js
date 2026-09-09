const express = require('express');
const router = express.Router();

// Controllers
const projectController = require('../controllers/projectController');
const personnelController = require('../controllers/personnelController');
const blockController = require('../controllers/blockController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// Block sub-router (handles /api/projects/:id/blocks/... routes)
const blockRoutes = require('./blockRoutes');
router.use('/:projectId/blocks', blockRoutes);

// ─── Project-level routes ─────────────────────────────────────────────────────
router.post('/upload', verifyToken, checkRole('Admin', 'Site Manager'), projectController.uploadBlueprint);
router.post('/', verifyToken, checkRole('Admin', 'Site Manager'), projectController.createProject);
router.get('/', verifyToken, projectController.getAllProjects);
router.get('/:id', verifyToken, projectController.getProjectById);
router.delete('/:id', verifyToken, checkRole('Admin', 'Site Manager'), projectController.deleteProject);
router.post('/:id/feed', verifyToken, projectController.addLiveFeedRecord);
router.post('/:id/tasks', verifyToken, checkRole('Admin', 'Site Manager'), projectController.addCriticalTask);
router.delete('/:id/tasks/:taskId', verifyToken, checkRole('Admin', 'Site Manager'), projectController.deleteCriticalTask);
router.put('/:id/stats', verifyToken, checkRole('Admin', 'Site Manager'), projectController.updateProjectStats);
router.put('/:id/settings', verifyToken, checkRole('Admin', 'Site Manager'), projectController.updateProjectSettings);
router.put('/:id/assign-personnel', verifyToken, checkRole('Admin', 'Site Manager'), projectController.assignPersonnel);
router.get('/:id/personnel', verifyToken, personnelController.getProjectPersonnel);

// ─── Project-level Inventory (shared across all blocks) ───────────────────────
router.get('/:projectId/inventory', verifyToken, blockController.getProjectInventory);
router.post('/:projectId/materials/delivery', verifyToken, checkRole('Admin', 'Site Manager'), blockController.logProjectDelivery);
router.post('/:projectId/materials/usage', verifyToken, checkRole('Admin', 'Site Manager', 'Contractor'), blockController.logProjectUsage);
router.patch('/:projectId/materials/:materialId/threshold', verifyToken, checkRole('Admin', 'Site Manager'), blockController.updateProjectMaterialThreshold);

module.exports = router;
