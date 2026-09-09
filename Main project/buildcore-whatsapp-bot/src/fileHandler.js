const logger = require('./utils/logger');
const api = require('./apiClient');
const { classifyAndExtract } = require('./messageRouter');
const { getBlockNames } = require('./projectDiscovery');
const { isBillImage, extractFromBillImage } = require('./ocrHandler');
const { processPDFExpense } = require('./pdfExtractor');

/**
 * Handle a media message (PDF, image) from a WhatsApp group.
 *
 * Processing flow:
 *   PDF  → extract text with pdf-parse → Ollama extractExpense()
 *   Image (bill caption) → LLaVA vision model reads bill → delivery/expense entry
 *   Image (normal caption) → classifyAndExtract() on caption text → daily log
 *
 * @param {object} msg - The WhatsApp message object
 * @param {object} project - The matched project { projectId, title, blocks }
 * @param {string} senderName - Who sent the message
 * @param {string} groupName - WhatsApp group name
 */
async function handleMediaMessage(msg, project, senderName, groupName) {
    try {
        let media = null;
        let attempts = 0;
        
        // Retry downloading media up to 3 times with delays.
        // For messages sent from the bot's own phone (fromMe: true),
        // message_create fires *immediately* before the image finishes uploading,
        // causing downloadMedia() to crash with 'r'.
        while (attempts < 3 && !media) {
            try {
                attempts++;
                media = await msg.downloadMedia();
            } catch (err) {
                if (attempts >= 3) throw err;
                logger.info(`   ⏳ Media not ready (attempt ${attempts}/3). Waiting 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (!media) {
            logger.warn(`Could not download media from ${senderName} in "${groupName}"`);
            return;
        }

        // Only process PDFs and images
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(media.mimetype)) {
            logger.info(`⏭️  Skipped unsupported media type: ${media.mimetype}`);
            return;
        }

        // Generate a filename
        const ext = media.mimetype.split('/')[1] === 'pdf' ? '.pdf'
            : media.mimetype.includes('jpeg') ? '.jpg'
            : media.mimetype.includes('png') ? '.png'
            : '.webp';
        const filename = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}${ext}`;

        // Upload to backend
        const buffer = Buffer.from(media.data, 'base64');
        logger.info(`📤 Uploading ${filename} (${(buffer.length / 1024).toFixed(1)} KB)...`);

        const uploadResult = await api.uploadFile(buffer, filename, media.mimetype);
        logger.info(`✅ Uploaded: ${uploadResult.url}`);

        const caption = msg.body?.trim() || '';
        const isPDF = media.mimetype === 'application/pdf';
        const isImage = media.mimetype.startsWith('image/');

        let entryType = 'daily_log';
        let entryData = {
            blockName: 'General',
            laborers: 0,
            taskCompleted: caption || `Document uploaded: ${filename}`,
            weatherCondition: 'Not recorded',
            day: '',
            notes: caption || `Media attachment from ${senderName}`
        };

        // ── Phase 2B: PDF → Extract text → Expense via Ollama ─────────────────
        if (isPDF) {
            logger.info(`📄 PDF detected — attempting text extraction...`);
            const pdfResult = await processPDFExpense(buffer, caption || filename);

            if (pdfResult) {
                entryType = pdfResult.type;
                entryData = pdfResult.data;
                logger.info(`📄 PDF routed as ${entryType}`);
            } else {
                // PDF parse failed or empty — save as a generic daily log note
                logger.warn(`📄 Could not extract from PDF — saving as note`);
                entryData.taskCompleted = `PDF document: ${caption || filename}`;
                entryData.notes = `PDF shared by ${senderName}: ${caption || filename}`;
            }
        }

        // ── Phase 2A: Bill Image → LLaVA reads the photo ──────────────────────
        else if (isImage && isBillImage(caption)) {
            logger.info(`🖼️  Bill keyword detected in caption — routing to LLaVA...`);
            const ocrResult = await extractFromBillImage(media.data, caption);

            if (ocrResult) {
                entryType = ocrResult.type;
                entryData = ocrResult.data;
                logger.info(`🖼️  Bill image routed as ${entryType}`);
            } else {
                // LLaVA unavailable or unreadable — fall back to caption-based extraction
                logger.warn(`🖼️  LLaVA extraction failed — falling back to caption text`);
                if (caption.length > 5) {
                    const blockNames = getBlockNames(project.projectId);
                    const result = await classifyAndExtract(caption, blockNames);
                    if (result) {
                        entryType = result.type;
                        entryData = result.data;
                    }
                }
            }
        }

        // ── Standard Image: Caption-based classification ───────────────────────
        else if (isImage && caption.length > 5) {
            const blockNames = getBlockNames(project.projectId);
            const result = await classifyAndExtract(caption, blockNames);
            if (result) {
                entryType = result.type;
                entryData = result.data;
            }
        }

        // Queue as a pending entry with the attachment
        const response = await api.savePending({
            projectId: project.projectId,
            type: entryType,
            data: entryData,
            rawMessage: caption || `[Media: ${media.mimetype}] ${filename}`,
            senderName,
            senderPhone: msg.author || '',
            groupName,
            attachments: [uploadResult.url]
        });

        logger.info(`✅ Queued ${entryType} media entry for "${project.title}"`);

        // ── Auto-Approve (bypass admin) ──────────────────────────────────────────
        if (process.env.AUTO_APPROVE === 'true') {
            await api.approveEntries({ ids: [response.id] });
            logger.info(`🚀 Auto-approved media entry for "${project.title}" and saved to DB!`);
        }
    } catch (err) {
        logger.error(`Failed to handle media: ${err.message}`);
    }
}

module.exports = { handleMediaMessage };
