const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const projectController = require('../controllers/projectController');
const inventoryController = require('../controllers/inventoryController');
const dailyLogController = require('../controllers/dailyLogController');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure uploads directory exists
        const fs = require('fs');
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Routes
router.post('/upload', upload.array('plans', 10), projectController.uploadBlueprint);
router.post('/', projectController.createProject);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/:id/feed', upload.array('images', 10), projectController.addLiveFeedRecord);
router.post('/:id/tasks', projectController.addCriticalTask);
router.put('/:id/stats', projectController.updateProjectStats);
router.put('/:id/settings', projectController.updateProjectSettings);
router.get('/:id/blueprint-tasks', projectController.getBlueprintAndTasks);
router.post('/:id/blueprint-tasks', projectController.addBlueprintTask);
router.post('/:id/blueprints', upload.array('plans', 10), projectController.uploadProjectBlueprint);
router.get('/:id/inventory', inventoryController.getProjectInventory);
router.post('/:id/materials/delivery', upload.fields([
    { name: 'deliveryChallan', maxCount: 1 },
    { name: 'stackPhoto', maxCount: 1 }
]), inventoryController.logDelivery);
router.post('/:id/materials/usage', upload.fields([
    { name: 'usagePhoto', maxCount: 1 }
]), inventoryController.logUsage);

// Daily Logs Routes
router.get('/:id/daily-logs', dailyLogController.getProjectDailyLogs);
router.post('/:id/daily-logs', upload.array('gallery', 10), dailyLogController.createDailyLog);

module.exports = router;
