const PendingUpdate = require('../models/PendingUpdate');
const Project = require('../models/Project');
const Block = require('../models/Block');
const DailyLog = require('../models/DailyLog');
const Material = require('../models/Material');
const Expense = require('../models/Expense');
const Settings = require('../models/Settings');
const logActivity = require('../utils/activityLogger');

// ─── PENDING QUEUE ────────────────────────────────────────────────────────────

/**
 * Save a parsed entry to the pending approval queue.
 * Called by the bot after Ollama extraction.
 */
exports.savePending = async (req, res) => {
    try {
        const { projectId, type, data, rawMessage, senderName, senderPhone, groupName, attachments } = req.body;

        if (!projectId || !type || !data || !rawMessage || !groupName) {
            return res.status(400).json({ message: 'Missing required fields: projectId, type, data, rawMessage, groupName' });
        }

        if (!['daily_log', 'delivery', 'expense'].includes(type)) {
            return res.status(400).json({ message: 'type must be "daily_log", "delivery", or "expense"' });
        }

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: `Project not found: ${projectId}` });
        }

        const pending = new PendingUpdate({
            project_id: projectId,
            type,
            data,
            rawMessage,
            senderName: senderName || 'Unknown',
            senderPhone: senderPhone || '',
            groupName,
            attachments: attachments || [],
            status: 'pending'
        });

        await pending.save();

        logActivity(req.user._id, 'BOT_QUEUED_UPDATE', 'PendingUpdate',
            `Bot queued ${type} for "${project.title}" from ${senderName}`, pending._id);

        res.status(201).json({
            message: 'Entry queued for approval',
            id: pending._id,
            projectTitle: project.title
        });
    } catch (error) {
        console.error('Save Pending Error:', error);
        res.status(500).json({ message: 'Error saving pending entry', error: error.message });
    }
};

/**
 * Get all pending entries for today, grouped by project.
 * Used by the bot's EOD summary cron.
 */
exports.getTodayPending = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const entries = await PendingUpdate.find({
            status: 'pending',
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: 1 });

        // Group by project
        const grouped = {};
        for (const entry of entries) {
            const projId = entry.project_id.toString();
            if (!grouped[projId]) {
                const project = await Project.findById(projId).select('title');
                grouped[projId] = {
                    projectId: projId,
                    projectName: project ? project.title : 'Unknown Project',
                    entries: []
                };
            }
            grouped[projId].entries.push({
                id: entry._id.toString(),
                type: entry.type,
                data: entry.data,
                rawMessage: entry.rawMessage,
                senderName: entry.senderName,
                attachments: entry.attachments,
                createdAt: entry.createdAt
            });
        }

        res.json({
            date: startOfDay.toISOString().split('T')[0],
            totalPending: entries.length,
            projects: Object.values(grouped)
        });
    } catch (error) {
        console.error('Get Today Pending Error:', error);
        res.status(500).json({ message: 'Error fetching pending entries', error: error.message });
    }
};

/**
 * Get all unapproved entries (including from previous days).
 * Used for the morning reminder if Admin didn't reply.
 */
exports.getAllPending = async (req, res) => {
    try {
        const entries = await PendingUpdate.find({ status: 'pending' }).sort({ createdAt: 1 });

        const grouped = {};
        for (const entry of entries) {
            const projId = entry.project_id.toString();
            if (!grouped[projId]) {
                const project = await Project.findById(projId).select('title');
                grouped[projId] = {
                    projectId: projId,
                    projectName: project ? project.title : 'Unknown Project',
                    entries: []
                };
            }
            grouped[projId].entries.push({
                id: entry._id.toString(),
                type: entry.type,
                data: entry.data,
                rawMessage: entry.rawMessage,
                senderName: entry.senderName,
                attachments: entry.attachments,
                createdAt: entry.createdAt
            });
        }

        res.json({
            totalPending: entries.length,
            projects: Object.values(grouped)
        });
    } catch (error) {
        console.error('Get All Pending Error:', error);
        res.status(500).json({ message: 'Error fetching pending entries', error: error.message });
    }
};

// ─── APPROVAL / REJECTION ─────────────────────────────────────────────────────

/**
 * Approve pending entries — writes them to the real DailyLog / Material collections.
 * Accepts either specific IDs or a batchId.
 */
