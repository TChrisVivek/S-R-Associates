const { classifyMessage, extractDailyLog, extractDelivery, extractExpense, extractClearance } = require('./ollamaExtractor');
const logger = require('./utils/logger');

/**
 * Classify a WhatsApp message and extract structured data if it's a valid site update.
 *
 * @param {string} text - The raw message text
 * @param {string[]} blockNames - Available block names for this project
 * @returns {Promise<{ type: string, data: object } | null>} Extracted data or null if chatter
 */
async function classifyAndExtract(text, blockNames = []) {
    // Step 1: Classify the message
    logger.info(` Classifying message...`);
    const category = await classifyMessage(text);
    logger.info(`   Category: ${category}`);

    if (category === 'chatter') {
        return null;
    }

    // Step 2: Extract based on category
    if (category === 'daily_log') {
        logger.info(` Extracting daily log data...`);
        const data = await extractDailyLog(text, blockNames);
        if (data) {
            const labourSummary = data.labourBreakdown && data.labourBreakdown.length > 0
                ? data.labourBreakdown.map(r => `${r.role}×${r.count}`).join(', ')
                : `total=${data.laborers}`;
            logger.info(`    Extracted: block="${data.blockName}", labour=[${labourSummary}], task="${data.taskCompleted?.substring(0, 50)}"`);
            return { type: 'daily_log', data };
        }
        logger.warn(`   ⚠️  Extraction returned null — could not parse daily log`);
        return null;
    }

    if (category === 'delivery') {
        logger.info(` Extracting delivery data...`);
        const data = await extractDelivery(text, blockNames);
        if (data) {
            logger.info(`    Extracted: ${data.quantity} ${data.unit} of ${data.materialName} from ${data.supplier}`);
            return { type: 'delivery', data };
        }
        logger.warn(`     Extraction returned null — could not parse delivery`);
        return null;
    }

    if (category === 'expense') {
        logger.info(` Extracting expense data...`);
        const data = await extractExpense(text);
        if (data) {
            logger.info(`   Extracted: ₹${data.amount} for ${data.category} from ${data.supplier}`);
            return { type: 'expense', data };
        }
        logger.warn(`     Extraction returned null — could not parse expense`);
        return null;
    }

    if (category === 'clearance') {
        logger.info(` Extracting clearance/status data...`);
        const data = await extractClearance(text);
        if (data) {
            logger.info(`    Extracted clearance: "${data.clearanceType}" — ${data.clearanceStatus}`);
            // Clearances are stored as daily_log entries with clearance metadata
            return { type: 'daily_log', data };
        }
        logger.warn(`     Clearance extraction returned null`);
        return null;
    }

    return null;
}

module.exports = { classifyAndExtract };
