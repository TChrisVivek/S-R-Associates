const User = require('../models/User');
const Project = require('../models/Project');
const Settings = require('../models/Settings');
const { sendClientInviteEmail } = require('../utils/emailService');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/activityLogger');

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

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'CHANGED_USER_ROLE', 'User', `Changed role of ${user.username} to "${role}"`, user._id);
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

exports.getActivities = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const activities = await ActivityLog.find({ user: id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('user', 'username email');

        res.status(200).json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Server error fetching activities', error: error.message });
    }
};

exports.inviteClient = async (req, res) => {
    try {
        const { email, projectId } = req.body;

        if (!email || !projectId) {
            return res.status(400).json({ message: 'Email and Project are required' });
        }

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Find or create the user
        let user = await User.findOne({ email });

        if (user) {
            // Update existing user to Client role and assign project
            user.role = 'Client';
            if (!user.assigned_projects.includes(projectId)) {
                user.assigned_projects.push(projectId);
            }
            await user.save();
        } else {
            // Create new user with Client role (no password, relies on Google Auth)
            user = await User.create({
                username: email.split('@')[0],
                email,
                role: 'Client',
                assigned_projects: [projectId]
            });
        }

        // Link project to client
        project.clientId = user._id;
        await project.save();

        // Fetch the company logo to embed in the email
        const settings = await Settings.findOne();
        const clientUrl = process.env.CLIENT_URL || 'https://s-r-associates.vercel.app';
        let companyLogoUrl = settings?.companyInfo?.logoUrl;

        // If there's no logo in DB, use the default frontend logo (must be absolute for emails)
        if (!companyLogoUrl) {
            companyLogoUrl = `${clientUrl}/logo.png`;
        } else if (companyLogoUrl.startsWith('/')) {
            companyLogoUrl = `${clientUrl}${companyLogoUrl}`;
        }

        // Send out the email invite
        const projectImageUrl = project.image || 'https://images.unsplash.com/photo-1541888081622-4a0048af98ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        const companyInfo = {
            name: settings?.companyInfo?.name || 'S-R Associates',
            address: settings?.companyInfo?.address || '342, Nijalingappa Layout, Davanagere, Karnataka 577004'
        };
        console.log(`[Email] Attempting to send invite to ${email} for project "${project.title}"`);
        console.log(`[Email] SMTP_USER configured: ${!!process.env.SMTP_USER}, SMTP_PASS configured: ${!!process.env.SMTP_PASS}`);
        const emailSent = await sendClientInviteEmail(email, project.title, companyLogoUrl, projectImageUrl, companyInfo);
        if (!emailSent) {
            console.warn(`[Email] Failed to send invite email to ${email}`);
        }

        if (req.user && req.user._id) {
            logActivity(
                req.user._id,
                'INVITED_CLIENT',
                'User',
                `Invited client "${email}" to project: ${project.title}`,
                user._id
            );
        }

        res.status(200).json({
            message: `Client ${email} has been invited to project "${project.title}"`,
            user: { _id: user._id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Error inviting client:', error);
        res.status(500).json({ message: 'Server error inviting client', error: error.message });
    }
};