exports.approveEntries = async (req, res) => {
    try {
        const { ids, batchId } = req.body;

        let entries;
        if (batchId) {
            entries = await PendingUpdate.find({ batchId, status: 'pending' });
        } else if (ids && Array.isArray(ids) && ids.length > 0) {
            entries = await PendingUpdate.find({ _id: { $in: ids }, status: 'pending' });
        } else {
            return res.status(400).json({ message: 'Provide either "ids" (array) or "batchId"' });
        }

        if (entries.length === 0) {
            return res.status(404).json({ message: 'No pending entries found to approve' });
        }

        const results = [];

        for (const entry of entries) {
            try {
                if (entry.type === 'daily_log') {
                    await commitDailyLog(entry, req.user);
                } else if (entry.type === 'delivery') {
                    await commitDelivery(entry, req.user);
                } else if (entry.type === 'expense') {
                    await commitExpense(entry, req.user);
                }

                entry.status = 'approved';
                entry.approvedAt = new Date();
                await entry.save();

                results.push({ id: entry._id.toString(), status: 'approved' });
            } catch (commitError) {
                console.error(`Failed to commit entry ${entry._id}:`, commitError);
                results.push({ id: entry._id.toString(), status: 'error', error: commitError.message });
            }
        }

        const approvedCount = results.filter(r => r.status === 'approved').length;
        logActivity(req.user._id, 'BOT_APPROVED_ENTRIES', 'PendingUpdate',
            `Admin approved ${approvedCount} entries via bot`);

        res.json({
            message: `${approvedCount} of ${entries.length} entries approved and committed`,
            results
        });
    } catch (error) {
        console.error('Approve Entries Error:', error);
        res.status(500).json({ message: 'Error approving entries', error: error.message });
    }
};

/**
 * Reject pending entries.
 */
