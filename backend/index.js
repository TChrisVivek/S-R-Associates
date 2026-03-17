const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const pinRoutes = require('./routes/pinRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Middleware
const allowedOrigins = [
    process.env.CLIENT_URL,
    'http://localhost:5173', // For local development
    'https://s-r-associates.vercel.app' // Vercel production URL
].filter(Boolean).map(url => url.replace(/\/$/, '')); // Remove trailing slashes

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS: ' + origin));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added for Form URL encoded logic

const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
// const activityLogRoutes = require('./routes/activityLogRoutes'); // Commented out as module is missing
const budgetRoutes = require('./routes/budgetRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pins', pinRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/personnel', personnelRoutes);
// app.use('/api/activities', activityLogRoutes); // Commented out as module is missing
app.use('/api/budget', budgetRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settings', settingsRoutes); // Added route

// Initialize Background Jobs
const { initCronJobs } = require('./utils/cronJobs');
initCronJobs();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
