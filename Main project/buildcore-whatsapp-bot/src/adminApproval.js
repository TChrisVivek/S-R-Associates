const logger = require('./utils/logger');
const api = require('./apiClient');

/**
 * Active approval sessions — tracks which batchIds are awaiting Admin response.
 * Map<batchId, { projectName, entryIds: string[], sentAt: Date }>
 */
const activeSessions = new Map();

/**
 * Register a batch as awaiting approval (called after sending EOD message).
 */
function registerSession(batchId, projectName, entryIds) {
    activeSessions.set(batchId, {
        projectName,
        entryIds,
        sentAt: new Date()
    });
}

/**
 * Handle an incoming reply from the Admin (personal DM).
 * Parses approval/rejection commands and executes them.
 *
 * @param {object} msg - The WhatsApp message from Admin
 * @param {object} client - The WhatsApp client (for sending confirmations)
 */
async function handleAdminReply(msg, client) {
    const text = (msg.body || '').trim();
    const adminChat = msg.from;

    // Ignore very short or non-command messages
    if (text.length < 1) return;

    logger.info(`📨 Admin reply: "${text}"`);

    // Parse the command
    const parsed = parseAdminCommand(text);

    if (!parsed) {
        // Not a recognized command — might be a normal chat message
        logger.info(`   Not a bot command — ignoring`);
        return;
    }

    const { action, specificIds, batchId: referencedBatch } = parsed;

    // Find the target batch
    let targetBatch = null;
    let targetBatchId = null;

    if (referencedBatch) {
        // Admin referenced a specific batch (e.g., "✅ #MM-20260610")
        if (activeSessions.has(referencedBatch)) {
            targetBatch = activeSessions.get(referencedBatch);
            targetBatchId = referencedBatch;
        }
    } else {
        // No batch specified — use the most recent one
        let latestTime = null;
        for (const [bId, session] of activeSessions) {
            if (!latestTime || session.sentAt > latestTime) {
                latestTime = session.sentAt;
                targetBatchId = bId;
                targetBatch = session;
            }
        }
    }

    if (!targetBatch) {
        await client.sendMessage(adminChat, '⚠️ No pending approval found. The entries may have already been processed.');
        return;
    }

    try {
        if (action === 'approve') {
            let idsToApprove;

            if (specificIds && specificIds.length > 0) {
                // Approve specific entries by their 1-based index in the EOD message
                idsToApprove = specificIds
                    .map(i => targetBatch.entryIds[i - 1]) // Convert 1-based to 0-based
                    .filter(Boolean);

                // Reject the rest
                const idsToReject = targetBatch.entryIds.filter(id => !idsToApprove.includes(id));
                if (idsToReject.length > 0) {
                    await api.rejectEntries({ ids: idsToReject });
                }
            } else {
                // Approve all
                idsToApprove = targetBatch.entryIds;
            }

            const result = await api.approveEntries({ ids: idsToApprove });
            await client.sendMessage(adminChat,
                `✅ *${targetBatch.projectName}*: ${result.message}\nEntries have been saved to the BuildCore database.`
            );

            logger.info(`✅ Admin approved ${idsToApprove.length} entries for "${targetBatch.projectName}"`);

        } else if (action === 'reject') {
            let idsToReject;

            if (specificIds && specificIds.length > 0) {
                // Reject specific entries
                idsToReject = specificIds
                    .map(i => targetBatch.entryIds[i - 1])
                    .filter(Boolean);

                // Approve the rest
                const idsToApprove = targetBatch.entryIds.filter(id => !idsToReject.includes(id));
                if (idsToApprove.length > 0) {
                    await api.approveEntries({ ids: idsToApprove });
                }
            } else {
                // Reject all
                idsToReject = targetBatch.entryIds;
            }

            const result = await api.rejectEntries({ ids: idsToReject });
            await client.sendMessage(adminChat,
                `❌ *${targetBatch.projectName}*: ${result.message}\nEntries have been discarded.`
            );

            logger.info(`❌ Admin rejected ${idsToReject.length} entries for "${targetBatch.projectName}"`);
        }

        // Remove the processed session
        activeSessions.delete(targetBatchId);

    } catch (err) {
        logger.error(`Approval processing error: ${err.message}`);
        await client.sendMessage(adminChat,
            `⚠️ Error processing your request: ${err.message}\nPlease try again.`
        );
    }
}

/**
 * Parse an admin reply into a structured command.
 *
 * Supported formats:
 * - "✅" or "approve" → approve all
 * - "✅ 1,3" or "approve 1,3" → approve specific entries
 * - "❌" or "reject" → reject all
 * - "❌ 2" or "reject 2" → reject specific entries
 * - "✅ #MM-20260610" → approve a specific batch
 *
 * @returns {{ action: 'approve'|'reject', specificIds: number[]|null, batchId: string|null } | null}
 */
function parseAdminCommand(text) {
    const normalized = text.toLowerCase().trim();

    // Detect action
    let action = null;
    let rest = '';

    if (normalized.startsWith('✅') || normalized.startsWith('approve')) {
        action = 'approve';
        rest = normalized.replace(/^(✅|approve)\s*/, '').trim();
    } else if (normalized.startsWith('❌') || normalized.startsWith('reject')) {
        action = 'reject';
        rest = normalized.replace(/^(❌|reject)\s*/, '').trim();
    } else if (normalized === 'yes' || normalized === 'ok' || normalized === 'done') {
        action = 'approve';
        rest = '';
    } else if (normalized === 'no' || normalized === 'cancel' || normalized === 'skip') {
        action = 'reject';
        rest = '';
    } else {
        return null;
    }

    // Check for batch reference
    let batchId = null;
    const batchMatch = rest.match(/#([A-Z]+-\d+)/i);
    if (batchMatch) {
        batchId = batchMatch[1].toUpperCase();
        rest = rest.replace(batchMatch[0], '').trim();
    }

    // Check for specific entry numbers
    let specificIds = null;
    if (rest.length > 0) {
        const numbers = rest.split(/[,\s]+/)
            .map(s => parseInt(s))
            .filter(n => !isNaN(n) && n > 0);

        if (numbers.length > 0) {
            specificIds = numbers;
        }
    }

    return { action, specificIds, batchId };
}

module.exports = {
    handleAdminReply,
    registerSession,
    parseAdminCommand
};
