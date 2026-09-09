const { matchGroupToProject } = require('../src/projectDiscovery');

// We need to load cache first
const api = require('../src/apiClient');
api.fetchProjects = async () => ({
    projects: [
        { id: 1, title: '130-bhakti enterprises', blocks: [], blockMode: false }
    ]
});

async function test() {
    const { loadProjects } = require('../src/projectDiscovery');
    await loadProjects();
    
    try {
        const res = matchGroupToProject('130-SRA-Bhakti Enterprises Murali');
        console.log('Result:', res);
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

test();
