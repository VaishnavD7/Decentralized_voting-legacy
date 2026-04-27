const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const protect = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

const adminOnly = (req, res, next) => {
    const adminWallet = (process.env.ADMIN_WALLET || '').toLowerCase();
    const userWallet = (req.user && req.user.walletAddress) ? req.user.walletAddress.toLowerCase() : '';

    if ((req.user && req.user.role === 'ADMIN') || (userWallet && userWallet === adminWallet)) {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = { protect, adminOnly };
