/**
 * fixBlueprintMigration.js
 *
 * Targeted fix: The original migrateToBlocks.js read project.blueprints
 * through the Mongoose model, but by that point the Project schema had already
 * dropped the blueprints field — so Mongoose returned [] for every project
 * and blocks were created with zero blueprints.
 *
 * This script uses .lean() (raw MongoDB documents, schema-independent) to read
 * the real blueprints from the project collection and copies them into the
 * existing Main Block for each project.
 *
 * SAFE & IDEMPOTENT — only updates blocks that currently have 0 blueprints
 * and whose parent project actually has blueprints in the raw MongoDB doc.
 *
 * Usage:
 *   node scripts/fixBlueprintMigration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Block = require('../models/Block');

async function fix() {
    console.log('\n=== Blueprint Fix Migration ===\n');

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Use lean() + direct collection access to bypass schema field stripping
        const rawProjects = await mongoose.connection
            .collection('projects')
            .find({})
            .toArray();

        console.log(`Found ${rawProjects.length} project(s) to inspect.\n`);

        let fixed = 0;
        let skipped = 0;
        let alreadyHasBlueprints = 0;

        for (const rawProject of rawProjects) {
            const projectId = rawProject._id;
            const rawBlueprints = rawProject.blueprints || [];

            if (rawBlueprints.length === 0) {
                skipped++;
                continue; // No blueprints to migrate
            }

            // Find the Main Block (first block, created by migration)
            const block = await Block.findOne({ project_id: projectId }).sort({ order: 1, createdAt: 1 });

            if (!block) {
                console.log(`  ⚠️  No block found for project "${rawProject.title}" — run migrateToBlocks.js first.`);
                skipped++;
                continue;
            }

            if (block.blueprints && block.blueprints.length > 0) {
                console.log(`  ↪ Block "${block.name}" for "${rawProject.title}" already has ${block.blueprints.length} blueprint(s) — skipping.`);
                alreadyHasBlueprints++;
                continue;
            }

            // Copy blueprints from raw project doc to the block
            const blueprintsCopy = rawBlueprints.map(bp => ({
                url: bp.url || bp.originalUrl,
                originalUrl: bp.originalUrl || bp.url,
                name: bp.name || 'Document',
                uploadedAt: bp.uploadedAt || new Date()
            }));

            block.blueprints = blueprintsCopy;
            await block.save();

            console.log(`  ✅ "${rawProject.title}" → copied ${blueprintsCopy.length} blueprint(s) to block "${block.name}"`);
            fixed++;
        }

        console.log('\n=== Fix Complete ===');
        console.log(`  Projects fixed:           ${fixed}`);
        console.log(`  Already had blueprints:   ${alreadyHasBlueprints}`);
        console.log(`  Skipped (no blueprints):  ${skipped}`);
        console.log('\nNo data was deleted. Safe to run again.\n');

    } catch (error) {
        console.error('\n❌ Fix failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.\n');
    }
}

fix();
