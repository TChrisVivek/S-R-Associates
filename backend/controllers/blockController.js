const Block = require('../models/Block');
const DailyLog = require('../models/DailyLog');
const Material = require('../models/Material');
const Pin = require('../models/Pin');
const Expense = require('../models/Expense');
const logActivity = require('../utils/activityLogger');

// ─── BLOCK CRUD ──────────────────────────────────────────────────────────────

exports.getProjectBlocks = async (req, res) => {
    const { projectId } = req.params;
    try {
        const blocks = await Block.find({ project_id: projectId }).sort({ order: 1, createdAt: 1 });

        // Enrich with counts for the Hub card display
        const enriched = await Promise.all(blocks.map(async (block) => {
            const logCount = await DailyLog.countDocuments({ block_id: block._id });
            const matCount = await Material.countDocuments({ block_id: block._id });
            const blueprintCount = block.blueprints ? block.blueprints.length : 0;
            return {
                _id: block._id,
                name: block.name,
                description: block.description,
                status: block.status,
                order: block.order,
                blueprints: block.blueprints || [],
                logCount,
                materialCount: matCount,
                createdAt: block.createdAt
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Get Blocks Error:', error);
        res.status(500).json({ message: 'Error fetching blocks', error: error.message });
    }
};

exports.createBlock = async (req, res) => {
    const { projectId } = req.params;
    const { name, description, status } = req.body;
    try {
        // Determine next order value
        const count = await Block.countDocuments({ project_id: projectId });

        const block = new Block({
            project_id: projectId,
            name,
            description,
            status: status || 'Not Started',
            order: count
        });

        await block.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'CREATED_BLOCK', 'Block', `Created block "${name}" in project`, projectId);
        }

        res.status(201).json(block);
    } catch (error) {
        console.error('Create Block Error:', error);
        res.status(500).json({ message: 'Error creating block', error: error.message });
    }
};

exports.getBlockById = async (req, res) => {
    const { blockId } = req.params;
    try {
        const block = await Block.findById(blockId);
        if (!block) return res.status(404).json({ message: 'Block not found' });
        res.json(block);
    } catch (error) {
        console.error('Get Block Error:', error);
        res.status(500).json({ message: 'Error fetching block', error: error.message });
    }
};

exports.updateBlock = async (req, res) => {
    const { blockId } = req.params;
    const { name, description, status, order } = req.body;
    try {
        const block = await Block.findById(blockId);
        if (!block) return res.status(404).json({ message: 'Block not found' });

        if (name !== undefined) block.name = name;
        if (description !== undefined) block.description = description;
        if (status !== undefined) block.status = status;
        if (order !== undefined) block.order = order;

        await block.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'UPDATED_BLOCK', 'Block', `Updated block "${block.name}"`, block.project_id);
        }

        res.json(block);
    } catch (error) {
        console.error('Update Block Error:', error);
        res.status(500).json({ message: 'Error updating block', error: error.message });
    }
};

exports.deleteBlock = async (req, res) => {
    const { blockId } = req.params;
    try {
        const block = await Block.findById(blockId);
        if (!block) return res.status(404).json({ message: 'Block not found' });

        // Cascade delete all child data
        await DailyLog.deleteMany({ block_id: blockId });
        await Material.deleteMany({ block_id: blockId });
        await Pin.deleteMany({ block_id: blockId });
        await Block.findByIdAndDelete(blockId);

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'DELETED_BLOCK', 'Block', `Deleted block "${block.name}" and its data`, block.project_id);
        }

        res.json({ message: 'Block and all its data deleted successfully' });
    } catch (error) {
        console.error('Delete Block Error:', error);
        res.status(500).json({ message: 'Error deleting block', error: error.message });
    }
};

// ─── BLUEPRINT MANAGEMENT (Block-scoped) ─────────────────────────────────────

