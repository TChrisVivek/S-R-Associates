const cron = require('node-cron');
const Personnel = require('../models/Personnel');

// Run every day at midnight (00:00)
// This job checks for personnel who are 'On Leave' and whose leaveEndDate has passed.
// It automatically resets their status back to 'On Site' and clears the leaveEndDate.
const initCronJobs = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running daily check for returning personnel...');
        try {
            const today = new Date();
            // Find personnel whose leave has ended (leaveEndDate is before or equal to right now)
            const returningPersonnel = await Personnel.find({
                status: 'On Leave',
                leaveEndDate: { $ne: null, $lte: today }
            });

            if (returningPersonnel.length > 0) {
                console.log(`[Cron] Found ${returningPersonnel.length} personnel returning today. Updating status...`);

                for (const person of returningPersonnel) {
                    person.status = 'On Site';
                    person.leaveEndDate = null;
                    await person.save();
                    console.log(`[Cron] Updated status for ${person.name} back to 'On Site'`);
                }
            } else {
                console.log('[Cron] No personnel returning from leave today.');
            }
        } catch (error) {
            console.error('[Cron Error] Failed to process returning personnel:', error);
        }
    });

    // Run every day at 11:55 PM (23:55) to snapshot attendance for the day
    cron.schedule('55 23 * * *', async () => {
        await recordDailyAttendance();
    });

    console.log('Cron jobs initialized.');
};

// Helper function to record today's attendance (can be called by cron or manually)
const recordDailyAttendance = async () => {
    const PersonnelAttendance = require('../models/PersonnelAttendance');
    console.log('[Cron] Recording daily attendance for all personnel...');
    try {
        const personnelList = await Personnel.find({});
        // Use the start of the current day in UTC to avoid time zone duplicates
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        let recordedCount = 0;
        for (const person of personnelList) {
            // Upsert attendance record for today so it doesn't duplicate if run twice
            await PersonnelAttendance.findOneAndUpdate(
                { personnel_id: person._id, date: today },
                {
                    project_id: person.project_id || null,
                    status: person.status
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            recordedCount++;
        }
        console.log(`[Cron] Successfully recorded attendance for ${recordedCount} personnel.`);
    } catch (error) {
        console.error('[Cron Error] Failed to record daily attendance:', error);
    }
};

module.exports = { initCronJobs, recordDailyAttendance };
