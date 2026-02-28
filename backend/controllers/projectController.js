const path = require('path');
const fs = require('fs-extra');
const Project = require('../models/Project');
const Material = require('../models/Material');
const Personnel = require('../models/Personnel');

exports.uploadBlueprint = async (req, res) => {
    try {
        const { plan } = req.body;
        if (!plan) {
            return res.status(400).send('No plan URL provided.');
        }

        res.json({
            message: "Upload Successful",
            imageUrl: plan, // Send back the URL directly since Cloudinary handles hosting
            files: [{ name: "Plan", url: plan }]
        });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).send("Error processing files");
    }
};

exports.createProject = async (req, res) => {
    try {
        const { title } = req.body;

        // 1. Fetch all existing project titles
        const existingProjects = await Project.find({}, 'title');

        // 2. Normalize input title (remove spaces, lowercase)
        const normalizedInput = title.replace(/\s+/g, '').toLowerCase();

        // 3. Check for duplicates
        const isDuplicate = existingProjects.some(p => {
            const normalizedExisting = p.title.replace(/\s+/g, '').toLowerCase();
            return normalizedExisting === normalizedInput;
        });

        if (isDuplicate) {
            return res.status(400).json({ message: "Project with this name already exists (similar name found)" });
        }

        const project = new Project(req.body);
        await project.save();
        res.status(201).json(project);
    } catch (error) {
        console.error("Create Project Error:", error);
        res.status(400).json({ message: "Error creating project", error: error.message });
    }
};

