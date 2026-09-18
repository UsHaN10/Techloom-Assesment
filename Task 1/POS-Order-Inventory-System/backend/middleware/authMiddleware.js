const jwt = require('jsonwebtoken');

// Middleware to authenticate user via JWT
const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-dev');
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to require specific roles
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Access denied: No role assigned' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied: Requires one of ${allowedRoles.join(', ')}` });
        }

        next();
    };
};

module.exports = { authenticateUser, requireRole };
