const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Project = require('./models/Project');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const indexes = await Project.collection.getIndexes();
        console.log("Current Indexes:", indexes);

        // Check if there is an index on 'title'
        if (indexes.title_1) {
            console.log("Found index on 'title'. Dropping it...");
            await Project.collection.dropIndex('title_1');
            console.log("Dropped 'title_1' index.");
        } else {
            console.log("No index found on 'title'.");
        }

        console.log("Done.");
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
