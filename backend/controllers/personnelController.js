const Personnel = require('../models/Personnel');
const Vendor = require('../models/Vendor');

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
        const { name, email, phone } = req.body;

        // Prevent duplicates by name, email, or phone
        // Case-insensitive match for name to be safe
        const existingMember = await Personnel.findOne({
            $or: [
                { name: { $regex: new RegExp(`^${name}$`, 'i') } },
                { email },
                { phone }
            ]
        });

        if (existingMember) {
            return res.status(400).json({
                message: "Member already exists"
            });
        }

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

// 3.5 PUT: Update a member
exports.updatePersonnel = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedMember = await Personnel.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedMember) return res.status(404).json({ message: "Member not found" });
        res.json(updatedMember);
    } catch (error) {
        res.status(400).json({ message: "Failed to update member", error: error.message });
    }
};

// 4. GET: Fetch project-specific personnel and vendors
exports.getProjectPersonnel = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        const internalTeam = await Personnel.find({ project_id: projectId });
        const externalVendors = await Vendor.find({ project_id: projectId });

        const currentlyOnSite = internalTeam.filter(member => member.status === 'On Site').length;

        const personnelData = {
            internalTeam: internalTeam.map(member => ({
                id: member._id.toString(),
                name: member.name,
                role: member.role,
                email: member.email,
                phone: member.phone,
                status: member.status ? member.status.toUpperCase() : "ON SITE",
                avatar: member.avatar || `https://i.pravatar.cc/150?u=${member._id}`
            })),
            externalVendors: externalVendors.map(vendor => ({
                id: vendor._id.toString(),
                company: vendor.company,
                trade: vendor.trade,
                contactPerson: vendor.contactPerson,
                icon: vendor.icon || "wrench"
            })),
            stats: {
                totalAssigned: internalTeam.length,
                currentlyOnSite: currentlyOnSite,
                externalVendors: externalVendors.length,
                safetyIncidents: 0 // Stubbed until Safety Module is built
            }
        };

        res.json(personnelData);
    } catch (error) {
        console.error("Error fetching project personnel:", error);
        res.status(500).json({ message: "Error fetching project personnel" });
    }
};
