const axios = require('axios');
const logger = require('./utils/logger');
const api = require('./apiClient');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const TIMEOUT = 90000; // 90 seconds — local LLMs can be slow on cold start + concurrent load

// ─── Sequential Request Queue ────────────────────────────────────────────────
// Ollama handles one request at a time internally; sending concurrent requests
// causes them to pile up and timeout. This queue ensures we process one at a time.
let _queue = Promise.resolve();

function enqueue(fn) {
    _queue = _queue.then(fn, fn); // chain regardless of prior success/failure
    return _queue;
}

// ─── Labour Role Mappings ─────────────────────────────────────────────────────
// Maps short codes used by site managers to standard role names.
// "Fc" / "FC" = Female Coolie/Helper as confirmed by client.
const LABOUR_ROLE_MAP = {
    // Mason variants
    'mason': 'Mason', 'masons': 'Mason', 'msn': 'Mason',
    // Male Helper / Coolie
    'helper': 'Male Helper', 'helpers': 'Male Helper', 'help': 'Male Helper',
    'coolie': 'Male Helper', 'mc': 'Male Helper', 'labour': 'Male Helper', 'labor': 'Male Helper',
    // Female Helper / Coolie — "Fc" confirmed = Female Coolie
    'fc': 'Female Helper', 'f.c': 'Female Helper', 'f/c': 'Female Helper',
    'female coolie': 'Female Helper', 'female helper': 'Female Helper', 'fhelper': 'Female Helper',
    // Carpenter
    'carpenter': 'Carpenter', 'carpanter': 'Carpenter', 'carp': 'Carpenter',
    // Steel Fixer / Bar Bender
    'sf': 'Steel Fixer', 'steel fixer': 'Steel Fixer', 'bar bender': 'Steel Fixer',
    'barbender': 'Steel Fixer', 'fitter': 'Steel Fixer',
    // Electrician
    'electrician': 'Electrician', 'electrical': 'Electrician', 'elec': 'Electrician',
    // Plumber
    'plumber': 'Plumber', 'plumbing': 'Plumber',
    // Supervisor / Foreman
    'supervisor': 'Supervisor', 'foreman': 'Supervisor', 'mukadam': 'Supervisor', 'incharge': 'Supervisor',
    // Machine Operator
    'jcb': 'Machine Operator', 'excavator': 'Machine Operator', 'operator': 'Machine Operator',
    // General
    'engineer': 'Site Engineer', 'site engineer': 'Site Engineer',
    'worker': 'Worker', 'workers': 'Worker',
};

/**
 * Normalize a raw role label to a canonical role name.
 * @param {string} raw - e.g. "Fc", "help", "Mason"
 * @returns {string} - canonical name, e.g. "Female Helper"
 */
function normalizeRole(raw) {
    const key = (raw || '').toLowerCase().trim();
    return LABOUR_ROLE_MAP[key] || raw.trim();
}

/**
 * Load custom labour role shortcodes from the portal Settings and merge
 * them into LABOUR_ROLE_MAP. Call once at bot startup after connecting.
 * Custom codes from the portal override the built-in defaults.
 */
async function loadCustomLabourRoles() {
    try {
        const customRoles = await api.fetchLabourRoles();
        if (!customRoles || customRoles.length === 0) {
            logger.info(' No custom labour roles in portal — using built-in defaults');
            return;
        }
        let count = 0;
        for (const { shortCode, roleName } of customRoles) {
            if (shortCode && roleName) {
                LABOUR_ROLE_MAP[shortCode.toLowerCase().trim()] = roleName.trim();
                count++;
            }
        }
        logger.info(` Loaded ${count} custom labour role codes from portal settings`);
    } catch (err) {
        logger.warn(`⚠️  Could not load custom labour roles: ${err.message}. Built-in defaults apply.`);
    }
}

/**
 * Parse a raw labour text block into a structured breakdown array.
 *
 * Handles real formats used by this team:
 *   "Mason -1\nHelper -3\nFc-1"
 *   "Mason:2, Helper:3, FC:1"
 *   "2 Mason, 3 Helper, 1 Fc"
 *
 * @param {string} labourText - the raw labour section from the message
 * @returns {{ role: string, count: number }[]}
 */
