const cron = require('node-cron');
const logger = require('./utils/logger');
const api = require('./apiClient');
const { registerSession } = require('./adminApproval');

const EOD_HOUR = parseInt(process.env.EOD_SUMMARY_HOUR) || 21;
const EOD_MINUTE = parseInt(process.env.EOD_SUMMARY_MINUTE) || 0;

// Test mode: send approval summary after a short delay instead of waiting for EOD
const TEST_MODE = process.env.TEST_MODE === 'true';
const TEST_DELAY_MINUTES = parseInt(process.env.TEST_DELAY_MINUTES) || 10;

// Support multiple admin numbers (comma-separated)
const ADMIN_PHONES = (process.env.ADMIN_PHONES || process.env.ADMIN_PHONE || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

/**
 * In-memory daily message tracker.
 * Tracks counts per project throughout the day for quick stats.
 * Map<projectId, { projectName, daily_log, delivery, media, skipped, error }>
 */
const dailyTracker = new Map();

/**
 * Track a processed message (called from the message handler).
 */
function trackMessage(projectId, type) {
    if (!dailyTracker.has(projectId)) {
        dailyTracker.set(projectId, {
            daily_log: 0,
            delivery: 0,
            media: 0,
            skipped: 0,
            error: 0
        });
    }

    const tracker = dailyTracker.get(projectId);
    if (tracker[type] !== undefined) {
        tracker[type]++;
    }
}

/**
 * Reset the daily tracker (called after EOD summary is sent).
 */
function resetTracker() {
    dailyTracker.clear();
}

/**
 * Start the EOD summary cron job.
 * Runs at EOD_HOUR:EOD_MINUTE IST every day.
 *
 * @param {object} whatsappClient - The WhatsApp client instance (for sending messages)
 */
function startEodCron(whatsappClient) {
    const cronExpression = `${EOD_MINUTE} ${EOD_HOUR} * * *`;
    logger.info(`⏰ EOD summary cron scheduled: ${cronExpression} (${EOD_HOUR}:${String(EOD_MINUTE).padStart(2, '0')} daily)`);

    cron.schedule(cronExpression, async () => {
        logger.info('═══════════════════════════════════════════════');
        logger.info('  📋 Running EOD Summary...');
        logger.info('═══════════════════════════════════════════════');

        await sendEodSummary(whatsappClient);
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Also schedule a morning reminder at 8 AM for any un-approved entries from previous days
    cron.schedule('0 8 * * *', async () => {
        await sendPendingReminder(whatsappClient);
    }, {
        timezone: 'Asia/Kolkata'
    });

    logger.info(`⏰ Morning reminder cron scheduled: 8:00 AM daily`);

    // Test mode: also run summary on a short interval for quick testing
    if (TEST_MODE) {
        logger.info(`🧪 TEST MODE: Approval summary will be sent every ${TEST_DELAY_MINUTES} minute(s)`);
        cron.schedule(`*/${TEST_DELAY_MINUTES} * * * *`, async () => {
            logger.info('🧪 [TEST] Running quick approval summary...');
            await sendEodSummary(whatsappClient);
        }, {
            timezone: 'Asia/Kolkata'
        });
    }
}

/**
 * Send the EOD summary to the Admin as WhatsApp DMs (one per project).
 */
async function sendEodSummary(client) {
    if (ADMIN_PHONES.length === 0) {
        logger.error('❌ ADMIN_PHONES not set — cannot send EOD summary');
        return;
    }

    // Check if WhatsApp client is connected
    if (!client.info) {
        logger.warn('⏳ WhatsApp client not ready yet — skipping this cycle');
        return;
    }

    try {
        // Fetch today's pending entries from the backend (source of truth)
        const pendingData = await api.getTodayPending();

        if (pendingData.totalPending === 0) {
            logger.info('📭 No pending entries today — skipping EOD summary');

            // Still send a brief "all quiet" message
            const quietMsg = `📋 *BuildCore EOD — ${formatDate(new Date())}*\n\n` +
                `No site updates were received today.\n` +
                `All quiet on the construction front! 🏗️`;

            for (const phone of ADMIN_PHONES) {
                await safeSendMessage(client, `${phone}@c.us`, quietMsg);
            }
            resetTracker();
            return;
        }

        // Send one message per project
        for (const project of pendingData.projects) {
            const batchId = generateBatchId(project.projectName);

            // Assign batchId to these entries
            const entryIds = project.entries.map(e => e.id);
            try {
                await api.assignBatch(entryIds, batchId);
            } catch (err) {
                logger.warn(`Could not assign batch: ${err.message}`);
            }

            // Build the message
            const message = formatProjectSummary(project, batchId);

            for (const phone of ADMIN_PHONES) {
                await safeSendMessage(client, `${phone}@c.us`, message);
            }
            logger.info(`📤 Sent EOD for "${project.projectName}" to ${ADMIN_PHONES.length} admin(s) (${project.entries.length} entries, batch: ${batchId})`);

            // Register this batch for approval tracking
            registerSession(batchId, project.projectName, entryIds);

            // Small delay between messages to avoid rate limiting
            await sleep(1500);
        }

        // Send a final totals message
        const totalsMsg = `\n📊 *Total: ${pendingData.totalPending} entries across ${pendingData.projects.length} project(s)*\n\n` +
            `Reply to each project message above with:\n` +
            `  ✅ — Approve all\n` +
            `  ✅ 1,3 — Approve specific entries\n` +
            `  ❌ — Reject all\n` +
            `  ❌ 2 — Reject specific entries`;

        for (const phone of ADMIN_PHONES) {
            await safeSendMessage(client, `${phone}@c.us`, totalsMsg);
        }

        resetTracker();
        logger.info('✅ EOD summary sent successfully');

    } catch (err) {
        logger.error(`❌ EOD summary failed: ${err.message}`, { stack: err.stack });
    }
}

/**
 * Send a morning reminder for any unapproved entries from previous days.
 */
async function sendPendingReminder(client) {
    if (ADMIN_PHONES.length === 0) return;

    try {
        const pendingData = await api.getAllPending();

        // Filter to only entries older than today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let oldCount = 0;
        const oldProjects = [];

        for (const project of pendingData.projects) {
            const oldEntries = project.entries.filter(e => new Date(e.createdAt) < today);
            if (oldEntries.length > 0) {
                oldCount += oldEntries.length;
                oldProjects.push({ name: project.projectName, count: oldEntries.length });
            }
        }

        if (oldCount === 0) return;

        let msg = `⏰ *Pending Approval Reminder*\n\n`;
        msg += `You have *${oldCount}* unapproved entries from previous days:\n\n`;

        for (const proj of oldProjects) {
            msg += `  🏗️ ${proj.name}: ${proj.count} entries\n`;
        }

        msg += `\nPlease review and approve/reject them.`;

        for (const phone of ADMIN_PHONES) {
            await safeSendMessage(client, `${phone}@c.us`, msg);
        }
        logger.info(`📤 Sent morning reminder to ${ADMIN_PHONES.length} admin(s): ${oldCount} old pending entries`);

    } catch (err) {
        logger.warn(`Morning reminder failed: ${err.message}`);
    }
}

/**
 * Format a project's pending entries into a WhatsApp-friendly message.
 */
function formatProjectSummary(project, batchId) {
    const date = formatDate(new Date());
    let msg = `📋 *${project.projectName} — ${date}*\n`;
    msg += `   Ref: #${batchId}\n\n`;

    let totalLaborers = 0;
    let totalCost = 0;

    project.entries.forEach((entry, index) => {
        const num = index + 1;

        if (entry.type === 'daily_log') {
            const d = entry.data;
            totalLaborers += parseInt(d.laborers) || 0;

            msg += `${num}️⃣ 🏗️ *${d.blockName || 'General'}*\n`;
            msg += `   📝 ${d.taskCompleted || d.notes || 'No details'}\n`;
            msg += `   👷 Laborers: ${d.laborers || 0}`;
            if (d.weatherCondition && d.weatherCondition !== 'Not recorded') {
                const weatherEmoji = getWeatherEmoji(d.weatherCondition);
                msg += ` | ${weatherEmoji} ${d.weatherCondition}`;
            }
            msg += `\n`;
            msg += `   ✉️ From: ${entry.senderName}\n`;

        } else if (entry.type === 'delivery') {
            const d = entry.data;
            totalCost += parseFloat(d.totalCost) || 0;

            msg += `${num}️⃣ 📦 *Delivery: ${d.quantity} ${d.unit} ${d.materialName}*\n`;
            if (d.totalCost > 0) msg += `   💰 ₹${formatCurrency(d.totalCost)}`;
            if (d.supplier && d.supplier !== 'Unknown') msg += ` | Supplier: ${d.supplier}`;
            msg += `\n`;
            msg += `   ✉️ From: ${entry.senderName}\n`;
        }

        if (entry.attachments && entry.attachments.length > 0) {
            msg += `   📎 ${entry.attachments.length} attachment(s)\n`;
        }

        msg += `\n`;
    });

    // Summary line
    msg += `───────────────\n`;
    if (totalLaborers > 0) msg += `👷 Total Laborers: ${totalLaborers}\n`;
    if (totalCost > 0) msg += `💰 Total Delivery Cost: ₹${formatCurrency(totalCost)}\n`;
    msg += `\nReply: ✅ approve all | ❌ reject all | ✅ 1,3 specific`;

    return msg;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateBatchId(projectName) {
    const prefix = projectName
        .split(/\s+/)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 3);

    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `${prefix}-${date}`;
}

function formatDate(date) {
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-IN');
}

function getWeatherEmoji(condition) {
    const lower = (condition || '').toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) return '☀️';
    if (lower.includes('cloud') || lower.includes('overcast')) return '☁️';
    if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️';
    if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
    return '🌤️';
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Send a WhatsApp message with retry logic for Puppeteer/WhatsApp Web errors.
 * WhatsApp Web periodically reloads, causing stale frame/context errors.
 * Puppeteer minifies error messages (e.g. just "t"), so we check the stack trace.
 */
async function safeSendMessage(client, chatId, message, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await client.sendMessage(chatId, message);
            return;
        } catch (err) {
            const errMsg = err.message || '';
            const errStack = err.stack || '';
            const isPuppeteerError = errStack.includes('puppeteer') ||
                                      errStack.includes('ExecutionContext') ||
                                      errStack.includes('IsolatedWorld') ||
                                      errMsg.includes('detached Frame') ||
                                      errMsg.includes('Execution context was destroyed') ||
                                      errMsg.length <= 2; // Minified puppeteer errors like "t"

            if (isPuppeteerError && attempt < retries) {
                logger.warn(`⚠️  Send failed (attempt ${attempt}/${retries}): Puppeteer error "${errMsg}", retrying in 5s...`);
                await sleep(5000);
            } else {
                throw err;
            }
        }
    }
}

module.exports = {
    trackMessage,
    startEodCron,
    sendEodSummary,
    resetTracker
};
