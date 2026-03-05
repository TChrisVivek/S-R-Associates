require('dotenv').config();
const mongoose = require('mongoose');
const { recordDailyAttendance } = require('./utils/cronJobs');

const connectDB = require('./config/database');

const run = async () => {
    try {
        await connectDB();
        await recordDailyAttendance();
        console.log("Seeding complete. Exiting...");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

run();
