require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
    const PersonnelAttendance = require('../models/PersonnelAttendance');
    const Personnel = require('../models/Personnel');
    
    const allPersonnel = await Personnel.find({}, '_id createdAt name');
    let deleted = 0;
    
    for (const person of allPersonnel) {
        if (!person.createdAt) continue;
        const createdDay = new Date(person.createdAt);
        createdDay.setUTCHours(0, 0, 0, 0);
        
        // Delete any auto-filled records written BEFORE this person's creation date
        const result = await PersonnelAttendance.deleteMany({
            personnel_id: person._id,
            date: { $lt: createdDay }
        });
        
        if (result.deletedCount > 0) {
            console.log(`Cleaned ${result.deletedCount} records for ${person.name} (created: ${createdDay.toDateString()})`);
        }
        deleted += result.deletedCount;
    }
    
    console.log('\nTotal deleted:', deleted, 'incorrect pre-creation attendance records');
    
    if (deleted === 0) {
        console.log('No incorrect records found — database is clean.');
    }
    
    mongoose.disconnect();
}).catch(e => {
    console.error('DB Error:', e.message);
    process.exit(1);
});
