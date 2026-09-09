const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./utils/logger');
const { resolveGroup, getBlockNames, startPeriodicRefresh } = require('./projectDiscovery');
const { classifyAndExtract } = require('./messageRouter');
const { handleAdminReply } = require('./adminApproval');
const api = require('./apiClient');
const { handleMediaMessage } = require('./fileHandler');
const { trackMessage } = require('./eodSummary');
const { getGroupName, setGroupName, discoverGroups, resolveGroupName } = require('./groupMapper');

// Support multiple admin numbers (comma-separated)
const ADMIN_PHONES = (process.env.ADMIN_PHONES || process.env.ADMIN_PHONE || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
const ADMIN_CHAT_IDS = ADMIN_PHONES.map(p => `${p}@c.us`);
const DISCOVERY_MODE = process.env.DISCOVERY_MODE === 'true';

/**
 * Initialize the WhatsApp Web client.
 * Returns the client instance (used by EOD summary to send messages).
 */
async function initWhatsApp() {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ]
        }
    });

    // ── QR Code ──────────────────────────────────────────────────────────────
    client.on('qr', (qr) => {
        logger.info(' Scan this QR code with your WhatsApp:');
        qrcode.generate(qr, { small: true });
    });

    // ── Ready ────────────────────────────────────────────────────────────────
    client.on('ready', async () => {
        logger.info('✅ WhatsApp client is ready and connected!');

        // Discover group names and build the persistent mapping.
        // Uses retries with increasing delays because WhatsApp Web
        // takes time to sync its internal chat store after login.
        const runDiscovery = async (attempt = 1) => {
            const found = await discoverGroups(client);
            if (found > 0) {
                // Also pre-resolve to project mappings
                const savedMap = require('./groupMapper');
                // resolveGroup uses project cache, so only works if backend was reachable
                logger.info(`📋 Discovered ${found} new group names`);
            } else if (attempt < 4) {
                const delay = attempt * 15;
                logger.info(`⏳ No groups discovered yet (attempt ${attempt}/4). Retrying in ${delay}s...`);
                setTimeout(() => runDiscovery(attempt + 1), delay * 1000);
            } else {
                logger.warn('⚠️ Could not auto-discover groups. They will be learned when messages arrive.');
            }
        };
        // Wait 15 seconds for WhatsApp Web to fully sync before attempting
        setTimeout(() => runDiscovery(), 15000);

        if (DISCOVERY_MODE) {
            logger.info('');
            logger.info('  🔍 DISCOVERY MODE — Send a message in each');
            logger.info('     project group to see its name and ID.');
            logger.info('');
        }

        // Start periodic project refresh
        startPeriodicRefresh();
    });

    // ── Authentication failure ───────────────────────────────────────────────
    client.on('auth_failure', (msg) => {
        logger.error(`❌ Authentication failed: ${msg}`);
    });

    // ── Disconnected ─────────────────────────────────────────────────────────
    client.on('disconnected', (reason) => {
        logger.warn(`⚠️  WhatsApp disconnected: ${reason}`);
        logger.info('   Attempting to reconnect...');
        client.initialize();
    });

    // ── Message Handler ──────────────────────────────────────────────────────
    // 'message' fires for incoming messages from others
    client.on('message', async (msg) => {
        try {
            await handleMessage(msg, client);
        } catch (err) {
            logger.error(`Error handling message: ${err.message}`, { stack: err.stack });
        }
    });

    // 'message_create' fires for ALL messages. We use it to catch messages sent by the bot's own phone.
    client.on('message_create', async (msg) => {
        // Debug log to see if the event even fires
        logger.info(`[DEBUG] message_create fired! fromMe: ${msg.fromMe}, body: "${msg.body?.substring(0, 20)}"`);
        
        if (msg.fromMe) {
            try {
                await handleMessage(msg, client);
            } catch (err) {
                logger.error(`Error handling msg.fromMe: ${err.message}`, { stack: err.stack });
            }
        }
    });

    await client.initialize();
    return client;
}

/**
 * Core message handler — routes messages from groups and admin DMs.
 */
