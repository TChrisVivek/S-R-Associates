const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db'); // Import the sequelize instance

const User = sequelize.define('User', {
  // Model attributes are defined here
  id: {
    type: DataTypes.UUID, // A unique ID for each user
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false, // This field cannot be empty
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Each email must be unique in the database
    validate: {
      isEmail: true, // Ensures the value is a valid email format
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user', // Default role for new users
  },
});

module.exports = User;