exports.uploadBlockBlueprint = async (req, res) => {
    const { blockId } = req.params;
    try {
        const { plans } = req.body;

        if (!plans || !Array.isArray(plans) || plans.length === 0) {
            return res.status(400).json({ message: 'No URLs provided in plans array.' });
        }

        const block = await Block.findById(blockId);
        if (!block) return res.status(404).json({ message: 'Block not found' });

        const uploadedFiles = plans.map(url => ({
            name: 'Document',
            url: url,
            originalUrl: url,
        }));

        block.blueprints.push(...uploadedFiles);
        await block.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'UPLOADED_BLUEPRINT', 'Block', `Uploaded ${uploadedFiles.length} blueprint(s) to block "${block.name}"`, block.project_id);
        }

        res.status(200).json({ message: 'Upload Successful', blueprints: block.blueprints });
    } catch (error) {
        console.error('Block Blueprint Upload Error:', error);
        res.status(500).json({ message: 'Error uploading blueprint' });
    }
};

exports.deleteBlockBlueprint = async (req, res) => {
    const { blockId, blueprintId } = req.params;
    try {
        const block = await Block.findById(blockId);
        if (!block) return res.status(404).json({ message: 'Block not found' });

        block.blueprints = block.blueprints.filter(bp => bp._id.toString() !== blueprintId);
        await block.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'DELETED_BLUEPRINT', 'Block', `Deleted a blueprint from block "${block.name}"`, block.project_id);
        }

        res.json({ message: 'Blueprint deleted successfully' });
    } catch (error) {
        console.error('Delete Block Blueprint Error:', error);
        res.status(500).json({ message: 'Error deleting blueprint' });
    }
};

// ─── BLUEPRINT TASKS / PINS (Block-scoped) ────────────────────────────────────

exports.getBlockBlueprintAndTasks = async (req, res) => {
    const { projectId, blockId } = req.params;
    try {
        const block = await Block.findById(blockId);
        if (!block) return res.status(404).json({ message: 'Block not found' });

        const allBlueprints = (block.blueprints || []).map((bp, index) => ({
            id: bp._id.toString(),
            name: bp.name || `Blueprint ${index + 1}`,
            imageUrl: bp.url,
            uploadedAt: bp.uploadedAt
        }));

        const latestBlueprint = allBlueprints.length > 0 ? allBlueprints[allBlueprints.length - 1] : null;

        const pins = await Pin.find({ block_id: blockId });

        const tasks = pins.map(pin => {
            let status = 'PENDING';
            if (pin.status === 'In Progress') status = 'IN PROGRESS';
            else if (pin.status === 'Closed') status = 'DONE';

            let color = '#f59e0b';
            if (status === 'IN PROGRESS') color = '#6366f1';
            else if (status === 'DONE') color = '#10b981';

            return {
                id: pin._id.toString(),
                blueprint_id: pin.blueprint_id ? pin.blueprint_id.toString() : null,
                title: pin.title,
                status,
                assignee: 'Unassigned',
                x: pin.x_cord,
                y: pin.y_cord,
                page: pin.page || 1,
                color
            };
        });

        res.json({ blueprint: latestBlueprint, blueprints: allBlueprints, tasks: tasks.reverse() });
    } catch (error) {
        console.error('Error fetching block blueprint data:', error);
        res.status(500).json({ message: 'Error fetching blueprint data' });
    }
};

