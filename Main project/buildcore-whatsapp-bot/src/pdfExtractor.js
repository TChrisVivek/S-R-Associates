const logger = require('./utils/logger');
const { extractExpense } = require('./ollamaExtractor');

/**
 * Extract all text content from a PDF buffer using pdf-parse.
 *
 * @param {Buffer} buffer - Raw PDF file bytes
 * @returns {Promise<string>} Extracted plain text
 */
async function extractTextFromPDF(buffer) {
    // Lazy-require so the bot still starts even if pdf-parse is not installed
    let pdfParse;
    try {
        pdfParse = require('pdf-parse');
    } catch (e) {
        throw new Error('pdf-parse is not installed. Run: npm install pdf-parse');
    }

    const result = await pdfParse(buffer);
    return result.text || '';
}

/**
 * Process a PDF file shared in WhatsApp:
 *   1. Extract text from the PDF
 *   2. Send the text to Ollama's extractExpense() to get structured data
 *
 * @param {Buffer} buffer - Raw PDF file bytes
 * @param {string} caption - WhatsApp caption (filename / description)
 * @returns {Promise<{ type: 'expense', data: object } | null>}
 */
async function processPDFExpense(buffer, caption) {
    logger.info(` Extracting text from PDF...`);

    let pdfText;
    try {
        pdfText = await extractTextFromPDF(buffer);
    } catch (err) {
        logger.error(` PDF text extraction failed: ${err.message}`);
        return null;
    }

    if (!pdfText || pdfText.trim().length < 10) {
        logger.warn(' PDF appears to be empty or image-only — no text extracted');
        // For image-only PDFs (scanned bills), fall back gracefully
        return null;
    }

    const trimmedText = pdfText.trim().substring(0, 3000); // Limit to 3000 chars for Ollama
    logger.info(` Extracted ${pdfText.length} chars from PDF. Sending to AI for expense extraction...`);

    // Combine caption + extracted PDF text so the AI has full context
    const combinedText = caption
        ? `File: ${caption}\n\n${trimmedText}`
        : trimmedText;

    try {
        const data = await extractExpense(combinedText);
        if (!data) {
            logger.warn(' AI could not extract expense data from PDF text');
            return null;
        }

        logger.info(` PDF expense extracted: ₹${data.amount} — ${data.description}`);
        return { type: 'expense', data };
    } catch (err) {
        logger.error(` AI expense extraction from PDF failed: ${err.message}`);
        return null;
    }
}

module.exports = { extractTextFromPDF, processPDFExpense };
