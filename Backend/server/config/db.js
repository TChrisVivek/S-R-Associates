require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false, 
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(' Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    console.log('Database URL:', process.env.DATABASE_URL);
    process.exit(1); 
  }
};

module.exports = { connectDB, sequelize };
