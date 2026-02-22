const path = require('path');
const pdf = require('pdf-poppler');
const fs = require('fs-extra');
const Project = require('../models/Project');
const Material = require('../models/Material');

// Helper: Convert PDF page 1 to Image
const convertPdfToImage = async (pdfPath, outputDir) => {
    const opts = {
        format: 'jpeg',
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: 1 // Only convert the first page
    };

    try {
        await pdf.convert(pdfPath, opts);
        // pdf-poppler appends '-1' to the filename for page 1
        return path.join(outputDir, `${opts.out_prefix}-1.jpg`);
    } catch (err) {
        console.error("PDF Conversion Failed:", err);
        throw err;
    }
};

exports.uploadBlueprint = async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    try {
        const uploadedFiles = [];

        for (const file of req.files) {
            const filePath = file.path;
            const outputDir = path.dirname(filePath);
            const isPdf = file.mimetype === 'application/pdf';

            let finalImagePath = filePath;
            const originalFileName = path.basename(filePath);
            const originalUrl = `${req.protocol}://${req.get('host')}/uploads/${originalFileName}`;

            if (isPdf) {
                console.log("Converting PDF to Image:", filePath);
                // Note: This simple conversion might overwrite if filenames are same. 
                // Consider independent output dirs or unique naming if scaling.
                finalImagePath = await convertPdfToImage(filePath, outputDir);
            }

            const fileName = path.basename(finalImagePath);
            const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;

            uploadedFiles.push({
                name: file.originalname,
                url: imageUrl,
                originalUrl: isPdf ? originalUrl : imageUrl,
                type: file.mimetype
            });
        }

        res.json({
            message: "Upload Successful",
            files: uploadedFiles
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
        res.status(200).json(projects);
    } catch (error) {
        console.error("Get Projects Error:", error);
        res.status(500).json({ message: "Error fetching projects", error: error.message });
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
            const diffTime = Math.abs(new Date(project.endDate) - new Date());
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

        // --- DYNAMIC BUDGET CALCULATION ---
        let dynamicBudgetSpent = project.stats?.budgetSpent || 0;

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
            }
        } catch (calcError) {
            console.error("Failed to calculate dynamic budget:", calcError);
            // fallback to static DB value
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
            phase: project.status.toUpperCase(),
            timeline: `${startStr} - ${endStr}`,
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
        const { title, client, address, siteSize, floors, type, budget, budgetUnit, startDate, endDate, manager, contractor, status } = req.body;
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

// Handled after multer middleware
exports.addLiveFeedRecord = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No image files provided" });
        }

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const { title, location } = req.body;

        const newFeeds = req.files.map(file => {
            const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
            return {
                title: title || "Site Update",
                location: location || "Remote",
                image: imageUrl
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

        let blueprint = null;

        if (project.blueprints && project.blueprints.length > 0) {
            blueprint = {
                id: project.blueprints[0]._id.toString(),
                name: project.blueprints[0].name || "Project Blueprint",
                imageUrl: project.blueprints[0].url
            };
        }

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
                assignee: "Unassigned", // Can map user if needed
                x: pin.x_cord,
                y: pin.y_cord,
                color: color
            };
        });

        res.json({
            blueprint,
            tasks: tasks.reverse() // Latest first
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

exports.uploadProjectBlueprint = async (req, res) => {
    const { id: projectId } = req.params;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
    }

    try {
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const uploadedFiles = [];

        for (const file of req.files) {
            const filePath = file.path;
            const outputDir = path.dirname(filePath);
            const isPdf = file.mimetype === 'application/pdf';

            let finalImagePath = filePath;
            const originalFileName = path.basename(filePath);
            const originalUrl = `${req.protocol}://${req.get('host')}/uploads/${originalFileName}`;

            if (isPdf) {
                console.log("Converting PDF to Image:", filePath);
                finalImagePath = await convertPdfToImage(filePath, outputDir);
            }

            const fileName = path.basename(finalImagePath);
            const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;

            uploadedFiles.push({
                name: file.originalname,
                url: imageUrl,
                originalUrl: isPdf ? originalUrl : imageUrl,
                type: file.mimetype
            });
        }

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
