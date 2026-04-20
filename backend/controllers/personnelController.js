const mongoose = require('mongoose');
const Personnel = require('../models/Personnel');
const Vendor = require('../models/Vendor');
const logActivity = require('../utils/activityLogger');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Write a PersonnelAttendance record for a given person / project / date / status.
 * Silently swallows duplicate-key errors (unique index: personnel_id + date).
 */
async function writeAttendanceRecord(personnelId, projectId, date, status) {
    try {
        const PersonnelAttendance = require('../models/PersonnelAttendance');
        // Normalise to midnight UTC so the compound index works cleanly
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        await PersonnelAttendance.findOneAndUpdate(
            { personnel_id: personnelId, date: d },
            { $set: { personnel_id: personnelId, project_id: projectId || null, date: d, status } },
            { upsert: true, new: true }
        );
    } catch (err) {
        // Ignore duplicate-key errors; log everything else
        if (err.code !== 11000) console.error('writeAttendanceRecord error:', err.message);
    }
}

/**
 * Given a sorted array of PersonnelAttendance records for a person,
 * return the status that was in effect on `day` by finding the most recent
 * record on or before that day.  Falls back to the person's current status,
 * then to 'On Site'.
 */
function inferStatusOnDay(sortedRecords, day, fallbackStatus) {
    // sortedRecords: ascending by date
    let last = fallbackStatus || 'On Site';
    for (const rec of sortedRecords) {
        if (rec.date <= day) last = rec.status;
        else break;
    }
    return last;
}

// ─── 1. GET All Personnel ─────────────────────────────────────────────────────
exports.getPersonnel = async (req, res) => {
    try {
        const personnel = await Personnel.find().sort({ createdAt: -1 });
        res.json(personnel);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// ─── 2. POST Add New Member ───────────────────────────────────────────────────
exports.addPersonnel = async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        const existingMember = await Personnel.findOne({ $or: [{ email }, { phone }] });
        if (existingMember) {
            return res.status(400).json({ message: "Member already exists" });
        }

        const newMember = new Personnel(req.body);
        await newMember.save();

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'ADDED_PERSONNEL', 'Personnel',
                `Added new personnel: ${newMember.name} (${newMember.role || 'No role'})`, newMember._id);
        }

        res.status(201).json(newMember);
    } catch (error) {
        res.status(400).json({ message: "Failed to add member", error: error.message });
    }
};

// ─── 3. DELETE Remove Member ──────────────────────────────────────────────────
exports.deletePersonnel = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await Personnel.findByIdAndDelete(id);

        if (member) {
            const Project = require('../models/Project');
            await Project.updateMany({ manager: member.name }, { $set: { manager: 'Unassigned' } });
            await Project.updateMany({ contractor: member.name }, { $set: { contractor: 'Unassigned' } });
            // Remove from assignedPersonnel in all projects
            await Project.updateMany(
                { assignedPersonnel: member._id },
                { $pull: { assignedPersonnel: member._id } }
            );

            if (req.user && req.user._id) {
                logActivity(req.user._id, 'DELETED_PERSONNEL', 'Personnel',
                    `Removed personnel: ${member.name}`, id);
            }
        }

        res.json({ message: "Member removed" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete", error: error.message });
    }
};

// ─── 4. PUT Update Member ─────────────────────────────────────────────────────
exports.updatePersonnel = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedMember = await Personnel.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedMember) return res.status(404).json({ message: "Member not found" });

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'UPDATED_PERSONNEL', 'Personnel',
                `Updated personnel: ${updatedMember.name}`, updatedMember._id);
        }

        res.json(updatedMember);
    } catch (error) {
        res.status(400).json({ message: "Failed to update member", error: error.message });
    }
};

// ─── 5. PATCH Update Member Status + auto-record attendance ──────────────────
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

        // ── Auto-record today's attendance with the new status ────────────────
        // Find which project(s) this person is assigned to and write a record
        const Project = require('../models/Project');
        const projects = await Project.find({ assignedPersonnel: updatedMember._id }, '_id');
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (projects.length > 0) {
            // Write for their primary (first) project assignment
            await writeAttendanceRecord(updatedMember._id, projects[0]._id, today, status);
        } else {
            // Not assigned to any project yet — record without project
            await writeAttendanceRecord(updatedMember._id, null, today, status);
        }

        if (req.user && req.user._id) {
            logActivity(req.user._id, 'CHANGED_STATUS', 'Personnel',
                `Changed status of ${updatedMember.name} to "${status}"`, updatedMember._id);
        }

        res.json(updatedMember);
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(400).json({ message: "Failed to update status", error: error.message });
    }
};