async function handleMessage(msg, client) {
    // If the message is from us, the group ID is in msg.to. Otherwise, it's in msg.from.
    const chatId = msg.fromMe ? msg.to : msg.from;
    const authorIdRaw = msg.fromMe ? msg.from : (msg.author || msg.from);
    
    // Multi-device WhatsApp uses IDs like 918217218940:12@c.us, so we strip the :device part
    const authorId = authorIdRaw.replace(/:\d+/, '');

    // ── Admin personal replies (for approvals) ───────────────────────────────
    // IMPORTANT: Only route to admin approval when it's a DIRECT MESSAGE.
    // If the admin sends a site update to a GROUP, it must be processed
    // as a normal site message — not swallowed as an approval command.
    const normalizedChatId = chatId.replace(/:\d+/, '');
    const isDirectMessage = !chatId.endsWith('@g.us');
    const isFromAdmin = ADMIN_CHAT_IDS.includes(normalizedChatId) || ADMIN_CHAT_IDS.includes(authorId);

    if (isDirectMessage && isFromAdmin) {
        await handleAdminReply(msg, client);
        return;
    }

    // ── Only process group messages below this point ──────────────────────────
    if (!chatId.endsWith('@g.us')) {
        return;
    }

    // Ignore empty non-media messages (like presence updates or system packets)
    // This prevents whatsapp-web.js from crashing with an 'r' error on startup
    if (!msg.body && !msg.hasMedia) {
        return;
    }

    // Get group metadata — uses persistent file-based mapping (group-map.json)
    // to avoid the broken getChat()/page.evaluate() in whatsapp-web.js v1.34.7.
    let groupName = getGroupName(chatId);

    if (!groupName) {
        // Not in our saved map yet — try all fallback methods
        groupName = await resolveGroupName(client, chatId);

        if (!groupName) {
            // Last resort: try msg._data
            if (msg._data && msg._data.chat && msg._data.chat.name) {
                groupName = msg._data.chat.name;
                setGroupName(chatId, groupName);
            } else if (msg._data && msg._data.notifyName) {
                // For group messages, try to use the chat's subject from _data
                const subject = msg._data.subject || msg._data.chatSubject;
                if (subject) {
                    groupName = subject;
                    setGroupName(chatId, groupName);
                }
            }
        }

        if (!groupName) {
            logger.warn(`❌ Could not determine group name for ${chatId}`);
            logger.warn(`   💡 TIP: Add this mapping manually to group-map.json:`);
            logger.warn(`   { "${chatId}": "YOUR_GROUP_NAME_HERE" }`);
            groupName = 'Unknown Group';
        }
    }
    
    // For fromMe messages, contact info might be the bot itself
    let senderName = 'Unknown';
    try {
        const contact = await msg.getContact();
        senderName = contact.pushname || contact.name || 'Bot Admin';
    } catch(e) {}

    // ── Resolve group to project ─────────────────────────────────────────────
    const project = resolveGroup(chatId, groupName);

    // ── Discovery mode: log everything ───────────────────────────────────────
    if (DISCOVERY_MODE) {
        logger.info(` [DISCOVERY] Group: "${groupName}" | ID: ${chatId}`);
        logger.info(`   From: ${senderName} | Text: ${msg.body?.substring(0, 100)}`);
        if (project) {
            logger.info(`    MATCHED: Will map to project "${project.title}" in DB.`);
        } else {
            logger.warn(`   ❌ UNMATCHED: Could not find a matching project name in the database.`);
        }
        if (msg.hasMedia) logger.info(`   📎 Has media attachment`);
        return;
    }

    if (!project) {
        // Group doesn't match any project — ignore silently
        return;
    }

    // ── Filter out noise ─────────────────────────────────────────────────────
    const text = msg.body?.trim() || '';

    // Handle media messages — ALWAYS process regardless of caption length
    if (msg.hasMedia) {
        logger.info(`📎 Media from "${groupName}" by ${senderName} — processing...`);
        await handleMediaMessage(msg, project, senderName, groupName);
        trackMessage(project.projectId, 'media');
        return;
    }

    // Skip very short non-media messages (reactions, stickers, one-word replies)
    // Note: media captions are handled above, so this only applies to plain text
    if (text.length < 5) {
        logger.info(`⏭  Skipped very short message from "${groupName}": "${text}"`);
        trackMessage(project.projectId, 'skipped');
        return;
    }

    // ── Process the message ──────────────────────────────────────────────────
    logger.info(` Processing message from "${groupName}" (${project.title})`);
    logger.info(`   From: ${senderName} | Text: "${text.substring(0, 120)}..."`);

    // ── Include quoted/reply context so AI understands full thread ────────────
    // Example: Ravi replies to "Clearance for erection" with confirmation.
    // Without context, the reply alone looks like chatter.
    let textForAI = text;
    try {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            const quotedText = quotedMsg.body?.trim();
            if (quotedText && quotedText.length > 3) {
                textForAI = `[Replying to: "${quotedText}"]\n${text}`;
                logger.info(`    Reply context: "${quotedText.substring(0, 60)}"`);
            }
        }
    } catch (e) { /* quoted message fetch is best-effort */ }

    const blockNames = getBlockNames(project.projectId);
    const result = await classifyAndExtract(textForAI, blockNames);

    if (!result) {
        logger.info(` Classified as chatter/unclear — skipping`);
        trackMessage(project.projectId, 'skipped');
        return;
    }

    // ── Save to pending queue ────────────────────────────────────────────────
    try {
        const response = await api.savePending({
            projectId: project.projectId,
            type: result.type,
            data: result.data,
            rawMessage: text,
            senderName,
            senderPhone: msg.author || '',
            groupName,
            attachments: []
        });

        logger.info(` Queued ${result.type} for "${project.title}" → pending ID: ${response.id}`);
        
        // ── Auto-Approve (bypass admin) ──────────────────────────────────────────
        if (process.env.AUTO_APPROVE === 'true') {
            await api.approveEntries({ ids: [response.id] });
            logger.info(` Auto-approved entry for "${project.title}" and saved to DB!`);
        }

        trackMessage(project.projectId, result.type);
    } catch (err) {
        logger.error(`❌ Failed to queue entry: ${err.message}`);
        trackMessage(project.projectId, 'error');
    }
}

module.exports = { initWhatsApp };
