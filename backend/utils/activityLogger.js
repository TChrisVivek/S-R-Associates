const ActivityLog = require('../models/ActivityLog');

/**
 * Utility function to asynchronously log user activity in the database.
 * Does not block the main execution thread.
 * 
 * @param {String} userId - The ID of the user performing the action.
 * @param {String} action - Identifier for the action (e.g., 'CREATED_PROJECT').
 * @param {String} entityType - Category of the entity ('Project', 'Material', etc.).
 * @param {String} details - Human-readable description.
 * @param {String} [entityId=null] - Optional ID of the related document.
 */
const logActivity = (userId, action, entityType, details, entityId = null) => {
    // Run asynchronously to not block API response
    setImmediate(async () => {
        try {
            await ActivityLog.create({
                user: userId,
                action,
                entityType,
                details,
                entityId
            });
        } catch (error) {
            console.error('[ActivityLogger Error] Failed to log activity:', error);
        }
    });
};

module.exports = logActivity;