// ─── 6. GET Project-Specific Personnel & Vendors ─────────────────────────────
exports.getProjectPersonnel = async (req, res) => {
    const { id: projectId } = req.params;

    try {
        const internalTeam = await Personnel.find({ project_id: projectId });
        const externalVendors = await Vendor.find({ project_id: projectId });

        const currentlyOnSite = internalTeam.filter(m => m.status === 'On Site').length;

        res.json({
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
                currentlyOnSite,
                externalVendors: externalVendors.length,
                safetyIncidents: 0
            }
        });
    } catch (error) {
        console.error("Error fetching project personnel:", error);
        res.status(500).json({ message: "Error fetching project personnel" });
    }
};

// ─── 7. GET Attendance Report ─────────────────────────────────────────────────
/**
 * Returns a FLAT array of { name, role, project, onSite, remote, onLeave, offDuty, total }.
 *
 * Modes:
 *   - projectId provided → only that project, show assigned roster + unassigned at bottom
 *   - no projectId       → all projects; each assigned (person × project) pair is one row;
 *                          people not assigned anywhere appear once at the bottom
 *
 * Gaps in PersonnelAttendance are auto-filled from the last known status (defaulting to 'On Site').
 */
exports.getAttendanceReport = async (req, res) => {
    try {
        const { projectId, month, year } = req.query;
        if (!year) {
            return res.status(400).json({ message: "Missing required parameter: year" });
        }

        // ── Date range ────────────────────────────────────────────────────────
        let startDate, endDate;
        if (month && month !== 'all' && month !== 'null' && month !== 'undefined') {
            startDate = new Date(Date.UTC(+year, +month - 1, 1));
            endDate   = new Date(Date.UTC(+year, +month, 0, 23, 59, 59, 999));
        } else {
            startDate = new Date(Date.UTC(+year, 0, 1));
            endDate   = new Date(Date.UTC(+year, 11, 31, 23, 59, 59, 999));
        }

        // Cap at today
        const today = new Date();
        today.setUTCHours(23, 59, 59, 999);
        if (endDate > today) endDate = today;

        const PersonnelAttendance = require('../models/PersonnelAttendance');
        const Project = require('../models/Project');

        // ── Build day list ────────────────────────────────────────────────────
        const days = [];
        const cur = new Date(startDate);
        while (cur <= endDate) {
            days.push(new Date(cur));
            cur.setUTCDate(cur.getUTCDate() + 1);
        }

        // ── Fetch projects to check ───────────────────────────────────────────
        const projectsToCheck = projectId
            ? await Project.find({ _id: projectId })
            : await Project.find({});

        // ── Fetch all personnel ───────────────────────────────────────────────
        const allPersonnel = await Personnel.find({}).sort({ name: 1 });

        /**
         * Build a map: projectId → Set of assigned personnel IDs
         * Merges BOTH assignment systems:
         *   1. New: Project.assignedPersonnel[] array
         *   2. Old: Personnel.project_id (each person pointing to a project)
         * This ensures existing data continues to work even if assignedPersonnel is empty.
         */
        const projectAssignmentMap = new Map(); // projectId (string) → Set of personnel IDs

        // Seed from new system (Project.assignedPersonnel)
        for (const proj of projectsToCheck) {
            const set = new Set((proj.assignedPersonnel || []).map(id => id.toString()));
            projectAssignmentMap.set(proj._id.toString(), set);
        }

        // Merge from old system (Personnel.project_id)
        for (const person of allPersonnel) {
            if (person.project_id) {
                const pid = person.project_id.toString();
                if (projectAssignmentMap.has(pid)) {
                    projectAssignmentMap.get(pid).add(person._id.toString());
                } else if (!projectId) {
                    // This person's project is not in projectsToCheck — add it anyway
                    projectAssignmentMap.set(pid, new Set([person._id.toString()]));
                }
            }
        }

        // ── Fetch ALL attendance records in the period (one query) ─────────────
        const matchFilter = { date: { $gte: startDate, $lte: endDate } };
        if (projectId) matchFilter.project_id = new mongoose.Types.ObjectId(projectId);
        const allRecords = await PersonnelAttendance.find(matchFilter).sort({ date: 1 });

        // Index: records[personnelId] = [record, ...]
        const recordsByPerson = {};
        allRecords.forEach(r => {
            const pid = r.personnel_id.toString();
            if (!recordsByPerson[pid]) recordsByPerson[pid] = [];
            recordsByPerson[pid].push(r);
        });

        // ── Helper: compute attendance counts for one (person, project) ────────
        const computeForPersonProject = async (person, proj) => {
            const pid = person._id.toString();
            const personRecords = recordsByPerson[pid] || [];

            const counts = { 'On Site': 0, 'Remote': 0, 'Off Duty': 0, 'On Leave': 0 };

            // ── Effective start: never count days before the person was created ──
            // person.createdAt is when they were added to the system.
            // We also only start once they are assigned to a project.
            const createdAt = person.createdAt ? new Date(person.createdAt) : startDate;
            createdAt.setUTCHours(0, 0, 0, 0);

            // Only days on or after this person's creation date matter
            const effectiveDays = days.filter(d => d >= createdAt);

            if (effectiveDays.length === 0) {
                // Person added after the report period ends — no data
                return {
                    name: person.name, role: person.role || 'Personnel',
                    project: proj ? proj.title : 'Not Assigned',
                    isAssigned: !!proj,
                    'On Site': 0, 'Remote': 0, 'On Leave': 0, 'Off Duty': 0, totalDays: 0
                };
            }

            // Last record before the range (for carry-forward status)
            const priorRecord = await PersonnelAttendance.findOne({
                personnel_id: person._id,
                date: { $lt: startDate }
            }).sort({ date: -1 });

            // Default status = current status, fall back to On Site
            const fallbackStatus = person.status || 'On Site';

            for (const day of effectiveDays) {
                const explicit = personRecords.find(r => {
                    const rd = new Date(r.date);
                    return rd.getUTCFullYear() === day.getUTCFullYear() &&
                           rd.getUTCMonth()    === day.getUTCMonth() &&
                           rd.getUTCDate()     === day.getUTCDate();
                });

                if (explicit) {
                    counts[explicit.status] = (counts[explicit.status] || 0) + 1;
                } else {
                    // Carry-forward: find the last recorded status before this day
                    const recsBefore = [...personRecords]
                        .filter(r => new Date(r.date) < day)
                        .sort((a, b) => new Date(a.date) - new Date(b.date));

                    let inferred = fallbackStatus;
                    if (recsBefore.length > 0) {
                        inferred = recsBefore[recsBefore.length - 1].status;
                    } else if (priorRecord) {
                        inferred = priorRecord.status;
                    }

                    counts[inferred] = (counts[inferred] || 0) + 1;
                    // Persist so future report calls are instant
                    await writeAttendanceRecord(person._id, proj ? proj._id : null, day, inferred);
                }
            }

            const total = Object.values(counts).reduce((s, v) => s + v, 0);
            return {
                name:       person.name,
                role:       person.role || 'Personnel',
                project:    proj ? proj.title : 'Not Assigned to Any Project',
                isAssigned: !!proj,
                'On Site':  counts['On Site'],
                'Remote':   counts['Remote'],
                'On Leave': counts['On Leave'],
                'Off Duty': counts['Off Duty'],
                totalDays:  total
            };
        };


        // ── Build a projectId → title lookup (handles project_id persons whose project isnt in projectsToCheck) ──
        const allProjectIds = new Set([
            ...projectsToCheck.map(p => p._id.toString()),
            ...allPersonnel.filter(p => p.project_id).map(p => p.project_id.toString())
        ]);
        const projectTitleMap = new Map();
        for (const proj of projectsToCheck) {
            projectTitleMap.set(proj._id.toString(), proj);
        }
        // Fetch any extra projects referenced by project_id but not in projectsToCheck
        const missingProjectIds = [...allProjectIds].filter(id => !projectTitleMap.has(id));
        if (missingProjectIds.length > 0) {
            const extraProjects = await Project.find({ _id: { $in: missingProjectIds } });
            extraProjects.forEach(p => projectTitleMap.set(p._id.toString(), p));
        }

        // ── Build the flat result list ─────────────────────────────────────────
        const rows = [];
        const assignedPersonnelIds = new Set();

        // One row per (project × assigned person) using the merged map
        for (const [projIdStr, personIdSet] of projectAssignmentMap.entries()) {
            // Skip projects not in our filter scope (when projectId param is given)
            if (projectId && projIdStr !== projectId.toString()) continue;

            const proj = projectTitleMap.get(projIdStr);
            const assignedPeople = allPersonnel.filter(p => personIdSet.has(p._id.toString()));

            for (const person of assignedPeople) {
                assignedPersonnelIds.add(person._id.toString());
                const row = await computeForPersonProject(person, proj || null);
                rows.push(row);
            }
        }

        // Unassigned personnel — people not in ANY project's roster (either system)
        const unassignedPeople = allPersonnel.filter(p => !assignedPersonnelIds.has(p._id.toString()));
        for (const person of unassignedPeople) {
            rows.push({
                name:       person.name,
                role:       person.role || 'Personnel',
                project:    'Not Assigned to Any Project',
                isAssigned: false,
                'On Site':  0,
                'Remote':   0,
                'On Leave': 0,
                'Off Duty': 0,
                totalDays:  0
            });
        }

        res.json(rows);

    } catch (error) {
        console.error("Error generating attendance report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

