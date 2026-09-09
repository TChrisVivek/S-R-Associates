const axios = require('axios');
const logger = require('./utils/logger');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const LLAVA_MODEL = process.env.LLAVA_MODEL || 'llava';
const TIMEOUT = 120000; // 2 minutes — LLaVA + image analysis is slower

// ─── Bill Keyword Detection ───────────────────────────────────────────────────
// Keywords that indicate a photo is a bill/invoice/challan rather than a site photo
const BILL_KEYWORDS = [
    'bill', 'bills', 'invoice', 'invoices',
    'challan', 'challans',
    'rmc', 'receipt', 'receipts',
    'payment', 'voucher',
    'delivery note', 'delivery slip',
    'purchase order', 'po',
    'expense', 'expenses',
];

/**
 * Check if an image caption suggests this is a bill/invoice photo.
 * Examples: "Yesterday RMC bills", "Cement challan", "Invoice from supplier"
 *
 * @param {string} caption - The WhatsApp caption text
 * @returns {boolean}
 */
function isBillImage(caption) {
    if (!caption) return false;
    const lower = caption.toLowerCase();
    return BILL_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Send a bill photo to LLaVA (Ollama vision model) and extract structured data.
 *
 * LLaVA reads the image visually and returns:
 *   - For delivery challans: supplier, material, quantity, amount
 *   - For expense receipts: vendor, amount, description
 *
 * @param {string} imageBase64 - Base64-encoded image data
 * @param {string} caption - The WhatsApp caption (used as context)
 * @returns {Promise<{ type: 'delivery'|'expense', data: object } | null>}
 */
async function extractFromBillImage(imageBase64, caption) {
    logger.info(`  Sending bill image to LLaVA for analysis...`);

    const prompt = `You are analyzing a photo of a construction site bill, invoice, challan, or receipt from India.
The image caption says: "${caption || 'Bill photo'}"

Look at the image carefully and extract all visible text and numbers.

Decide if this is:
1. A DELIVERY CHALLAN / DELIVERY NOTE — for materials received at site (RMC concrete, cement, steel, sand, etc.)
2. An EXPENSE RECEIPT / INVOICE — a bill for work done or items purchased

Return ONLY valid JSON in one of these two formats:

If it's a delivery challan:
{
  "type": "delivery",
  "supplier": "company name from the document",
  "materialName": "what was delivered (e.g., RMC Concrete, Cement, Sand)",
  "unit": "unit of measurement (cum, bags, tons, kg, etc.)",
  "quantity": number,
  "totalCost": number or 0 if not visible,
  "notes": "any other useful info from the document"
}

If it's an expense receipt/invoice:
{
  "type": "expense",
  "supplier": "vendor or company name",
  "amount": number,
  "category": "Material / Labor / Logistics / Equipment / Other",
  "description": "what the expense was for",
  "notes": "any other useful info"
}

If you cannot read the image clearly, return: {"type": "unreadable"}`;

    try {
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
            model: LLAVA_MODEL,
            prompt,
            images: [imageBase64],
            stream: false,
            format: 'json',
            options: {
                temperature: 0.1,
                num_predict: 512
            }
        }, {
            timeout: TIMEOUT
        });

        const raw = response.data.response;
        const data = JSON.parse(raw);

        if (!data.type || data.type === 'unreadable') {
            logger.warn('  LLaVA could not read the bill image clearly');
            return null;
        }

        logger.info(`  LLaVA extracted: type=${data.type}, supplier="${data.supplier}"`);

        if (data.type === 'delivery') {
            if (!data.materialName) {
                logger.warn('  LLaVA delivery result missing materialName');
                return null;
            }
            return {
                type: 'delivery',
                data: {
                    blockName: 'General',
                    materialName: data.materialName || 'Unknown Material',
                    unit: data.unit || 'units',
                    quantity: parseFloat(data.quantity) || 0,
                    supplier: data.supplier || 'Unknown',
                    totalCost: parseFloat(data.totalCost) || 0,
                    notes: data.notes || caption
                }
            };
        }

        if (data.type === 'expense') {
            return {
                type: 'expense',
                data: {
                    amount: parseFloat(data.amount) || 0,
                    category: data.category || 'Material',
                    supplier: data.supplier || 'Unknown',
                    description: data.description || caption,
                    notes: data.notes || caption
                }
            };
        }

        return null;
    } catch (err) {
        // If LLaVA model is not installed, log a clear helpful message
        if (err.response?.data?.error?.includes('model') || err.message.includes('model')) {
            logger.error(`  LLaVA model not found. Run: ollama pull llava`);
        } else {
            logger.error(`  LLaVA image extraction failed: ${err.message}`);
        }
        return null;
    }
}

module.exports = { isBillImage, extractFromBillImage };
