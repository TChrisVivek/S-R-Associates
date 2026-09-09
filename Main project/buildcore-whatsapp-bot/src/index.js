require('dotenv').config();

const logger = require('./utils/logger');
const { initWhatsApp } = require('./whatsappClient');
const { loadProjects } = require('./projectDiscovery');
const { startEodCron } = require('./eodSummary');
const { loadCustomLabourRoles } = require('./ollamaExtractor');

async function main() {
    
    logger.info('  BuildCore WhatsApp Bot — Starting up...');
    

    // Step 1: Load projects from backend for auto-discovery
    logger.info(' Fetching projects from backend...');
    try {
        const projectCount = await loadProjects();
        logger.info(`Loaded ${projectCount} projects from backend`);
    } catch (err) {
        logger.warn(`⚠️  Could not load projects from backend: ${err.message}`);
        logger.warn('   Bot will still run in discovery mode');
    }

    // Step 2: Load custom labour role shortcodes from portal settings
    logger.info('Loading custom labour role codes from portal...');
    await loadCustomLabourRoles();

    // Step 3: Initialize WhatsApp client
    logger.info(' Initializing WhatsApp client...');
    const client = await initWhatsApp();

    // Step 4: Start the EOD summary cron job
    startEodCron(client);

    logger.info(' Bot is fully initialized and listening!');
}

main().catch((err) => {
    logger.error(`Fatal startup error: ${err.message}`, { stack: err.stack });
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', { reason: reason?.message || reason });
});
