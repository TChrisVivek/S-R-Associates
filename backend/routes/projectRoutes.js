const express = require('express');
const router = express.Router();
// Multer has been removed as file uploads are now handled directly from frontend to Cloudinary

// Routes
const projectController = require('../controllers/projectController');
const inventoryController = require('../controllers/inventoryController');
const dailyLogController = require('../controllers/dailyLogController');
const personnelController = require('../controllers/personnelController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// Routes
// Routes protected by verified token
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
router.get('/:id/blueprint-tasks', verifyToken, projectController.getBlueprintAndTasks);
router.post('/:id/blueprint-tasks', verifyToken, checkRole('Admin', 'Site Manager'), projectController.addBlueprintTask);
router.delete('/:id/blueprint-tasks/:taskId', verifyToken, checkRole('Admin', 'Site Manager'), projectController.deleteBlueprintTask);
router.post('/:id/blueprints', verifyToken, checkRole('Admin', 'Site Manager'), projectController.uploadProjectBlueprint);
router.delete('/:id/blueprints/:blueprintId', verifyToken, checkRole('Admin', 'Site Manager'), projectController.deleteProjectBlueprint);
router.get('/:id/inventory', verifyToken, inventoryController.getProjectInventory);
router.get('/:id/personnel', verifyToken, personnelController.getProjectPersonnel);
router.post('/:id/materials/delivery', verifyToken, checkRole('Admin', 'Site Manager'), inventoryController.logDelivery);
router.post('/:id/materials/usage', verifyToken, checkRole('Admin', 'Site Manager', 'Contractor'), inventoryController.logUsage);

// Daily Logs Routes
router.get('/:id/daily-logs', verifyToken, dailyLogController.getProjectDailyLogs);
router.post('/:id/daily-logs', verifyToken, checkRole('Admin', 'Site Manager', 'Contractor'), dailyLogController.createDailyLog);

module.exports = router;
