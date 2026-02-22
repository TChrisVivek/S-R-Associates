const DailyLog = require('../models/DailyLog');
const Project = require('../models/Project');

const getProjectDailyLogs = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        const logs = await DailyLog.find({ project_id: projectId }).sort({ date: -1 });

        // In production format this based off the actual Project data
        // but the array of logs comes directly from the actual database.
        const logsData = {
            projectPhase: "Construction Phase", // Can be dynamic if added to Project model
            lastUpdated: logs.length > 0 ? new Date(logs[0].updatedAt).toLocaleString() : "No logs yet",
            logs: logs.map(log => ({
                id: log._id.toString(),
                date: log.date,
                day: log.day,
                week: log.week,
                weather: {
                    condition: log.weather.condition,
                    temp: log.weather.temp,
                    icon: log.weather.condition.toLowerCase() // Simple mapping
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
        const { date, day, week, weatherCondition, weatherTemp, laborers, notes } = req.body;

        // Handle multiple file uploads
        const galleryPaths = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                galleryPaths.push(`http://localhost:6969/uploads/${file.filename}`);
            });
        }

        const newLog = new DailyLog({
            project_id: projectId,
            date: date || new Date(),
            day,
            week,
            weather: {
                condition: weatherCondition,
                temp: weatherTemp
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
