const mongoose = require('mongoose');
const Personnel = require('../models/Personnel');
const Vendor = require('../models/Vendor');
const logActivity = require('../utils/activityLogger');

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

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'ADDED_PERSONNEL', 'Personnel', `Added new personnel: ${newMember.name} (${newMember.role || 'No role'})`, newMember._id);
        }

        res.status(201).json(newMember);
    } catch (error) {
        res.status(400).json({ message: "Failed to add member", error: error.message });
    }
};

// 3. DELETE: Remove a member
exports.deletePersonnel = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await Personnel.findByIdAndDelete(id);

        if (member) {
            // Clear the personnel's name from any project's manager/contractor field
            const Project = require('../models/Project');
            await Project.updateMany(
                { manager: member.name },
                { $set: { manager: 'Unassigned' } }
            );
            await Project.updateMany(
                { contractor: member.name },
                { $set: { contractor: 'Unassigned' } }
            );

            if (req.user && req.user._id) {
                logActivity(req.user._id, 'DELETED_PERSONNEL', 'Personnel', `Removed personnel: ${member.name}`, id);
            }
        }

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

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'UPDATED_PERSONNEL', 'Personnel', `Updated personnel: ${updatedMember.name}`, updatedMember._id);
        }

        res.json(updatedMember);
    } catch (error) {
        res.status(400).json({ message: "Failed to update member", error: error.message });
    }
};

// 3.6 PATCH: Update a member's status (used by StatusPopover)
exports.updatePersonnelStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, leaveEndDate } = req.body;

        const updateData = { status };
        if (status === 'On Leave' && leaveEndDate) {
            updateData.leaveEndDate = new Date(leaveEndDate);
        } else {
            updateData.leaveEndDate = null;
        }

        const updatedMember = await Personnel.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedMember) return res.status(404).json({ message: "Member not found" });

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'CHANGED_STATUS', 'Personnel', `Changed status of ${updatedMember.name} to "${status}"`, updatedMember._id);
        }

        res.json(updatedMember);
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(400).json({ message: "Failed to update status", error: error.message });
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

// 5. GET: Fetch aggregated attendance report
exports.getAttendanceReport = async (req, res) => {
    try {
        const { projectId, month, year } = req.query;
        if (!projectId || !year) {
            return res.status(400).json({ message: "Missing required parameters (projectId, year)" });
        }

        let startDate, endDate;
        if (month && month !== 'all' && month !== 'null' && month !== 'undefined') {
            startDate = new Date(Date.UTC(year, month - 1, 1));
            endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        } else {
            startDate = new Date(Date.UTC(year, 0, 1));
            endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        }

        const PersonnelAttendance = require('../models/PersonnelAttendance');

        // Aggregate attendance data grouped by personnel_id and status
        const attendanceData = await PersonnelAttendance.aggregate([
            {
                $match: {
                    project_id: new mongoose.Types.ObjectId(projectId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        personnel_id: "$personnel_id",
                        status: "$status"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "personnels",
                    localField: "_id.personnel_id",
                    foreignField: "_id",
                    as: "personnelInfo"
                }
            },
            { $unwind: "$personnelInfo" },
            {
                $project: {
                    _id: 0,
                    personnel_id: "$_id.personnel_id",
                    name: "$personnelInfo.name",
                    role: "$personnelInfo.role",
                    status: "$_id.status",
                    count: 1
                }
            }
        ]);

        // Transform the flat aggregated data into a grouped format per person
        const report = {};
        attendanceData.forEach(record => {
            if (!report[record.personnel_id]) {
                report[record.personnel_id] = {
                    id: record.personnel_id,
                    name: record.name,
                    role: record.role,
                    totalDays: 0,
                    'On Site': 0,
                    'Remote': 0,
                    'Off Duty': 0,
                    'On Leave': 0
                };
            }
            report[record.personnel_id][record.status] = record.count;
            report[record.personnel_id].totalDays += record.count;
        });

        // Always fetch ALL personnel in the system and merge with attendance data
        // — ensures every person appears in the report, even those with no logs or no project assignment
        const allPersonnel = await Personnel.find({}).sort({ name: 1 });

        const merged = allPersonnel.map(p => {
            const pid = p._id.toString();
            if (report[pid]) {
                // Has attendance data — return actual counts
                return report[pid];
            }
            // No attendance logs for this person — return with zero counts
            return {
                id: p._id,
                name: p.name,
                role: p.role || 'Personnel',
                totalDays: 0,
                'On Site': 0,
                'Remote': 0,
                'Off Duty': 0,
                'On Leave': 0
            };
        });

        res.json(merged);

    } catch (error) {
        console.error("Error generating attendance report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
