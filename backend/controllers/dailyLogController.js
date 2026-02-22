const DailyLog = require('../models/DailyLog');
const Project = require('../models/Project');

const getProjectDailyLogs = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        const logs = await DailyLog.find({ project_id: projectId }).sort({ date: -1 });

        const logsData = {
            projectPhase: "Construction Phase",
            lastUpdated: logs.length > 0 ? new Date(logs[0].updatedAt).toLocaleString() : "No logs yet",
            logs: logs.map(log => ({
                id: log._id.toString(),
                date: log.date,
                day: log.day,
                weather: {
                    condition: log.weather?.condition || "Sunny",
                    icon: (log.weather?.condition || "Sunny").toLowerCase()
                },
                laborers: log.laborers,
                notes: log.notes,
                gallery: log.gallery || []
            }))
        };

        res.json(logsData);
    } catch (error) {
        console.error("Error fetching daily logs:", error);
        res.status(500).json({ message: "Error fetching daily logs" });
    }
};

const createDailyLog = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        const { date, day, weatherCondition, laborers, notes } = req.body;

        const galleryPaths = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                galleryPaths.push(`${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
            });
        }

        const newLog = new DailyLog({
            project_id: projectId,
            date: date || new Date(),
            day,
            weather: {
                condition: weatherCondition
            },
            laborers: parseInt(laborers) || 0,
            notes,
            gallery: galleryPaths
        });

        await newLog.save();

        res.status(201).json({ message: 'Daily log created successfully', log: newLog });
    } catch (error) {
        console.error("Error creating daily log:", error);
        res.status(500).json({ message: "Error creating daily log", error: error.message });
    }
};

module.exports = { getProjectDailyLogs, createDailyLog };
