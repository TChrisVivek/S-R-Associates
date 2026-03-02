const mongoose = require('mongoose');
require('dotenv').config();
const Pin = require('./models/Pin');
const Project = require('./models/Project');

async function migratePins() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const pins = await Pin.find({ blueprint_id: { $exists: false } });
        console.log(`Found ${pins.length} old pins without blueprint_id`);

        for (const pin of pins) {
            const project = await Project.findById(pin.project_id);
            if (project && project.blueprints && project.blueprints.length > 0) {
                pin.blueprint_id = project.blueprints[0]._id;
                await pin.save();
                console.log(`Migrated pin ${pin._id}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

migratePins();