exports.addBlockBlueprintTask = async (req, res) => {
    const { projectId, blockId } = req.params;
    const { title, x, y, status, blueprint_id, page } = req.body;
    try {
        const block = await Block.findById(blockId);
        if (!block) return res.status(404).json({ message: 'Block not found' });

        let dbStatus = 'Open';
        if (status === 'IN PROGRESS') dbStatus = 'In Progress';
        else if (status === 'DONE') dbStatus = 'Closed';

        const newPin = new Pin({
            project_id: projectId,
            block_id: blockId,
            blueprint_id: blueprint_id || (block.blueprints && block.blueprints.length > 0 ? block.blueprints[0]._id : new (require('mongoose').Types.ObjectId)()),
            title: title || 'New Task',
            x_cord: x,
            y_cord: y,
            status: dbStatus,
            page: page || 1
        });

        await newPin.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'ADDED_BLUEPRINT_TASK', 'Block', `Added blueprint task "${newPin.title}" to block "${block.name}"`, projectId);
        }

        res.status(201).json({
            id: newPin._id.toString(),
            blueprint_id: newPin.blueprint_id.toString(),
            title: newPin.title,
            status: status || 'PENDING',
            assignee: 'Unassigned',
            x: newPin.x_cord,
            y: newPin.y_cord,
            page: newPin.page,
            color: '#f59e0b'
        });
    } catch (error) {
        console.error('Error adding block blueprint task:', error);
        res.status(500).json({ message: 'Error adding blueprint task' });
    }
};

exports.deleteBlockBlueprintTask = async (req, res) => {
    const { projectId, taskId } = req.params;
    try {
        const result = await Pin.findByIdAndDelete(taskId);
        if (!result) return res.status(404).json({ message: 'Task not found' });

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'DELETED_BLUEPRINT_TASK', 'Block', 'Deleted a blueprint task from block', projectId);
        }

        res.json({ message: 'Task deleted successfully', id: taskId });
    } catch (error) {
        console.error('Error deleting block blueprint task:', error);
        res.status(500).json({ message: 'Error deleting blueprint task' });
    }
};

// ─── DAILY LOGS (Block-scoped) ────────────────────────────────────────────────

exports.getBlockDailyLogs = async (req, res) => {
    const { blockId } = req.params;
    try {
        const logs = await DailyLog.find({ block_id: blockId }).sort({ date: -1 });

        const logsData = {
            projectPhase: 'Construction Phase',
            lastUpdated: logs.length > 0 ? new Date(logs[0].updatedAt).toLocaleString() : 'No logs yet',
            logs: logs.map(log => ({
                id: log._id.toString(),
                date: log.date,
                day: log.day,
                weather: {
                    condition: log.weather?.condition || 'Sunny',
                    icon: (log.weather?.condition || 'Sunny').toLowerCase()
                },
                laborers: log.laborers,
                notes: log.notes,
                gallery: log.gallery || []
            }))
        };

        res.json(logsData);
    } catch (error) {
        console.error('Error fetching block daily logs:', error);
        res.status(500).json({ message: 'Error fetching daily logs' });
    }
};

exports.createBlockDailyLog = async (req, res) => {
    const { projectId, blockId } = req.params;
    try {
        const { date, day, weatherCondition, laborers, notes, gallery } = req.body;

        const newLog = new DailyLog({
            project_id: projectId,
            block_id: blockId,
            date: date || new Date(),
            day,
            weather: { condition: weatherCondition },
            laborers: parseInt(laborers) || 0,
            notes,
            gallery: gallery || []
        });

        await newLog.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'CREATED_DAILY_LOG', 'Block', `Created daily log for ${day || 'a day'} in block`, blockId);
        }

        res.status(201).json({ message: 'Daily log created successfully', log: newLog });
    } catch (error) {
        console.error('Error creating block daily log:', error);
        res.status(500).json({ message: 'Error creating daily log', error: error.message });
    }
};

// ─── MATERIAL INVENTORY (Block-scoped) ────────────────────────────────────────

