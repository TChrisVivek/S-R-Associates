const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  console.log('--- TEST ROUTE HIT ---');
  console.log('Request Body Received:', req.body);

  if (req.body === undefined) {
    console.log('FATAL: req.body is UNDEFINED. The express.json() middleware is not working correctly.');
  } else if (Object.keys(req.body).length === 0) {
    console.log('WARNING: req.body is an EMPTY OBJECT. Check Postman body/headers.');
  } else {
    console.log('SUCCESS: req.body has data.');
  }

  // We send a simple response to prevent timeout
  res.status(200).json({ status: 'Test complete', body: req.body });
};

module.exports = { registerUser };