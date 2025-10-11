require('dotenv').config();
const express = require('express');
const { connectDB, sequelize } = require('./config/db');
const userRoutes = require('./routes/userRoutes');

const PORT = process.env.PORT || 6969;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/users', userRoutes);

app.get('/api', (req, res) => {
  res.send('API is running...');
});

const start = async () => {
  try {
    // 1. First, connect to the database and wait for it to succeed.
    await connectDB();

    // 2. Second, sync the database tables.
    await sequelize.sync();
    console.log('Database tables synchronized.');

    // 3. Only after the database is ready, start listening for web requests.
    app.listen(PORT, () => {
      console.log(`Server is now running and stable on port ${PORT}`);
    });

  } catch (error) {
    // If any step in the startup fails, we log the error and exit.
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();