function parseLabourBreakdown(labourText) {
    if (!labourText) return [];
    const results = [];
    const lines = labourText.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
        // Pattern 1: "Mason -1" or "Helper -3" or "Fc-1"
        let match = line.match(/^([a-zA-Z\s./]+?)\s*[-:]\s*(\d+)$/);
        if (match) {
            const role = normalizeRole(match[1]);
            const count = parseInt(match[2]);
            if (count > 0) { results.push({ role, count }); continue; }
        }
        // Pattern 2: "1 Mason" or "3 Helper"
        match = line.match(/^(\d+)\s+([a-zA-Z\s./]+)$/);
        if (match) {
            const role = normalizeRole(match[2]);
            const count = parseInt(match[1]);
            if (count > 0) { results.push({ role, count }); continue; }
        }
        // Pattern 3: "Mason:2"
        match = line.match(/^([a-zA-Z\s./]+?)\s*:\s*(\d+)$/);
        if (match) {
            const role = normalizeRole(match[1]);
            const count = parseInt(match[2]);
            if (count > 0) results.push({ role, count });
        }
    }
    return results;
}

/**
 * Classify a WhatsApp message using few-shot examples from real site manager messages.
 * Categories: daily_log | delivery | expense | clearance | chatter
 *
 * @param {string} text - The raw WhatsApp message (may include quoted reply context)
 * @returns {Promise<'daily_log' | 'delivery' | 'expense' | 'clearance' | 'chatter'>}
 */
async function classifyMessage(text) {
    const prompt = `You are a message classifier for a construction site management system in India.
Site managers send informal WhatsApp messages. Classify into EXACTLY ONE category:
- "daily_log": Work progress, site activity, labour count, section work, curing, leveling, short photo captions
- "delivery": Material delivery — concrete (RMC), steel, bricks, sand, cement received at site
- "expense": Bill, invoice, expense sheet, PDF of accounts, payment record, receipt
- "clearance": Status clearance, completion confirmation, readiness confirmation, approval for next stage
- "chatter": Casual chat, greetings, "Ok sir", thumbs up, questions — NOT a site update

REAL EXAMPLES (learn from these):
"South side curtain wall shuttering work progressing" → daily_log
"South side concrete work progressing" → daily_log
"Ongoing work at site - 1/9/26\n• compound dressing work\nLabour report\nMason -1\nHelp-3\nFc-1" → daily_log
"Soil leveling and cleaning" → daily_log
"Curing" → daily_log
"North side RW concrete work\nLabour report\nMason -1\nHelper -3" → daily_log
"Concrete work completed" → daily_log
"Yesterday RMC bills" → delivery
"RMC delivery done" → delivery
"Cement bags received 100 bags" → delivery
"bhakti sep4 exp.pdf" → expense
"Expense sheet attached" → expense
"Clearance for erection" → clearance
"Yes sir all concrete work has been completed. The site is ready for erection after curing period" → clearance
"Work completed, ready for next stage" → clearance
"Ok sir" → chatter
"Good morning" → chatter
"When will you come?" → chatter

Message: "${text.replace(/"/g, "'")}"

Return ONLY valid JSON: {"category": "daily_log" | "delivery" | "expense" | "clearance" | "chatter"}`;

    try {
        const response = await callOllama(prompt);
        const parsed = JSON.parse(response);
        const category = parsed.category;

        if (['daily_log', 'delivery', 'expense', 'clearance', 'chatter'].includes(category)) {
            return category;
        }
        return 'chatter';
    } catch (err) {
        logger.warn(`Classification failed, defaulting to chatter: ${err.message}`);
        return 'chatter';
    }
}

/**
 * Extract structured daily log data from a site update message.
 * Handles real formats: bullet points, labour breakdowns (Mason/Helper/Fc), embedded dates.
 *
 * @param {string} text - The raw WhatsApp message
 * @param {string[]} blockNames - Available block names for this project
 * @returns {Promise<object|null>} Extracted data or null on failure
 */
