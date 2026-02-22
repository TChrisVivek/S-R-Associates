const Personnel = require('../models/Personnel');

// 1. GET: Fetch all personnel
exports.getPersonnel = async (req, res) => {
    try {
        const personnel = await Personnel.find().sort({ createdAt: -1 });
        res.json(personnel);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 2. POST: Add a new member
exports.addPersonnel = async (req, res) => {
    try {
        const newMember = new Personnel(req.body);
        await newMember.save();
        res.status(201).json(newMember);
    } catch (error) {
        res.status(400).json({ message: "Failed to add member", error: error.message });
    }
};

// 3. DELETE: Remove a member
exports.deletePersonnel = async (req, res) => {
    try {
        const { id } = req.params;
        await Personnel.findByIdAndDelete(id);
        res.json({ message: "Member removed" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete", error: error.message });
    }
};
