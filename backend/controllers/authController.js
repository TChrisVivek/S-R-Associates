const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

// A placeholder or real Client ID should be set in .env
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_super_secret_key';

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // input validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // check existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
};

exports.googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'No credential provided' });
        }

        // We can optionally verify it securely with google-auth-library if CLIENT_ID is correctly set
        // But for robust flexibility, we can also decode the JWT directly to get the payload
        const payload = jwt.decode(credential);

        if (!payload || !payload.email) {
            return res.status(400).json({ message: 'Invalid Google token' });
        }

        const { email, name, picture } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            // Register new user as 'Pending'
            user = await User.create({
                username: name,
                email,
                profile_image: picture,
                role: 'Pending' // Explicitly set, even though it's default
                // Password is left empty as it's not required for Google users
            });
        }

        // Generate our own session JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Authenticated successfully',
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile_image: user.profile_image
            }
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ message: 'Server error during Google auth', error: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        // Bearer Token extraction
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Verify Auth Error:', error);
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};