exports.rejectEntries = async (req, res) => {
    try {
        const { ids, batchId } = req.body;

        let filter;
        if (batchId) {
            filter = { batchId, status: 'pending' };
        } else if (ids && Array.isArray(ids) && ids.length > 0) {
            filter = { _id: { $in: ids }, status: 'pending' };
        } else {
            return res.status(400).json({ message: 'Provide either "ids" (array) or "batchId"' });
        }

        const result = await PendingUpdate.updateMany(filter, {
            $set: { status: 'rejected', rejectedAt: new Date() }
        });

        logActivity(req.user._id, 'BOT_REJECTED_ENTRIES', 'PendingUpdate',
            `Admin rejected ${result.modifiedCount} entries via bot`);

        res.json({
            message: `${result.modifiedCount} entries rejected`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Reject Entries Error:', error);
        res.status(500).json({ message: 'Error rejecting entries', error: error.message });
    }
};

/**
 * Commits a pending expense entry to the Expense collection.
 */
async function commitExpense(entry, user) {
    const projectId = entry.project_id;
    const { amount, category, supplier, description } = entry.data;

    // Validate enum for category
    const validCategories = [
        'Vendor', 'Labor', 'Equipment', 'Material', 'Miscellaneous', 'Extension',
        'Food Allowance', 'Travel Allowance', 'Fuel Allowance', 'Bonus', 'GST'
    ];
    
    let safeCategory = 'Miscellaneous';
    if (category) {
        // Try to match the LLM string to a valid category ignoring case
        const matched = validCategories.find(c => c.toLowerCase() === category.toLowerCase());
        if (matched) safeCategory = matched;
        else if (category.toLowerCase() === 'food' || category.toLowerCase() === 'meals') safeCategory = 'Food Allowance';
        else if (category.toLowerCase() === 'travel' || category.toLowerCase() === 'transport') safeCategory = 'Travel Allowance';
    }

    const title = supplier && supplier !== 'Unknown' 
        ? `Bill from ${supplier}` 
        : `Expense: ${safeCategory}`;

    const newExpense = new Expense({
        title,
        description: description || 'No details provided.',
        amount: parseFloat(amount) || 0,
        category: safeCategory,
        project: projectId,
        submittedBy: user && user._id ? user._id : null,
        status: 'Approved',
        receipt: entry.attachments && entry.attachments.length > 0 ? entry.attachments[0] : undefined
    });

    await newExpense.save();

    if (user && user._id) {
        logActivity(user._id, 'BOT_CREATED_EXPENSE', 'Expense',
            `Bot created expense: ${title} (₹${amount})`, projectId);
    }

    return newExpense;
}

/**
 * Assign a batchId to a set of pending entries (used before sending the EOD message).
 */
exports.assignBatch = async (req, res) => {
    try {
        const { ids, batchId } = req.body;

        if (!ids || !batchId) {
            return res.status(400).json({ message: 'Provide "ids" and "batchId"' });
        }

        await PendingUpdate.updateMany(
            { _id: { $in: ids }, status: 'pending' },
            { $set: { batchId } }
        );

        res.json({ message: `Batch "${batchId}" assigned to ${ids.length} entries` });
    } catch (error) {
        console.error('Assign Batch Error:', error);
        res.status(500).json({ message: 'Error assigning batch', error: error.message });
    }
};

// ─── PROJECT DISCOVERY ────────────────────────────────────────────────────────

/**
 * List all projects with their blocks. Used by the bot for auto-discovery
 * (matching WhatsApp group names to project titles).
 */
exports.listProjects = async (req, res) => {
    try {
        const projects = await Project.find({}).select('title status blockMode');

        const projectsWithBlocks = await Promise.all(projects.map(async (project) => {
            const blocks = await Block.find({ project_id: project._id }).select('name description status').sort({ order: 1 });
            return {
                id: project._id.toString(),
                title: project.title,
                status: project.status,
                blockMode: project.blockMode,
                blocks: blocks.map(b => ({
                    id: b._id.toString(),
                    name: b.name,
                    status: b.status
                }))
            };
        }));

        res.json({ projects: projectsWithBlocks });
    } catch (error) {
        console.error('List Projects Error:', error);
        res.status(500).json({ message: 'Error listing projects', error: error.message });
    }
};

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────

/**
 * Upload a file (PDF/image) from the bot.
 * Uses multer configured in the route.
 */
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            message: 'File uploaded successfully',
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload File Error:', error);
        res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
};

// ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

/**
 * Commits a pending daily_log entry to the real DailyLog collection.
 * Resolves blockName to blockId via fuzzy matching.
 */
async function commitDailyLog(entry, user) {
    const projectId = entry.project_id;
    const { blockName, laborers, labourBreakdown, notes, weatherCondition, day, taskCompleted,
            clearanceType, clearanceStatus } = entry.data;

    // Resolve block by name
    let blockId = null;
    if (blockName) {
        const blocks = await Block.find({ project_id: projectId });
        const matchedBlock = fuzzyMatchBlock(blockName, blocks);
        if (matchedBlock) {
            blockId = matchedBlock._id;
        }
    }

    // If no block matched, try to use the first/default block
    if (!blockId) {
        const defaultBlock = await Block.findOne({ project_id: projectId }).sort({ order: 1 });
        if (defaultBlock) {
            blockId = defaultBlock._id;
        }
    }

    const combinedNotes = taskCompleted
        ? `${taskCompleted}${notes && notes !== taskCompleted ? ' — ' + notes : ''}`
        : (notes || entry.rawMessage);

    // ── Aggregation: Only one log per day per block ───────────────────────────
    const logDate = new Date(entry.createdAt || new Date());
    const startOfDay = new Date(logDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    let existingLog = await DailyLog.findOne({
        project_id: projectId,
        block_id: blockId,
        date: { $gte: startOfDay, $lt: endOfDay }
    });

    if (existingLog) {
        // Merge with existing log
        existingLog.laborers += (parseInt(laborers) || 0);

        // Merge labour breakdown: accumulate counts by role
        if (labourBreakdown && labourBreakdown.length > 0) {
            const existing = existingLog.labourBreakdown || [];
            for (const entry of labourBreakdown) {
                const found = existing.find(e => e.role === entry.role);
                if (found) { found.count += entry.count; }
                else { existing.push({ role: entry.role, count: entry.count }); }
            }
            existingLog.labourBreakdown = existing;
        }

        // Only append notes if there's actual content
        if (combinedNotes && combinedNotes.trim()) {
            existingLog.notes = existingLog.notes ? `${existingLog.notes}\n\n[Update] ${combinedNotes}` : combinedNotes;
        }

        // Update weather if previous was empty/not recorded
        if (weatherCondition && weatherCondition !== 'Not recorded' && 
           (!existingLog.weather.condition || existingLog.weather.condition === 'Not recorded')) {
            existingLog.weather.condition = weatherCondition;
        }

        // Merge gallery
        if (entry.attachments && entry.attachments.length > 0) {
            existingLog.gallery = [...(existingLog.gallery || []), ...entry.attachments];
        }

        await existingLog.save();

        if (user && user._id) {
            logActivity(user._id, 'BOT_UPDATED_DAILY_LOG', 'DailyLog',
                `Bot appended to daily log: "${combinedNotes.substring(0, 40)}..."`, projectId);
        }

        return existingLog;
    }

    // Create a new log if none exists for today
    const newLog = new DailyLog({
        project_id: projectId,
        block_id: blockId,
        date: logDate,
        day: day || getDayName(logDate),
        weather: { condition: weatherCondition || 'Not recorded' },
        laborers: parseInt(laborers) || 0,
        labourBreakdown: labourBreakdown || [],
        clearanceType: clearanceType || undefined,
        clearanceStatus: clearanceStatus || undefined,
        notes: combinedNotes,
        gallery: entry.attachments || []
    });

    await newLog.save();

    if (user && user._id) {
        logActivity(user._id, 'BOT_CREATED_DAILY_LOG', 'DailyLog',
            `Bot created daily log: "${combinedNotes.substring(0, 60)}..."`, projectId);
    }

    return newLog;
}

/**
 * Commits a pending delivery entry to the real Material collection.
 * Delegates to the same logic as blockController.logBlockDelivery.
 */
async function commitDelivery(entry, user) {
    const projectId = entry.project_id;
    const { blockName, materialName, unit, quantity, supplier, totalCost } = entry.data;

    if (!materialName || !quantity) {
        throw new Error('Delivery requires materialName and quantity');
    }

    // Resolve block
    let blockId = null;
    if (blockName) {
        const blocks = await Block.find({ project_id: projectId });
        const matchedBlock = fuzzyMatchBlock(blockName, blocks);
        if (matchedBlock) blockId = matchedBlock._id;
    }

    if (!blockId) {
        const defaultBlock = await Block.findOne({ project_id: projectId }).sort({ order: 1 });
        if (defaultBlock) blockId = defaultBlock._id;
    }

    const parsedQuantity = parseFloat(quantity) || 0;
    const parsedTotalCost = parseFloat(totalCost) || 0;

    // Find or create material
    const escapedName = materialName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const query = blockId
        ? { block_id: blockId, name: new RegExp('^' + escapedName + '$', 'i') }
        : { project_id: projectId, name: new RegExp('^' + escapedName + '$', 'i') };

    let material = await Material.findOne(query);

    if (!material) {
        material = new Material({
            project_id: projectId,
            block_id: blockId,
            name: materialName,
            unit: unit || 'units',
            iconType: 'box'
        });
    }

    material.inflow += parsedQuantity;
    material.balance += parsedQuantity;
    if (parsedQuantity > 0 && parsedTotalCost > 0) {
        material.unitPrice = parsedTotalCost / parsedQuantity;
    }

    material.logs.push({
        type: 'delivery',
        quantity: parsedQuantity,
        supplier: supplier || 'Unknown',
        totalCost: parsedTotalCost,
        deliveryChallanUrl: entry.attachments && entry.attachments.length > 0 ? entry.attachments[0] : undefined
    });

    await material.save();

    // Auto-create expense
    if (parsedTotalCost > 0 && user && user._id) {
        try {
            const newExpense = new Expense({
                title: `Material Delivery: ${materialName}`,
                description: `Bot entry: ${parsedQuantity} ${unit || 'units'} from ${supplier || 'supplier'}`,
                amount: parsedTotalCost,
                category: 'Material',
                project: projectId,
                submittedBy: user._id,
                status: 'Approved'
            });
            await newExpense.save();
        } catch (expenseErr) {
            console.error('Failed to auto-create expense from bot delivery:', expenseErr);
        }
    }

    if (user && user._id) {
        logActivity(user._id, 'BOT_LOGGED_DELIVERY', 'Material',
            `Bot logged delivery: ${parsedQuantity} ${unit || 'units'} of ${materialName}`, material._id);
    }

    return material;
}

/**
 * Fuzzy-match a block name against the list of blocks for a project.
 * Returns the best matching Block document or null.
 */
function fuzzyMatchBlock(inputName, blocks) {
    if (!inputName || !blocks || blocks.length === 0) return null;

    const input = inputName.toLowerCase().trim();

    // Exact match first
    const exact = blocks.find(b => b.name.toLowerCase().trim() === input);
    if (exact) return exact;

    // Substring match: input is contained in block name or vice versa
    const substring = blocks.find(b =>
        b.name.toLowerCase().includes(input) || input.includes(b.name.toLowerCase())
    );
    if (substring) return substring;

    // Word overlap match
    const inputWords = input.split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;

    for (const block of blocks) {
        const blockWords = block.name.toLowerCase().split(/\s+/);
        const overlap = inputWords.filter(w => blockWords.includes(w)).length;
        const score = overlap / Math.max(inputWords.length, blockWords.length);

        if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = block;
        }
    }

    return bestMatch;
}

/**
 * Get the day name from a Date object.
 */
function getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
}

// ─── Settings (Bot-Accessible) ───────────────────────────────────────────────

/**
 * Return the labourRoles array from Settings so the bot can merge
 * custom shortcodes into its LABOUR_ROLE_MAP at startup.
 */
exports.getLabourRoles = async (req, res) => {
    try {
        const settings = await Settings.findOne();
        const labourRoles = settings?.labourRoles || [];
        res.status(200).json({ labourRoles });
    } catch (err) {
        console.error('getLabourRoles error:', err);
        res.status(500).json({ message: 'Failed to fetch labour roles', error: err.message });
    }
};
