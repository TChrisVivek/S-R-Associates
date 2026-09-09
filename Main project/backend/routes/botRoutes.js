const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyBotApiKey } = require('../middleware/botAuthMiddleware');
const botController = require('../controllers/botController');

// ─── Multer config for bot file uploads ───────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `bot-${Date.now()}-${Math.round(Math.random() * 1E6)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max (WhatsApp file limit)
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
    }
});

// All bot routes require API key auth
router.use(verifyBotApiKey);

// ─── Pending Queue ────────────────────────────────────────────────────────────
router.post('/pending', botController.savePending);
router.get('/pending/today', botController.getTodayPending);
router.get('/pending/all', botController.getAllPending);

// ─── Approval / Rejection ─────────────────────────────────────────────────────
router.post('/approve', botController.approveEntries);
router.post('/reject', botController.rejectEntries);
router.post('/assign-batch', botController.assignBatch);

// ─── Project Discovery ────────────────────────────────────────────────────────
router.get('/projects', botController.listProjects);

// ─── Settings (bot-accessible) ────────────────────────────────────────────────
// Returns labour role shortcode definitions so the bot can load them at startup
router.get('/settings/labour-roles', botController.getLabourRoles);

// ─── File Upload ──────────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), botController.uploadFile);

module.exports = router;
