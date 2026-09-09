const path = require('path');
const fs = require('fs-extra');
const Project = require('../models/Project');
const Block = require('../models/Block');
const DailyLog = require('../models/DailyLog');
const Material = require('../models/Material');
const Pin = require('../models/Pin');
const Personnel = require('../models/Personnel');
const Expense = require('../models/Expense');
const logActivity = require('../utils/activityLogger');

exports.uploadBlueprint = async (req, res) => {
    try {
        const { plan } = req.body;
        if (!plan) {
            return res.status(400).send('No plan URL provided.');
        }

        res.json({
            message: "Upload Successful",
            imageUrl: plan,
            files: [{ name: "Plan", url: plan }]
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).send("Error processing files");
    }
};

exports.createProject = async (req, res) => {
    try {
        const { title, blockMode } = req.body;

        const existingProjects = await Project.find({}, 'title');
        const normalizedInput = title.replace(/\s+/g, '').toLowerCase();

        const isDuplicate = existingProjects.some(p => {
            const normalizedExisting = p.title.replace(/\s+/g, '').toLowerCase();
            return normalizedExisting === normalizedInput;
        });

        if (isDuplicate) {
            return res.status(400).json({ message: "Project with this name already exists (similar name found)" });
        }

        const project = new Project(req.body);
        await project.save();

        // Auto-create a Main Block for every project (single mode uses this transparently)
        const incomingBlueprints = (req.body.blueprints || []).map(bp => ({
            url: bp.url || bp.originalUrl,
            originalUrl: bp.originalUrl || bp.url,
            name: bp.name || 'Document',
            uploadedAt: new Date()
        }));

        const mainBlock = new Block({
            project_id: project._id,
            name: blockMode === 'multi' ? 'Block A' : 'Main Block',
            description: blockMode === 'multi' ? 'First block of this project' : 'Default block for this project',
            status: 'In Progress',
            blueprints: incomingBlueprints,
            order: 0
        });
        await mainBlock.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'CREATED_PROJECT', 'Project', `Created new project: ${project.title}`, project._id);
        }

        res.status(201).json(project);
    } catch (error) {
        console.error("Create Project Error:", error);
        res.status(400).json({ message: "Error creating project", error: error.message });
    }
};

exports.getAllProjects = async (req, res) => {
    try {
        let query = {};

        if (req.user && req.user.role === 'Client') {
            query.clientId = req.user._id;
        }

        const projects = await Project.find(query).sort({ createdAt: -1 });
        const projectIds = projects.map(p => p._id);

        const Material = require('../models/Material'); // Ensure Material is imported if not globally available, wait it is globally imported at line 6
        const materials = await Material.find({ project_id: { $in: projectIds } });

        const spendByProject = {};
        materials.forEach(mat => {
            let matTotal = 0;
            mat.logs.forEach(log => {
                if (log.type === 'delivery' && log.totalCost) {
                    matTotal += log.totalCost;
                }
            });
            const pId = mat.project_id.toString();
            spendByProject[pId] = (spendByProject[pId] || 0) + matTotal;
        });

        const enhancedProjects = [];

        for (const p of projects) {
            if (p.endDate && p.status !== 'Completed' && p.status !== 'Delayed') {
                const diffTime = new Date(p.endDate) - new Date();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (daysLeft <= 0) {
                    p.status = 'Delayed';
                    await p.save();
                }
            }
            const pObj = p.toObject();
            pObj.totalSpent = spendByProject[p._id.toString()] || 0;
            enhancedProjects.push(pObj);
        }

        res.status(200).json(enhancedProjects);
    } catch (error) {
        console.error("Get Projects Error:", error);
        res.status(500).json({ message: "Error fetching projects", error: error.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findByIdAndDelete(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Unassign personnel
        await Personnel.updateMany(
            { project_id: projectId },
            { $unset: { project_id: "" }, $set: { site: "Unassigned", status: "Off Duty" } }
        );

        // Delete all expenses
        await Expense.deleteMany({ project: projectId });

        // Cascade delete all blocks and their children
        const blocks = await Block.find({ project_id: projectId });
        const blockIds = blocks.map(b => b._id);
        if (blockIds.length > 0) {
            await DailyLog.deleteMany({ block_id: { $in: blockIds } });
            await Material.deleteMany({ block_id: { $in: blockIds } });
            await Pin.deleteMany({ block_id: { $in: blockIds } });
            await Block.deleteMany({ project_id: projectId });
        }

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'DELETED_PROJECT', 'Project', `Deleted project: ${project.title}`, projectId);
        }

        res.json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ message: "Failed to delete project" });
    }
};

