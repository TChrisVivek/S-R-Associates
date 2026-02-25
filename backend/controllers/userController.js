const User = require('../models/User');

exports.getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};

        if (role) {
            query.role = role;
        }

        const users = await User.find(query).select('username email role _id');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching users', error: error.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ message: 'Role is required' });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { role },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ message: 'Server error updating role', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, phone } = req.body;

        const updateData = {};
        if (username) updateData.username = username;
        if (phone !== undefined) updateData.phone = phone;

        const user = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error updating profile', error: error.message });
    }
};