exports.getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        let hasUpdates = false;

        // Auto-update status to "Delayed" if time remaining is 0 or negative
        for (const p of projects) {
            if (p.endDate && p.status !== 'Completed' && p.status !== 'Delayed') {
                const diffTime = new Date(p.endDate) - new Date();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (daysLeft <= 0) {
                    p.status = 'Delayed';
                    await p.save();
                    hasUpdates = true;
                }
            }
        }

        res.status(200).json(projects);
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

        // Unassign personnel from this project
        await Personnel.updateMany(
            { project_id: projectId },
            {
                $unset: { project_id: "" },
                $set: { site: "Unassigned", status: "Off Duty" }
            }
        );

        // Optional: you could delete related material, daily logs, and pins here.
        // For now, we will just unassign personnel and delete the project.

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

        // Format Date logic
        const formatOptions = { year: 'numeric', month: 'short' };
        const startStr = project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', formatOptions) : 'TBD';
        const endStr = project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', formatOptions) : 'TBD';

        // Days Left Logic
        let daysLeft = 0;
        if (project.endDate) {
            const diffTime = new Date(project.endDate) - new Date();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0 && project.status !== 'Completed' && project.status !== 'Delayed') {
                project.status = 'Delayed';
                await project.save();
            }
        }

        // Format Live Feed
        const formattedFeed = project.liveFeed.map(feed => {
            const feedDate = new Date(feed.createdAt);
            const now = new Date();
            const diffDays = Math.floor((now - feedDate) / (1000 * 60 * 60 * 24));

            let timeStr = "";
            if (diffDays === 0) timeStr = `Today, ${feedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            else if (diffDays === 1) timeStr = `Yesterday, ${feedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            else timeStr = `${feedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${feedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

            return {
                id: feed._id,
                title: feed.title,
                time: timeStr,
                location: feed.location,
                image: feed.image
            };
        });

        // Format Critical Tasks
        const formattedTasks = project.criticalTasks.map(task => ({
            id: task._id,
            title: task.title,
            desc: task.desc,
            status: task.status,
            icon: task.icon,
            assignee: task.assignee || "Unassigned"
        }));

        // --- DYNAMIC BUDGET CALCULATION (Real-time from Material Deliveries) ---
        let dynamicBudgetSpent = 0;

        try {
            // Only calculate if a budget actually exists
            if (project.budget && project.budget > 0) {
                // Determine Raw Budget Value
                let multiplier = 1;
                const unit = (project.budgetUnit || "Lakhs").toLowerCase();

                if (unit === 'crores') multiplier = 10000000;
                else if (unit === 'lakhs') multiplier = 100000;
                else if (unit === 'thousands') multiplier = 1000;

                const rawBudget = project.budget * multiplier;

                // Aggregate Material Deliveries
                const materials = await Material.find({ project_id: projectId });
                let totalMaterialSpend = 0;

                materials.forEach(mat => {
                    mat.logs.forEach(log => {
                        if (log.type === 'delivery' && log.totalCost) {
                            totalMaterialSpend += log.totalCost;
                        }
                    });
                });

                // Calculate percentage, capped at 100 max visually, rounded to 1 decimal place
                if (rawBudget > 0) {
                    const percentage = (totalMaterialSpend / rawBudget) * 100;
                    dynamicBudgetSpent = Math.min(Math.round(percentage * 10) / 10, 100);
                }

                console.log(`[Budget Calc] Project: ${project.title} | Budget: ${project.budget} ${project.budgetUnit} (₹${rawBudget.toLocaleString('en-IN')}) | Material Spend: ₹${totalMaterialSpend.toLocaleString('en-IN')} | Burn Rate: ${dynamicBudgetSpent}%`);
            } else {
                console.log(`[Budget Calc] Project: ${project.title} | No budget set, burn rate = 0%`);
            }
        } catch (calcError) {
            console.error("Failed to calculate dynamic budget:", calcError);
            // fallback to 0
        }


        // Blend real database data with the required UI structure
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
            liveFeed: formattedFeed.reverse(), // latest first
            criticalTasks: formattedTasks.reverse() // latest first
        };

        res.json(projectDetails);
    } catch (error) {
        console.error("Get Project By ID Error:", error);
        res.status(500).json({ message: "Server Error fetching project" });
    }
};

// --- NEW REAL-TIME ENDPOINTS ---

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
        const { title, client, address, siteSize, floors, type, budget, budgetUnit, startDate, endDate, manager, contractor, status, image } = req.body;
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

        await project.save();
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

        const newFeeds = images.map(imgUrl => {
            return {
                title: title || "Site Update",
                location: location || "Remote",
                image: imgUrl
            };
        });

        project.liveFeed.push(...newFeeds);
        await project.save();

        res.status(201).json(project.liveFeed.slice(-newFeeds.length));
    } catch (error) {
        console.error("Add Live Feed Error:", error);
        res.status(500).json({ message: "Error adding live feed", error: error.message });
    }
};

const Pin = require('../models/Pin');

exports.getBlueprintAndTasks = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Return ALL blueprints so frontend can switch sheets
        const allBlueprints = (project.blueprints || []).map((bp, index) => ({
            id: bp._id.toString(),
            name: bp.name || `Blueprint ${index + 1}`,
            imageUrl: bp.url,
            uploadedAt: bp.uploadedAt
        }));

        // For backward compatibility, also return the latest as "blueprint"
        const latestBlueprint = allBlueprints.length > 0 ? allBlueprints[allBlueprints.length - 1] : null;

        const pins = await Pin.find({ project_id: projectId });

        const tasks = pins.map(pin => {
            let status = "PENDING";
            if (pin.status === "In Progress") status = "IN PROGRESS";
            else if (pin.status === "Closed") status = "DONE";

            let color = "#f59e0b"; // PENDING
            if (status === "IN PROGRESS") color = "#6366f1";
            else if (status === "DONE") color = "#10b981";

            return {
                id: pin._id.toString(),
                title: pin.title,
                status: status,
                assignee: "Unassigned",
                x: pin.x_cord,
                y: pin.y_cord,
                color: color
            };
        });

        res.json({
            blueprint: latestBlueprint,
            blueprints: allBlueprints,
            tasks: tasks.reverse()
        });
    } catch (error) {
        console.error("Error fetching blueprint data:", error);
        res.status(500).json({ message: "Error fetching blueprint data" });
    }
};

exports.addBlueprintTask = async (req, res) => {
    const { id: projectId } = req.params;
    const { title, x, y, status } = req.body;

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        let dbStatus = "Open";
        if (status === "IN PROGRESS") dbStatus = "In Progress";
        else if (status === "DONE") dbStatus = "Closed";

        const newPin = new Pin({
            project_id: projectId,
            blueprint_id: project.blueprints && project.blueprints.length > 0 ? project.blueprints[0]._id : new require('mongoose').Types.ObjectId(),
            title: title || "New Task",
            x_cord: x,
            y_cord: y,
            status: dbStatus
        });

        await newPin.save();

        res.status(201).json({
            id: newPin._id.toString(),
            title: newPin.title,
            status: status || "PENDING",
            assignee: "Unassigned",
            x: newPin.x_cord,
            y: newPin.y_cord,
            color: "#f59e0b"
        });
    } catch (error) {
        console.error("Error adding blueprint task:", error);
        res.status(500).json({ message: "Error adding blueprint task" });
    }
};

exports.deleteBlueprintTask = async (req, res) => {
    try {
        const { id: projectId, taskId } = req.params;
        const result = await Pin.findByIdAndDelete(taskId);

        if (!result) return res.status(404).json({ message: "Task not found" });

        res.status(200).json({ message: "Task deleted successfully", id: taskId });
    } catch (error) {
        console.error("Error deleting blueprint task:", error);
        res.status(500).json({ message: "Error deleting blueprint task" });
    }
};

exports.uploadProjectBlueprint = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        if (!req.body) {
            console.error('[Blueprint Upload Error] req.body is undefined. Content-Type:', req.headers['content-type']);
            return res.status(400).json({ message: 'Request body is undefined. Check Content-Type.' });
        }

        const { plans } = req.body;

        if (!plans || !Array.isArray(plans) || plans.length === 0) {
            return res.status(400).json({ message: 'No URLs provided in plans array.' });
        }

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const uploadedFiles = plans.map(url => {
            return {
                name: "Document",
                url: url,
                originalUrl: url,
                type: 'application/pdf' // Default assumption or derive from URL
            };
        });

        project.blueprints.push(...uploadedFiles);
        await project.save();

        res.status(200).json({
            message: "Upload Successful",
            blueprints: project.blueprints
        });

    } catch (error) {
        console.error("Project Blueprint Upload Error:", error);
        res.status(500).json({ message: "Error processing blueprint files" });
    }
};

exports.deleteProjectBlueprint = async (req, res) => {
    try {
        const { id: projectId, blueprintId } = req.params;
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Remove blueprint by its subdocument ID
        project.blueprints = project.blueprints.filter(bp => bp._id.toString() !== blueprintId);
        await project.save();

        res.status(200).json({ message: "Blueprint deleted successfully" });
    } catch (error) {
        console.error("Delete Blueprint Error:", error);
        res.status(500).json({ message: "Error deleting blueprint" });
    }
};
