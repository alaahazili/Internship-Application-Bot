const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const internshipRoutes = require('./routes/internships');
const applicationRoutes = require('./routes/applications');
const emailRoutes = require('./routes/emails');
const aiRoutes = require('./routes/ai');
const scrapingRoutes = require('./routes/scraping');

// Import middleware
const { auth } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import services
const JobScrapingService = require('./services/JobScrapingService');
const EmailService = require('./services/EmailService');
const AIService = require('./services/AIService');
const NotificationService = require('./services/NotificationService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/internship-bot', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Middleware
app.use(compression());
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);
    
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`👤 User ${userId} joined their room`);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/auth', (req, res, next) => { console.log(`[API] /auth ${req.method} ${req.url}`); next(); }, authRoutes);
app.use('/api/users', (req, res, next) => { console.log(`[API] /users ${req.method} ${req.url}`); next(); }, auth, userRoutes);
app.use('/api/internships', (req, res, next) => { console.log(`[API] /internships ${req.method} ${req.url}`); next(); }, auth, internshipRoutes);
app.use('/api/applications', (req, res, next) => { console.log(`[API] /applications ${req.method} ${req.url}`); next(); }, auth, applicationRoutes);
app.use('/api/emails', (req, res, next) => { console.log(`[API] /emails ${req.method} ${req.url}`); next(); }, auth, emailRoutes);
app.use('/api/ai', (req, res, next) => { console.log(`[API] /ai ${req.method} ${req.url}`); next(); }, auth, aiRoutes);
app.use('/api/scraping', (req, res, next) => { console.log(`[API] /scraping ${req.method} ${req.url}`); next(); }, require('./routes/scraping'));

// Public routes (no authentication required)
app.use('/api/public/internships', (req, res, next) => { console.log(`[API] /public/internships ${req.method} ${req.url}`); next(); }, require('./routes/internships'));

// New public route: /api/public/internships/public
app.get('/api/public/internships/public', (req, res, next) => {
    // No authentication required
    // Returns formatted internship data
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.url} -`, err.message);
    errorHandler(err, req, res, next);
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize services
const jobScrapingService = new JobScrapingService();
const emailService = new EmailService();
const aiService = new AIService();
const notificationService = new NotificationService(io);

// Make services available globally
global.jobScrapingService = jobScrapingService;
global.emailService = emailService;
global.aiService = aiService;
global.notificationService = notificationService;

// Start scheduled tasks
const cron = require('node-cron');

// Daily job scraping at 6 AM
cron.schedule('0 6 * * *', async () => {
    console.log('🕕 Running daily job scraping...');
    try {
        await jobScrapingService.scrapeAllSources();
        console.log('✅ Daily job scraping completed');
    } catch (error) {
        console.error('❌ Daily job scraping failed:', error);
    }
});

// Hourly application follow-ups
cron.schedule('0 * * * *', async () => {
    console.log('🕕 Running hourly application follow-ups...');
    try {
        await notificationService.sendFollowUpReminders();
        console.log('✅ Hourly follow-ups completed');
    } catch (error) {
        console.error('❌ Hourly follow-ups failed:', error);
    }
});

// Weekly email digest
cron.schedule('0 9 * * 1', async () => {
    console.log('🕕 Running weekly email digest...');
    try {
        await emailService.sendWeeklyDigest();
        console.log('✅ Weekly digest completed');
    } catch (error) {
        console.error('❌ Weekly digest failed:', error);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        mongoose.connection.close(() => {
            console.log('✅ Database connection closed');
            process.exit(0);
        });
    });
});

module.exports = app; 