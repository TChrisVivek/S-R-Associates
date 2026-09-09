/**
 * migrateToBlocks.js
 * 
 * One-time, SAFE, IDEMPOTENT migration script.
 * 
 * What it does:
 *   1. For every existing Project, creates one Block named "Main Block"
 *      (only if no Block already exists for that project).
 *   2. Copies the project's blueprints[] into the new Block.
 *   3. Updates every DailyLog, Material, and Pin that references that
 *      project_id (but has no block_id yet) to reference the new Block.
 * 
 * What it does NOT do:
 *   - It never deletes any data.
 *   - Running it multiple times is safe — already-migrated docs are skipped.
 * 
 * Usage:
 *   node scripts/migrateToBlocks.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Project = require('../models/Project');
const Block = require('../models/Block');
const DailyLog = require('../models/DailyLog');
const Material = require('../models/Material');
const Pin = require('../models/Pin');

async function migrate() {
    console.log('\n=== S R Associates → Block Migration ===\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const projects = await Project.find({});
        console.log(`Found ${projects.length} project(s) to process.\n`);

        let blocksCreated = 0;
        let logsUpdated = 0;
        let materialsUpdated = 0;
        let pinsUpdated = 0;

        for (const project of projects) {
            const projectId = project._id;

            // Check if this project already has any Block (idempotency guard)
            const existingBlock = await Block.findOne({ project_id: projectId });

            let block;
            if (existingBlock) {
                console.log(`  ↪ Project "${project.title}" already has a block — skipping block creation.`);
                block = existingBlock;
            } else {
                // Create "Main Block" and copy blueprints from project
                const blueprintsCopy = (project.blueprints || []).map(bp => ({
                    url: bp.url,
                    originalUrl: bp.originalUrl,
                    name: bp.name || 'Document',
                    uploadedAt: bp.uploadedAt || new Date()
                }));

                block = new Block({
                    project_id: projectId,
                    name: 'Main Block',
                    description: 'Default block created during system upgrade',
                    status: 'In Progress',
                    blueprints: blueprintsCopy,
                    order: 0
                });

                await block.save();
                blocksCreated++;
                console.log(`  ✅ Created "Main Block" for project "${project.title}" (${blueprintsCopy.length} blueprint(s) migrated)`);
            }

            const blockId = block._id;

            // Migrate DailyLogs (only those without a block_id yet)
            const logResult = await DailyLog.updateMany(
                { project_id: projectId, block_id: { $exists: false } },
                { $set: { block_id: blockId } }
            );
            logsUpdated += logResult.modifiedCount;

            // Migrate Materials (only those without a block_id yet)
            const matResult = await Material.updateMany(
                { project_id: projectId, block_id: { $exists: false } },
                { $set: { block_id: blockId } }
            );
            materialsUpdated += matResult.modifiedCount;

            // Migrate Pins (only those without a block_id yet)
            const pinResult = await Pin.updateMany(
                { project_id: projectId, block_id: { $exists: false } },
                { $set: { block_id: blockId } }
            );
            pinsUpdated += pinResult.modifiedCount;

            if (logResult.modifiedCount > 0 || matResult.modifiedCount > 0 || pinResult.modifiedCount > 0) {
                console.log(`     Migrated: ${logResult.modifiedCount} log(s), ${matResult.modifiedCount} material(s), ${pinResult.modifiedCount} pin(s)`);
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`  Blocks created:    ${blocksCreated}`);
        console.log(`  Logs updated:      ${logsUpdated}`);
        console.log(`  Materials updated: ${materialsUpdated}`);
        console.log(`  Pins updated:      ${pinsUpdated}`);
        console.log('\nYour existing data is untouched. The website will continue to work normally.\n');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.\n');
    }
}

migrate();