exports.getProjectById = async (req, res) => {
    const projectId = req.params.id;

    try {
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (req.user && req.user.role === 'Client' &&
            (!project.clientId || project.clientId.toString() !== req.user._id.toString())) {
            return res.status(403).json({ message: "You do not have access to this project" });
        }

        const formatOptions = { year: 'numeric', month: 'short' };
        const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', formatOptions) : 'TBD';
        const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', formatOptions) : 'TBD';

        let daysLeft = 0;
        if (project.endDate) {
            const diffTime = new Date(project.endDate) - new Date();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0 && project.status !== 'Completed' && project.status !== 'Delayed') {
                project.status = 'Delayed';
                await project.save();
            }
        }

        const formattedFeed = project.liveFeed.map(feed => {
            const feedDate = new Date(feed.createdAt);
            const now = new Date();
            const diffDays = Math.floor((now - feedDate) / (1000 * 60 * 60 * 24));

            let timeStr = "";
            if (diffDays === 0) timeStr = `Today, ${feedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            else if (diffDays === 1) timeStr = `Yesterday, ${feedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            else timeStr = `${feedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${feedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

            return { id: feed._id, title: feed.title, time: timeStr, location: feed.location, image: feed.image };
        });

        const formattedTasks = project.criticalTasks.map(task => ({
            id: task._id,
            title: task.title,
            desc: task.desc,
            status: task.status,
            icon: task.icon,
            assignee: task.assignee || "Unassigned"
        }));

        // Dynamic budget from materials (across all blocks)
        let dynamicBudgetSpent = 0;
        try {
            if (project.budget && project.budget > 0) {
                let multiplier = 1;
                const unit = (project.budgetUnit || "Lakhs").toLowerCase();
                if (unit === 'crores') multiplier = 10000000;
                else if (unit === 'lakhs') multiplier = 100000;
                else if (unit === 'thousands') multiplier = 1000;

                const rawBudget = project.budget * multiplier;
                const materials = await Material.find({ project_id: projectId });
                let totalMaterialSpend = 0;

                materials.forEach(mat => {
                    mat.logs.forEach(log => {
                        if (log.type === 'delivery' && log.totalCost) {
                            totalMaterialSpend += log.totalCost;
                        }
                    });
                });

                if (rawBudget > 0) {
                    const percentage = (totalMaterialSpend / rawBudget) * 100;
                    dynamicBudgetSpent = Math.min(Math.round(percentage * 10) / 10, 100);
                }

                console.log(`[Budget Calc] Project: ${project.title} | Burn Rate: ${dynamicBudgetSpent}%`);
            }
        } catch (calcError) {
            console.error("Failed to calculate dynamic budget:", calcError);
        }

        const projectDetails = {
            id: project._id,
            title: project.title,
            location: project.address || "Location not specified",
            client: project.client || "Not specified",
            type: project.type || "Residential",
            siteSize: project.siteSize || 0,
            floors: project.floors || 0,
            manager: project.manager || "Unassigned",
            contractor: project.contractor || "Unassigned",
            status: project.status || "Planning",
            blockMode: project.blockMode || 'single',
            phase: project.status.toUpperCase(),
            startDate: project.startDate || null,
            endDate: project.endDate || null,
            timeline: `${startStr} - ${endStr}`,
            budgetRaw: project.budget || "",
            budgetUnitRaw: project.budgetUnit || "Lakhs",
            budget: project.budget ? `${project.budget} ${project.budgetUnit || ''}` : "TBA",
            daysLeft: daysLeft,
            stats: {
                taskCompleted: project.stats?.taskCompleted || 0,
                budgetSpent: dynamicBudgetSpent
            },
            liveFeed: formattedFeed.reverse(),
            criticalTasks: formattedTasks.reverse()
        };

        res.json(projectDetails);
    } catch (error) {
        console.error("Get Project By ID Error:", error);
        res.status(500).json({ message: "Server Error fetching project" });
    }
};

exports.updateProjectStats = async (req, res) => {
    try {
        const { taskCompleted, budgetSpent } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        if (taskCompleted !== undefined) project.stats.taskCompleted = taskCompleted;
        if (budgetSpent !== undefined) project.stats.budgetSpent = budgetSpent;

        await project.save();
        res.status(200).json(project.stats);
    } catch (error) {
        console.error("Update Stats Error:", error);
        res.status(500).json({ message: "Error updating stats", error: error.message });
    }
};

exports.updateProjectSettings = async (req, res) => {
    try {
        const { title, client, address, siteSize, floors, type, budget, budgetUnit, startDate, endDate, manager, contractor, status, image, blockMode } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ message: "Project not found" });

        if (title !== undefined) project.title = title;
        if (client !== undefined) project.client = client;
        if (address !== undefined) project.address = address;
        if (siteSize !== undefined) project.siteSize = siteSize;
        if (floors !== undefined) project.floors = floors;
        if (type !== undefined) project.type = type;
        if (budget !== undefined) project.budget = budget;
        if (budgetUnit !== undefined) project.budgetUnit = budgetUnit;
        if (startDate !== undefined) project.startDate = startDate;
        if (endDate !== undefined) project.endDate = endDate;
        if (manager !== undefined) project.manager = manager;
        if (contractor !== undefined) project.contractor = contractor;
        if (status !== undefined) project.status = status;
        if (image !== undefined) project.image = image;

        // Block mode upgrade/downgrade logic
        if (blockMode !== undefined && blockMode !== project.blockMode) {
            if (blockMode === 'single') {
                // Only allow downgrade if exactly 1 block exists
                const blockCount = await Block.countDocuments({ project_id: project._id });
                if (blockCount > 1) {
                    return res.status(400).json({
                        message: `Cannot switch to Single mode: this project has ${blockCount} blocks. Delete blocks until only 1 remains, then switch.`
                    });
                }
            }
            project.blockMode = blockMode;
        }

        await project.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'UPDATED_PROJECT', 'Project', `Updated project settings for: ${project.title}`, project._id);
        }

        res.status(200).json({ message: "Project settings updated successfully", project });
    } catch (error) {
        console.error("Update Project Settings Error:", error);
        res.status(500).json({ message: "Error updating project settings", error: error.message });
    }
};


exports.addCriticalTask = async (req, res) => {
    try {
        const { title, desc, status, icon, assignee } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const newTask = { title, desc, status, icon, assignee };
        project.criticalTasks.push(newTask);
        await project.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'ADDED_TASK', 'Project', `Added critical task "${title}" to project: ${project.title}`, project._id);
        }

        res.status(201).json(project.criticalTasks[project.criticalTasks.length - 1]);
    } catch (error) {
        console.error("Add Critical Task Error:", error);
        res.status(500).json({ message: "Error adding task", error: error.message });
    }
};

exports.deleteCriticalTask = async (req, res) => {
    try {
        const { id, taskId } = req.params;
        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        project.criticalTasks = project.criticalTasks.filter(task => task._id.toString() !== taskId);
        await project.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'DELETED_TASK', 'Project', `Deleted a critical task from project: ${project.title}`, project._id);
        }

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Delete Critical Task Error:", error);
        res.status(500).json({ message: "Error deleting task", error: error.message });
    }
};

exports.addLiveFeedRecord = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const { title, location, images } = req.body;

        if (!images || images.length === 0) {
            return res.status(400).json({ message: "No image URLs provided" });
        }

        const newFeeds = images.map(imgUrl => ({
            title: title || "Site Update",
            location: location || "Remote",
            image: imgUrl
        }));

        project.liveFeed.push(...newFeeds);
        await project.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'ADDED_LIVE_FEED', 'Project', `Added ${newFeeds.length} live feed image(s) to project: ${project.title}`, project._id);
        }

        res.status(201).json(project.liveFeed.slice(-newFeeds.length));
    } catch (error) {
        console.error("Add Live Feed Error:", error);
        res.status(500).json({ message: "Error adding live feed", error: error.message });
    }
};

exports.assignPersonnel = async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const { personnelIds } = req.body;

        if (!Array.isArray(personnelIds)) {
            return res.status(400).json({ message: 'personnelIds must be an array' });
        }

        const project = await Project.findByIdAndUpdate(
            projectId,
            { $set: { assignedPersonnel: personnelIds } },
            { new: true }
        );

        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'ASSIGNED_PERSONNEL', 'Project',
                `Updated personnel assignment for project: ${project.title} (${personnelIds.length} members)`, project._id);
        }

        res.json({ message: 'Personnel assigned successfully', assignedPersonnel: project.assignedPersonnel });
    } catch (error) {
        console.error('Assign Personnel Error:', error);
        res.status(500).json({ message: 'Error assigning personnel', error: error.message });
    }
};
