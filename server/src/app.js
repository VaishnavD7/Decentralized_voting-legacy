require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { query } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // For face descriptors
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Routes
const healthController = require('./controllers/healthController');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/voters', require('./routes/voters'));
app.use('/api/community', require('./routes/community'));
app.use('/api/elections', require('./routes/elections'));
app.use('/api/relay', require('./routes/relay'));

// Health & Settings
app.get('/api/health', healthController.checkHealth);
app.get('/api/settings', (req, res) => {
    res.json({
        maintenance_mode: process.env.MAINTENANCE_MODE === 'true',
        verification_mode: 'BOTH',
        admin_wallet: process.env.ADMIN_WALLET
    });
});

// Start server
const initDb = require('./config/initDb');

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

module.exports = app;
