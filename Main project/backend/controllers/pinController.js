const Pin = require('../models/Pin');

// Create a new pin
exports.createPin = async (req, res) => {
    try {
        const { project_id, blueprint_id, title, x_cord, y_cord } = req.body;

        // TODO: Add validation to ensure project exists and user is part of it

        const newPin = await Pin.create({
            project_id,
            blueprint_id,
            title,
            x_cord,
            y_cord,
            history: [{
                field: 'creation',
                new_value: 'Pin Created',
                // changed_by: req.user.id // TODO: Add auth middleware to get user ID
            }]
        });

        res.status(201).json(newPin);
    } catch (error) {
        console.error('Create Pin Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all pins for a blueprint
exports.getPins = async (req, res) => {
    try {
        const { blueprint_id } = req.params;
        const pins = await Pin.find({ blueprint_id });
        res.status(200).json(pins);
    } catch (error) {
        console.error('Get Pins Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add a comment to a pin
exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_id } = req.body; // user_id should come from auth middleware ideally

        const pin = await Pin.findById(id);
        if (!pin) return res.status(404).json({ message: "Pin not found" });

        pin.comments.push({ text, user_id });
        await pin.save();

        res.status(200).json(pin);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update pin status
exports.updatePinStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const pin = await Pin.findById(id);
        if (!pin) return res.status(404).json({ message: "Pin not found" });

        const oldStatus = pin.status;
        pin.status = status;

        // Add to history
        pin.history.push({
            field: 'status',
            old_value: oldStatus,
            new_value: status
        });

        await pin.save();
        res.status(200).json(pin);
    } catch (error) {
        console.error('Update Pin Status Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

