const express = require('express');
const router = express.Router();
// Multer has been removed as file uploads are now handled directly from frontend to Cloudinary

// Routes
const projectController = require('../controllers/projectController');
const inventoryController = require('../controllers/inventoryController');
const dailyLogController = require('../controllers/dailyLogController');
const personnelController = require('../controllers/personnelController');

// Routes
router.post('/upload', projectController.uploadBlueprint);
router.post('/', projectController.createProject);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.delete('/:id', projectController.deleteProject);
router.post('/:id/feed', projectController.addLiveFeedRecord);
router.post('/:id/tasks', projectController.addCriticalTask);
router.delete('/:id/tasks/:taskId', projectController.deleteCriticalTask);
router.put('/:id/stats', projectController.updateProjectStats);
router.put('/:id/settings', projectController.updateProjectSettings);
router.get('/:id/blueprint-tasks', projectController.getBlueprintAndTasks);
router.post('/:id/blueprint-tasks', projectController.addBlueprintTask);
router.delete('/:id/blueprint-tasks/:taskId', projectController.deleteBlueprintTask);
router.post('/:id/blueprints', projectController.uploadProjectBlueprint);
router.delete('/:id/blueprints/:blueprintId', projectController.deleteProjectBlueprint);
router.get('/:id/inventory', inventoryController.getProjectInventory);
router.get('/:id/personnel', personnelController.getProjectPersonnel);
router.post('/:id/materials/delivery', inventoryController.logDelivery);
router.post('/:id/materials/usage', inventoryController.logUsage);

// Daily Logs Routes
router.get('/:id/daily-logs', dailyLogController.getProjectDailyLogs);
router.post('/:id/daily-logs', dailyLogController.createDailyLog);

module.exports = router;
