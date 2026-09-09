const fetch = require('node-fetch');

async function testCreatePin() {
    try {
        // Generate fake ObjectIds for testing
        const fakeProjectId = '507f1f77bcf86cd799439011';
        const fakeBlueprintId = '507f1f77bcf86cd799439012';

        const response = await fetch('http://localhost:3000/api/pins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                project_id: fakeProjectId,
                blueprint_id: fakeBlueprintId,
                title: 'Test Pin detected',
                x_cord: 45.5,
                y_cord: 60.2
            })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error);
    }
}

testCreatePin();