exports.getBlockInventory = async (req, res) => {
    const { blockId } = req.params;
    try {
        const materials = await Material.find({ block_id: blockId });

        let totalValue = 0;
        let pendingOrders = 0;
        let outOfStock = 0;
        let monthlyInflow = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const materialData = materials.map(mat => {
            const matValue = mat.balance * mat.unitPrice;
            totalValue += matValue;

            if (mat.status === 'OUT OF STOCK') { outOfStock++; pendingOrders++; }
            if (mat.status === 'LOW STOCK') pendingOrders++;

            mat.logs.forEach(log => {
                if (log.type === 'delivery') {
                    const logDate = new Date(log.date);
                    if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                        monthlyInflow += (log.totalCost || 0);
                    }
                }
            });

            return {
                id: mat._id.toString(),
                name: mat.name,
                unit: mat.unit,
                inflow: mat.inflow.toLocaleString('en-IN'),
                outflow: mat.outflow.toLocaleString('en-IN'),
                balance: mat.balance.toLocaleString('en-IN'),
                value: `₹ ${matValue.toLocaleString('en-IN')}`,
                status: mat.status,
                iconType: mat.iconType,
                lowStockThreshold: mat.lowStockThreshold ?? 50,
                logs: mat.logs
            };
        });

        let formattedInflow = `₹ ${monthlyInflow.toLocaleString('en-IN')}`;
        if (monthlyInflow >= 10000000) formattedInflow = `₹ ${(monthlyInflow / 10000000).toFixed(2)} Cr`;
        else if (monthlyInflow >= 100000) formattedInflow = `₹ ${(monthlyInflow / 100000).toFixed(1)} L`;
        else if (monthlyInflow >= 1000) formattedInflow = `₹ ${(monthlyInflow / 1000).toFixed(1)} K`;

        res.json({
            lastUpdated: new Date().toLocaleString('en-IN'),
            totalValue: `₹ ${totalValue.toLocaleString('en-IN')}`,
            summary: {
                pendingOrders: pendingOrders.toString(),
                outOfStock: `${outOfStock} Item${outOfStock !== 1 ? 's' : ''}`,
                monthlyInflow: formattedInflow
            },
            materials: materialData
        });
    } catch (error) {
        console.error('Error fetching block inventory:', error);
        res.status(500).json({ message: 'Error fetching inventory data' });
    }
};

exports.logBlockDelivery = async (req, res) => {
    const { projectId, blockId } = req.params;
    const { materialName, unit, quantity, supplier, totalCost, iconType, deliveryChallanUrl, stackPhotoUrl } = req.body;

    try {
        const parsedQuantity = parseFloat(quantity);
        const parsedTotalCost = parseFloat(totalCost);

        const escapedName = materialName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        let material = await Material.findOne({ block_id: blockId, name: new RegExp('^' + escapedName + '$', 'i') });

        if (!material) {
            material = new Material({
                project_id: projectId,
                block_id: blockId,
                name: materialName,
                unit,
                iconType: iconType || 'box'
            });
        }

        material.inflow += parsedQuantity;
        material.balance += parsedQuantity;
        if (parsedQuantity > 0 && parsedTotalCost > 0) {
            material.unitPrice = parsedTotalCost / parsedQuantity;
        }

        material.logs.push({ type: 'delivery', quantity: parsedQuantity, supplier, totalCost: parsedTotalCost, deliveryChallanUrl, stackPhotoUrl });
        await material.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'LOGGED_DELIVERY', 'Material', `Logged delivery of ${parsedQuantity} ${unit} of ${materialName}`, material._id);
        }

        // Auto-create Expense at project level (budget tracking stays at project level)
        if (parsedTotalCost > 0 && req.user && req.user._id) {
            try {
                const newExpense = new Expense({
                    title: `Material Delivery: ${materialName}`,
                    description: `Automated entry: Delivery of ${parsedQuantity} ${unit} from ${supplier || 'supplier'}`,
                    amount: parsedTotalCost,
                    category: 'Material',
                    project: projectId,
                    submittedBy: req.user._id,
                    status: 'Approved'
                });
                await newExpense.save();
            } catch (expenseErr) {
                console.error('Failed to auto-create expense from block delivery:', expenseErr);
            }
        }

        res.status(200).json(material);
    } catch (error) {
        console.error('Error logging block delivery:', error);
        res.status(500).json({ message: 'Error logging delivery' });
    }
};

