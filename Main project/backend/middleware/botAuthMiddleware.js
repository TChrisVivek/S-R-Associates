const User = require('../models/User');

// Cache the bot user to avoid DB lookup on every request
let cachedBotUser = null;

/**
 * Middleware that authenticates requests using a static API key (X-Bot-Api-Key header).
 * Used by the WhatsApp bot microservice instead of JWT-based verifyToken.
 * 
 * - Validates the key against process.env.BOT_API_KEY
 * - Looks up (or creates) a dedicated "BuildCore Bot" user in the DB
 * - Sets req.user with Admin role so downstream controllers + activity logging work unchanged
 */
const verifyBotApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-bot-api-key'];

    if (!apiKey) {
        return res.status(401).json({ message: 'Unauthorized: No API key provided' });
    }

    if (apiKey !== process.env.BOT_API_KEY) {
        return res.status(401).json({ message: 'Unauthorized: Invalid API key' });
    }

    try {
        // Use cached bot user if available
        if (cachedBotUser) {
            req.user = {
                _id: cachedBotUser._id,
                role: cachedBotUser.role,
                email: cachedBotUser.email,
                userId: cachedBotUser._id
            };
            return next();
        }

        // Find or create the bot user
        let botUser = await User.findOne({ email: 'bot@buildcore.internal' });

        if (!botUser) {
            botUser = await User.create({
                username: 'BuildCore Bot',
                email: 'bot@buildcore.internal',
                role: 'Admin',
                profile_image: 'https://ui-avatars.com/api/?name=Bot&background=6366f1&color=fff'
            });
            console.log('✅ Created BuildCore Bot user:', botUser._id);
        }

        cachedBotUser = botUser;

        req.user = {
            _id: botUser._id,
            role: botUser.role,
            email: botUser.email,
            userId: botUser._id
        };

        next();
    } catch (error) {
        console.error('Bot Auth Error:', error);
        return res.status(500).json({ message: 'Internal error during bot authentication' });
    }
};

module.exports = { verifyBotApiKey };
