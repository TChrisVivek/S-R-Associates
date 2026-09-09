const axios = require('axios');
const FormData = require('form-data');
const logger = require('./utils/logger');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const BOT_API_KEY = process.env.BOT_API_KEY;

// Create a pre-configured Axios instance
const http = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        'X-Bot-Api-Key': BOT_API_KEY,
        'Content-Type': 'application/json'
    },
    timeout: 15000 // 15 seconds
});

// Response interceptor for logging
http.interceptors.response.use(
    (res) => res,
    (err) => {
        const status = err.response?.status || 'NO_RESPONSE';
        const message = err.response?.data?.message || err.message;
        logger.error(`API Error [${status}]: ${message}`);
        throw err;
    }
);

// ─── Project Discovery ────────────────────────────────────────────────────────

/**
 * Fetch all projects with their blocks from the backend.
 */
async function fetchProjects() {
    const res = await http.get('/api/bot/projects');
    return res.data;
}

// ─── Pending Queue ────────────────────────────────────────────────────────────

/**
 * Save a parsed entry to the pending approval queue.
 */
async function savePending(data) {
    const res = await http.post('/api/bot/pending', data);
    return res.data;
}

/**
 * Get all pending entries for today.
 */
async function getTodayPending() {
    const res = await http.get('/api/bot/pending/today');
    return res.data;
}

/**
 * Get all unapproved pending entries (including older ones).
 */
async function getAllPending() {
    const res = await http.get('/api/bot/pending/all');
    return res.data;
}

// ─── Approval / Rejection ─────────────────────────────────────────────────────

/**
 * Approve pending entries by IDs or batchId.
 */
async function approveEntries({ ids, batchId }) {
    const res = await http.post('/api/bot/approve', { ids, batchId });
    return res.data;
}

/**
 * Reject pending entries by IDs or batchId.
 */
async function rejectEntries({ ids, batchId }) {
    const res = await http.post('/api/bot/reject', { ids, batchId });
    return res.data;
}

/**
 * Assign a batchId to a set of pending entry IDs.
 */
async function assignBatch(ids, batchId) {
    const res = await http.post('/api/bot/assign-batch', { ids, batchId });
    return res.data;
}

// ─── File Upload ──────────────────────────────────────────────────────────────

/**
 * Upload a file (Buffer) to the backend.
 *
 * @param {Buffer} buffer - The file data
 * @param {string} filename - Original filename
 * @param {string} mimetype - MIME type
 * @returns {Promise<{ url: string, filename: string }>}
 */
async function uploadFile(buffer, filename, mimetype) {
    const form = new FormData();
    form.append('file', buffer, {
        filename,
        contentType: mimetype
    });

    const res = await axios.post(`${BACKEND_URL}/api/bot/upload`, form, {
        headers: {
            ...form.getHeaders(),
            'X-Bot-Api-Key': BOT_API_KEY
        },
        timeout: 30000, // 30s for file uploads
        maxContentLength: 25 * 1024 * 1024
    });

    return res.data;
}

module.exports = {
    fetchProjects,
    savePending,
    getTodayPending,
    getAllPending,
    approveEntries,
    rejectEntries,
    assignBatch,
    uploadFile,
    fetchLabourRoles
};

/**
 * Fetch the custom labour role shortcodes defined in the portal Settings.
 * Returns an array of { shortCode, roleName } objects.
 * Used by ollamaExtractor at startup to extend LABOUR_ROLE_MAP.
 */
async function fetchLabourRoles() {
    try {
        const res = await http.get('/api/bot/settings/labour-roles');
        return res.data.labourRoles || [];
    } catch (err) {
        logger.warn(`Could not fetch custom labour roles from backend: ${err.message}. Using defaults.`);
        return [];
    }
}