exports.logBlockUsage = async (req, res) => {
    const { blockId } = req.params;
    const { materialId, quantity, locationPurpose, usagePhotoUrl } = req.body;

    try {
        const parsedQuantity = parseFloat(quantity);
        const material = await Material.findOne({ _id: materialId, block_id: blockId });
        if (!material) return res.status(404).json({ message: 'Material not found' });

        material.outflow += parsedQuantity;
        material.balance -= parsedQuantity;
        material.logs.push({ type: 'usage', quantity: parsedQuantity, locationPurpose, usagePhotoUrl });
        await material.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'LOGGED_USAGE', 'Material', `Logged usage of ${parsedQuantity} ${material.unit} of ${material.name}`, material._id);
        }

        res.status(200).json(material);
    } catch (error) {
        console.error('Error logging block usage:', error);
        res.status(500).json({ message: 'Error logging usage' });
    }
};

exports.updateBlockMaterialThreshold = async (req, res) => {
    const { blockId, materialId } = req.params;
    const { lowStockThreshold } = req.body;

    try {
        const threshold = parseFloat(lowStockThreshold);
        if (isNaN(threshold) || threshold < 0) {
            return res.status(400).json({ message: 'Threshold must be a non-negative number' });
        }

        const material = await Material.findOne({ _id: materialId, block_id: blockId });
        if (!material) return res.status(404).json({ message: 'Material not found' });

        material.lowStockThreshold = threshold;
        await material.save();

        res.json({ id: material._id.toString(), lowStockThreshold: material.lowStockThreshold, status: material.status });
    } catch (error) {
        console.error('Error updating block material threshold:', error);
        res.status(500).json({ message: 'Error updating threshold' });
    }
};

// ─── PROJECT-LEVEL INVENTORY (aggregates across all blocks) ───────────────────

exports.getProjectInventory = async (req, res) => {
    const { projectId } = req.params;
    try {
        const materials = await Material.find({ project_id: projectId });

        let totalValue = 0;
        let pendingOrders = 0;
        let outOfStock = 0;
        let monthlyInflow = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const materialData = materials.map(mat => {
            const matValue = mat.balance * mat.unitPrice;
            totalValue += matValue;

            if (mat.status === 'OUT OF STOCK') { outOfStock++; pendingOrders++; }
            if (mat.status === 'LOW STOCK') pendingOrders++;

            mat.logs.forEach(log => {
                if (log.type === 'delivery') {
                    const logDate = new Date(log.date);
                    if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
                        monthlyInflow += (log.totalCost || 0);
                    }
                }
            });

            return {
                id: mat._id.toString(),
                name: mat.name,
                unit: mat.unit,
                inflow: mat.inflow.toLocaleString('en-IN'),
                outflow: mat.outflow.toLocaleString('en-IN'),
                balance: mat.balance.toLocaleString('en-IN'),
                value: `₹ ${matValue.toLocaleString('en-IN')}`,
                status: mat.status,
                iconType: mat.iconType,
                lowStockThreshold: mat.lowStockThreshold ?? 50,
                logs: mat.logs
            };
        });

        let formattedInflow = `₹ ${monthlyInflow.toLocaleString('en-IN')}`;
        if (monthlyInflow >= 10000000) formattedInflow = `₹ ${(monthlyInflow / 10000000).toFixed(2)} Cr`;
        else if (monthlyInflow >= 100000) formattedInflow = `₹ ${(monthlyInflow / 100000).toFixed(1)} L`;
        else if (monthlyInflow >= 1000) formattedInflow = `₹ ${(monthlyInflow / 1000).toFixed(1)} K`;

        res.json({
            lastUpdated: new Date().toLocaleString('en-IN'),
            totalValue: `₹ ${totalValue.toLocaleString('en-IN')}`,
            summary: {
                pendingOrders: pendingOrders.toString(),
                outOfStock: `${outOfStock} Item${outOfStock !== 1 ? 's' : ''}`,
                monthlyInflow: formattedInflow
            },
            materials: materialData
        });
    } catch (error) {
        console.error('Error fetching project inventory:', error);
        res.status(500).json({ message: 'Error fetching inventory data' });
    }
};

