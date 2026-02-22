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
app.use(cors());
app.use(express.json());

const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/pins', pinRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/settings', settingsRoutes); // Added route

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
