const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token, authorization denied' });
        }

        // Verify token
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user exists
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'Token is not valid' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        // Check API usage limits
        if (!user.canMakeRequest()) {
            return res.status(429).json({ error: 'Daily API limit exceeded. Please try again tomorrow.' });
        }

        req.user = decoded;
        req.userProfile = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token is not valid' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired' });
        }
        
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Server error in authentication' });
    }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.userId).select('-password');
        if (user && user.isActive) {
            req.user = decoded;
            req.userProfile = user;
        }

        next();

    } catch (error) {
        // Don't fail for optional auth
        next();
    }
};

// Admin auth middleware
const adminAuth = async (req, res, next) => {
    try {
        // First check if user is authenticated
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token, authorization denied' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'Token is not valid' });
        }

        // Check if user is admin (you can add an isAdmin field to your User model)
        if (!user.isAdmin) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        req.user = decoded;
        req.userProfile = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token is not valid' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired' });
        }
        
        console.error('Admin auth middleware error:', error);
        res.status(500).json({ error: 'Server error in authentication' });
    }
};

// Rate limiting middleware for specific endpoints
const rateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        if (requests.has(key)) {
            requests.set(key, requests.get(key).filter(timestamp => timestamp > windowStart));
        }
        
        const userRequests = requests.get(key) || [];
        
        if (userRequests.length >= max) {
            return res.status(429).json({ 
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        userRequests.push(now);
        requests.set(key, userRequests);
        
        next();
    };
};

module.exports = { auth, optionalAuth, adminAuth, rateLimit }; 