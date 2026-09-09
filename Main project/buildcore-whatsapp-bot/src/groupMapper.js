const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const MAP_FILE = path.join(__dirname, '..', 'group-map.json');

/**
 * Load saved group ID → group name mappings from disk.
 * @returns {Object} Map of groupId -> groupName
 */
function loadGroupMap() {
    try {
        if (fs.existsSync(MAP_FILE)) {
            const data = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
            logger.info(`📂 Loaded ${Object.keys(data).length} saved group mappings from group-map.json`);
            return data;
        }
    } catch (e) {
        logger.warn(`⚠️ Could not load group-map.json: ${e.message}`);
    }
    return {};
}

/**
 * Save the group map to disk (fire-and-forget).
 * @param {Object} map - Map of groupId -> groupName
 */
function saveGroupMap(map) {
    try {
        fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2), 'utf8');
    } catch (e) {
        logger.warn(`⚠️ Could not save group-map.json: ${e.message}`);
    }
}

// In-memory map loaded at require time
const groupMap = loadGroupMap();

/**
 * Get the known group name for a group ID.
 * @param {string} groupId
 * @returns {string|null}
 */
function getGroupName(groupId) {
    return groupMap[groupId] || null;
}

/**
 * Save a newly discovered group ID → name mapping.
 * @param {string} groupId
 * @param {string} groupName
 */
function setGroupName(groupId, groupName) {
    if (!groupId || !groupName || groupName === 'Unknown Group') return;
    if (groupMap[groupId] === groupName) return; // no change
    groupMap[groupId] = groupName;
    saveGroupMap(groupMap);
    logger.info(`💾 Saved group mapping: ${groupId} → "${groupName}"`);
}

/**
 * Try to discover group names using the WhatsApp client.
 * Uses multiple fallback approaches to work around whatsapp-web.js bugs.
 * @param {import('whatsapp-web.js').Client} client
 * @returns {Promise<number>} Number of new groups discovered
 */
async function discoverGroups(client) {
    let discovered = 0;

    // Approach 1: Direct Store access (sync, avoids 'r' error from async operations)
    try {
        const groups = await client.pupPage.evaluate(() => {
            try {
                const models = window.Store && window.Store.Chat && window.Store.Chat.getModelsArray
                    ? window.Store.Chat.getModelsArray()
                    : [];
                return models
                    .filter(c => c.id && c.id._serialized && c.id._serialized.endsWith('@g.us'))
                    .map(c => ({
                        id: c.id._serialized,
                        name: c.name || c.formattedTitle || c.contact?.pushname || ''
                    }))
                    .filter(c => c.name);
            } catch (e) {
                return [];
            }
        });

        for (const g of groups) {
            if (g.name && !groupMap[g.id]) {
                groupMap[g.id] = g.name;
                discovered++;
            }
        }
    } catch (e) {
        logger.warn(`   Store discovery failed: ${e.message}`);
    }

    // Approach 2: Try client.getChats() as fallback
    if (discovered === 0) {
        try {
            const chats = await client.getChats();
            const groups = chats.filter(c => c.id._serialized.endsWith('@g.us'));
            for (const chat of groups) {
                if (chat.name && !groupMap[chat.id._serialized]) {
                    groupMap[chat.id._serialized] = chat.name;
                    discovered++;
                }
            }
        } catch (e) {
            logger.warn(`   getChats() discovery failed: ${e.message}`);
        }
    }

    if (discovered > 0) {
        saveGroupMap(groupMap);
    }

    return discovered;
}

/**
 * Try to get a group name for a specific chat ID using the client.
 * @param {import('whatsapp-web.js').Client} client
 * @param {string} chatId
 * @returns {Promise<string|null>}
 */
async function resolveGroupName(client, chatId) {
    // Check file-based cache first
    if (groupMap[chatId]) {
        return groupMap[chatId];
    }

    // Try getChat()
    try {
        const chat = await client.getChatById(chatId);
        if (chat && chat.name) {
            setGroupName(chatId, chat.name);
            return chat.name;
        }
    } catch (e) { /* expected to fail with 'r' error */ }

    // Try direct Store access
    try {
        const name = await client.pupPage.evaluate((id) => {
            try {
                const chat = window.Store && window.Store.Chat && window.Store.Chat.get(id);
                return chat ? (chat.name || chat.formattedTitle || '') : '';
            } catch (e) { return ''; }
        }, chatId);
        if (name) {
            setGroupName(chatId, name);
            return name;
        }
    } catch (e) { /* silent */ }

    return null;
}

module.exports = { getGroupName, setGroupName, discoverGroups, resolveGroupName };
