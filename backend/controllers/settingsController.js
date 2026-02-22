const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne();

        // If no settings document exists yet, create the default one
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }

        res.status(200).json(settings);
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ message: "Error fetching settings", error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { companyInfo, notifications } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        if (companyInfo) settings.companyInfo = companyInfo;
        if (notifications) settings.notifications = notifications;
        settings.updatedAt = Date.now();

        await settings.save();

        res.status(200).json({ message: "Settings updated successfully", settings });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ message: "Error updating settings", error: error.message });
    }
};
