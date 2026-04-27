const { query } = require('../config/db');
const { transporter } = require('../services/emailService');

exports.checkHealth = async (req, res) => {
    const health = {
        status: 'operational',
        timestamp: new Date(),
        components: {
            database: { status: 'unknown' },
            email: { status: 'unknown' }
        }
    };

    // Check Database
    try {
        const { rows } = await query('SELECT 1');
        if (rows && rows.length > 0) {
            health.components.database.status = 'connected';
        } else {
            health.components.database.status = 'error';
            health.status = 'degraded';
        }
    } catch (err) {
        health.components.database.status = 'error';
        health.components.database.message = err.message;
        health.status = 'degraded';
    }

    // Check Email (SMTP)
    try {
        await transporter.verify();
        health.components.email.status = 'connected';
    } catch (err) {
        health.components.email.status = 'error';
        health.components.email.message = err.message;
        // Don't mark overall system as degraded if just email is down, or maybe do? 
        // For this app, email is critical for registration, so yes.
        health.status = 'degraded';
    }

    const statusCode = health.status === 'operational' ? 200 : 503;
    res.status(statusCode).json(health);
};