exports.logProjectDelivery = async (req, res) => {
    const { projectId } = req.params;
    const { materialName, unit, quantity, supplier, totalCost, iconType, deliveryChallanUrl, stackPhotoUrl } = req.body;

    try {
        const parsedQuantity = parseFloat(quantity);
        const parsedTotalCost = parseFloat(totalCost);

        // Find material by project_id (across all blocks, no block filter)
        const escapedName = materialName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        let material = await Material.findOne({ project_id: projectId, name: new RegExp('^' + escapedName + '$', 'i') });

        if (!material) {
            material = new Material({
                project_id: projectId,
                name: materialName,
                unit,
                iconType: iconType || 'box'
            });
        }

        material.inflow += parsedQuantity;
        material.balance += parsedQuantity;
        if (parsedQuantity > 0 && parsedTotalCost > 0) {
            material.unitPrice = parsedTotalCost / parsedQuantity;
        }

        material.logs.push({ type: 'delivery', quantity: parsedQuantity, supplier, totalCost: parsedTotalCost, deliveryChallanUrl, stackPhotoUrl });
        await material.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'LOGGED_DELIVERY', 'Material', `Logged delivery of ${parsedQuantity} ${unit} of ${materialName}`, material._id);
        }

        // Auto-create Expense at project level
        if (parsedTotalCost > 0 && req.user && req.user._id) {
            try {
                const Expense = require('../models/Expense');
                const newExpense = new Expense({
                    title: `Material Delivery: ${materialName}`,
                    description: `Delivery of ${parsedQuantity} ${unit} from ${supplier || 'supplier'}`,
                    amount: parsedTotalCost,
                    category: 'Material',
                    project: projectId,
                    submittedBy: req.user._id,
                    status: 'Approved'
                });
                await newExpense.save();
            } catch (expenseErr) {
                console.error('Failed to auto-create expense:', expenseErr);
            }
        }

        res.status(200).json(material);
    } catch (error) {
        console.error('Error logging project delivery:', error);
        res.status(500).json({ message: 'Error logging delivery' });
    }
};

exports.logProjectUsage = async (req, res) => {
    const { projectId } = req.params;
    const { materialId, quantity, locationPurpose, usagePhotoUrl } = req.body;

    try {
        const parsedQuantity = parseFloat(quantity);
        const material = await Material.findOne({ _id: materialId, project_id: projectId });
        if (!material) return res.status(404).json({ message: 'Material not found' });

        material.outflow += parsedQuantity;
        material.balance -= parsedQuantity;
        material.logs.push({ type: 'usage', quantity: parsedQuantity, locationPurpose, usagePhotoUrl });
        await material.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'LOGGED_USAGE', 'Material', `Logged usage of ${parsedQuantity} ${material.unit} of ${material.name}`, material._id);
        }

        res.status(200).json(material);
    } catch (error) {
        console.error('Error logging project usage:', error);
        res.status(500).json({ message: 'Error logging usage' });
    }
};

exports.updateProjectMaterialThreshold = async (req, res) => {
    const { projectId, materialId } = req.params;
    const { lowStockThreshold } = req.body;

    try {
        const threshold = parseFloat(lowStockThreshold);
        if (isNaN(threshold) || threshold < 0) {
            return res.status(400).json({ message: 'Threshold must be a non-negative number' });
        }

        const material = await Material.findOne({ _id: materialId, project_id: projectId });
        if (!material) return res.status(404).json({ message: 'Material not found' });

        material.lowStockThreshold = threshold;
        await material.save();

        res.json({ id: material._id.toString(), lowStockThreshold: material.lowStockThreshold, status: material.status });
    } catch (error) {
        console.error('Error updating project material threshold:', error);
        res.status(500).json({ message: 'Error updating threshold' });
    }
};