async function extractDailyLog(text, blockNames = []) {
    const blockList = blockNames.length > 0
        ? `Available blocks/sections for this project: ${blockNames.join(', ')}. Match to the closest one.`
        : 'Extract the block/section/side/floor name if mentioned (e.g., "South side", "North side", "East side").';

    const prompt = `You are a data extraction assistant for a construction site management system in India.
Extract details from this site update message. ${blockList}

REAL MESSAGE FORMATS USED BY THIS TEAM:
Format A (photo caption): "South side curtain wall shuttering work progressing"
  → blockName="South Side", taskCompleted="Curtain wall shuttering work progressing", labourText=""
Format B (structured update with labour):
  "Ongoing work at site - 1/9/26\n• compound dressing work\n• East side concrete work progressing\nLabour report\nMason -1\nHelp-3\nFc-1"
  → blockName="East Side", taskCompleted="Compound dressing work, East side concrete work progressing", labourText="Mason -1\nHelp-3\nFc-1"
Format C (short caption): "Curing"
  → blockName="General", taskCompleted="Curing work in progress", labourText=""

Message: "${text.replace(/"/g, "'")}"

Return ONLY a valid JSON object:
{
  "blockName": "string — block/section/side/floor mentioned, or 'General'",
  "taskCompleted": "string — what work was done, summarized in one or two sentences",
  "labourText": "string — copy the raw labour section exactly as written (e.g. 'Mason -1\\nHelper-3\\nFc-1'), empty string if no labour mentioned",
  "weatherCondition": "string — weather if mentioned (Sunny/Cloudy/Rainy/Not recorded)",
  "day": "string — day of week if mentioned, else empty string",
  "notes": "string — the full original message text"
}`;

    try {
        const response = await callOllama(prompt);
        const data = JSON.parse(response);

        // Validate required fields
        if (!data.taskCompleted && !data.notes) {
            logger.warn('Extraction returned empty task and notes');
            return null;
        }

        // Parse labour breakdown from raw labour text (handles Mason/Helper/Fc etc.)
        const labourBreakdown = parseLabourBreakdown(data.labourText || '');
        const totalLaborers = labourBreakdown.length > 0
            ? labourBreakdown.reduce((sum, r) => sum + r.count, 0)
            : 0;

        return {
            blockName: data.blockName || 'General',
            laborers: totalLaborers,
            labourBreakdown,          // e.g. [{ role: "Mason", count: 1 }, { role: "Female Helper", count: 1 }]
            taskCompleted: data.taskCompleted || '',
            weatherCondition: data.weatherCondition || 'Not recorded',
            day: data.day || '',
            notes: data.notes || text
        };
    } catch (err) {
        logger.error(`Daily log extraction failed: ${err.message}`);
        return null;
    }
}

/**
 * Extract structured delivery data from a material delivery message.
 *
 * @param {string} text - The raw WhatsApp message
 * @param {string[]} blockNames - Available block names for this project
 * @returns {Promise<object|null>} Extracted data or null on failure
 */
async function extractDelivery(text, blockNames = []) {
    const blockList = blockNames.length > 0
        ? `Available blocks/sections: ${blockNames.join(', ')}. Choose the closest match from this list.`
        : 'Extract the block/section/floor name if mentioned.';

    const prompt = `You are a data extraction assistant for a construction site management system.

Extract material delivery details from this message. ${blockList}

Message: "${text}"

Return ONLY a valid JSON object with these fields:
{
  "blockName": "string — the block/section where material was delivered (or 'General' if not specified)",
  "materialName": "string — name of the material (e.g., Cement, Steel, Sand, Bricks)",
  "unit": "string — unit of measurement (bags, kg, tons, pieces, cubic meters, etc.)",
  "quantity": number — quantity delivered,
  "supplier": "string — supplier/vendor name if mentioned (or 'Unknown')",
  "totalCost": number — total cost in rupees if mentioned (0 if not mentioned)
}`;

    try {
        const response = await callOllama(prompt);
        const data = JSON.parse(response);

        // Validate required fields
        if (!data.materialName || !data.quantity) {
            logger.warn('Delivery extraction missing material name or quantity');
            return null;
        }

        return {
            blockName: data.blockName || 'General',
            materialName: data.materialName,
            unit: data.unit || 'units',
            quantity: parseFloat(data.quantity) || 0,
            supplier: data.supplier || 'Unknown',
            totalCost: parseFloat(data.totalCost) || 0
        };
    } catch (err) {
        logger.error(`Delivery extraction failed: ${err.message}`);
        return null;
    }
}

/**
 * Extract structured expense data from a bill/invoice/expense message.
 *
 * @param {string} text - The raw WhatsApp message
 * @returns {Promise<object|null>} Extracted data or null on failure
 */
