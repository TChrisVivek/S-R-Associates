const api = require('./apiClient');
const logger = require('./utils/logger');

/**
 * In-memory cache of projects fetched from the backend.
 * Map<projectTitle (lowercase), { projectId, title, blocks: [{ id, name }], blockMode }>
 */
let projectCache = new Map();

/**
 * Map of resolved group IDs to project data.
 * Once a group name is matched to a project, it's cached here for fast lookup.
 * Map<groupId, { projectId, title, blocks, blockMode }>
 */
let groupToProjectMap = new Map();

/**
 * Fetch all projects (with blocks) from the backend and cache them.
 * Returns the number of projects loaded.
 */
async function loadProjects() {
    const data = await api.fetchProjects();

    projectCache.clear();
    for (const project of data.projects) {
        projectCache.set(project.title.toLowerCase().trim(), {
            projectId: project.id,
            title: project.title,
            blockMode: project.blockMode,
            blocks: project.blocks || []
        });
    }

    logger.info(`Project cache loaded: ${Array.from(projectCache.keys()).join(', ')}`);
    return projectCache.size;
}

/**
 * Try to match a WhatsApp group name to a project in the cache.
 * Uses substring matching: if the group name contains a project title (or vice versa), it's a match.
 *
 * @param {string} groupName - The WhatsApp group display name
 * @returns {{ projectId, title, blocks, blockMode } | null}
 */
function matchGroupToProject(groupName) {
    if (!groupName) return null;
    const input = groupName.toLowerCase().trim();

    // Exact match first
    if (projectCache.has(input)) {
        return projectCache.get(input);
    }

    // Token-based match: project title tokens must all be contained in group name
    const groupTokens = input.split(/[\s\-_]+/).filter(Boolean);

    for (const [titleLower, project] of projectCache) {
        // Substring match fallback (e.g. "site123" in "super-site123-group")
        if (input.includes(titleLower) || titleLower.includes(input)) {
            return project;
        }

        // Token match (e.g. "130-bhakti" matches "130-SRA-Bhakti")
        const projectTokens = titleLower.split(/[\s\-_]+/).filter(Boolean);
        const allTokensPresent = projectTokens.every(token => 
            groupTokens.some(gToken => gToken.includes(token) || token.includes(gToken))
        );

        if (allTokensPresent && projectTokens.length > 0) {
            return project;
        }
    }

    return null;
}

/**
 * Resolve a group message's origin to a project.
 * Caches the group → project mapping after first resolution.
 *
 * @param {string} groupId - The WhatsApp group ID (xxxxx@g.us)
 * @param {string} groupName - The WhatsApp group display name
 * @returns {{ projectId, title, blocks, blockMode } | null}
 */
function resolveGroup(groupId, groupName) {
    // Check cache first
    if (groupToProjectMap.has(groupId)) {
        return groupToProjectMap.get(groupId);
    }

    // Try to match by name
    const project = matchGroupToProject(groupName);
    if (project) {
        groupToProjectMap.set(groupId, project);
        logger.info(`🔗 Mapped group "${groupName}" (${groupId}) → project "${project.title}"`);
    }

    return project;
}

/**
 * Get the block names for a project (used in LLM prompts).
 * @param {string} projectId
 * @returns {string[]} Array of block names
 */
function getBlockNames(projectId) {
    for (const project of projectCache.values()) {
        if (project.projectId === projectId) {
            return project.blocks.map(b => b.name);
        }
    }
    return [];
}

/**
 * Schedule periodic refresh of the project cache (every 6 hours).
 */
function startPeriodicRefresh() {
    setInterval(async () => {
        try {
            const count = await loadProjects();
            logger.info(`🔄 Project cache refreshed: ${count} projects`);
        } catch (err) {
            logger.warn(`Failed to refresh project cache: ${err.message}`);
        }
    }, 6 * 60 * 60 * 1000); // 6 hours
}

module.exports = {
    loadProjects,
    matchGroupToProject,
    resolveGroup,
    getBlockNames,
    startPeriodicRefresh
};
