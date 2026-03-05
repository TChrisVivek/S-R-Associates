const Settings = require('../models/Settings');
const logActivity = require('../utils/activityLogger');

exports.getLogo = async (req, res) => {
    try {
        const settings = await Settings.findOne();
        res.status(200).json({ logoUrl: settings?.companyInfo?.logoUrl || null });
    } catch (error) {
        console.error("Get Logo Error:", error);
        res.status(500).json({ message: "Error fetching logo", error: error.message });
    }
};

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

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'UPDATED_SETTINGS', 'Settings', 'Updated company settings');
        }

        res.status(200).json({ message: "Settings updated successfully", settings });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ message: "Error updating settings", error: error.message });
    }
};