async function extractExpense(text) {
    const prompt = `You are a data extraction assistant for a construction site management system.

Extract expense or bill details from this message.

Message: "${text}"

Return ONLY a valid JSON object with these fields:
{
  "amount": number — total amount in rupees if mentioned (0 if not mentioned),
  "category": "string — guess the category (e.g., Material, Labor, Logistics, Equipment, Food, Other)",
  "supplier": "string — supplier/vendor name if mentioned (or 'Unknown')",
  "description": "string — a short summary of what the expense was for"
}`;

    try {
        const response = await callOllama(prompt);
        const data = JSON.parse(response);

        // Validate required fields
        if (!data.amount && !data.description) {
            logger.warn('Expense extraction missing both amount and description');
            return null;
        }

        return {
            amount: parseFloat(data.amount) || 0,
            category: data.category || 'Other',
            supplier: data.supplier || 'Unknown',
            description: data.description || text
        };
    } catch (err) {
        logger.error(`Expense extraction failed: ${err.message}`);
        return null;
    }
}

// ─── Clearance Extractor ──────────────────────────────────────────────────────

/**
 * Extract structured clearance/status data from a clearance message.
 * Used when site engineers confirm completion or give go-ahead for the next stage.
 * Stored as a daily_log entry tagged with clearance info.
 *
 * @param {string} text - The raw WhatsApp message (may include quoted reply context)
 * @returns {Promise<object|null>}
 */
async function extractClearance(text) {
    const prompt = `You are a data extraction assistant for a construction site management system in India.
Extract clearance or status confirmation details from this message.
This is from a site engineer confirming work completion or giving clearance for the next stage.

Examples:
"Clearance for erection" → clearanceType="Erection Clearance", status="Cleared", summary="Site cleared for erection work"
"Yes sir all concrete work has been completed. The site is ready for erection after curing period" → clearanceType="Concrete Completion", status="Completed", summary="All concrete work completed, site ready for erection after curing"

Message: "${text.replace(/"/g, "'")}"

Return ONLY a valid JSON object:
{
  "clearanceType": "string — type of clearance (e.g., Erection Clearance, Concrete Completion, Foundation Clearance)",
  "status": "string — Cleared / Completed / In Progress / Pending",
  "summary": "string — one sentence summary of what was cleared or confirmed",
  "notes": "string — full original message"
}`;

    try {
        const response = await callOllama(prompt);
        const data = JSON.parse(response);

        if (!data.summary && !data.clearanceType) {
            logger.warn('Clearance extraction returned empty');
            return null;
        }

        // Clearances are saved as daily_log entries with a special clearance tag
        return {
            blockName: 'General',
            laborers: 0,
            labourBreakdown: [],
            taskCompleted: `[CLEARANCE] ${data.clearanceType}: ${data.summary}`,
            weatherCondition: 'Not recorded',
            day: '',
            notes: data.notes || text,
            clearanceType: data.clearanceType || 'General Clearance',
            clearanceStatus: data.status || 'Completed'
        };
    } catch (err) {
        logger.error(`Clearance extraction failed: ${err.message}`);
        return null;
    }
}

/**
 * Call the Ollama API with a prompt and return the response text.
 * Requests are queued so only one runs at a time (Ollama is single-threaded).
 * Retries up to retryCount times on failure.
 */
function callOllama(prompt, retryCount = 2) {
    return enqueue(() => _callOllamaRaw(prompt, retryCount));
}

async function _callOllamaRaw(prompt, retryCount) {
    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
                model: OLLAMA_MODEL,
                prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.1, // Low temperature for consistent extraction
                    num_predict: 512  // Limit output length
                }
            }, {
                timeout: TIMEOUT
            });

            return response.data.response;
        } catch (err) {
            if (attempt < retryCount) {
                const detail = err.response?.data?.error || err.message;
                logger.warn(`Ollama call failed (attempt ${attempt + 1}/${retryCount + 1}), retrying... Reason: ${detail}`);
                await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
            } else {
                const detail = err.response?.data?.error || err.message;
                throw new Error(`Ollama failed after ${retryCount + 1} attempts. Reason: ${detail}`);
            }
        }
    }
}

module.exports = {
    classifyMessage,
    extractDailyLog,
    extractDelivery,
    extractExpense,
    extractClearance,
    parseLabourBreakdown,
    normalizeRole,
    loadCustomLabourRoles,
    callOllama
};
