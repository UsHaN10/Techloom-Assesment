require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, expireOverdueReservations } = require('./config/postgres');

const app = express();

app.use(cors());
app.use(express.json());

// Auth & User routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Business Logic routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve frontend build if dist folder exists (e.g., on Railway)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(distPath, 'index.html'));
        }
        next();
    });
} else {
    app.get('/', (req, res) => res.send('API Running. Build frontend with `npm run build` to serve UI.'));
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await initDatabase();

        // Start periodic cleanup of expired reservations (every 30 seconds)
        setInterval(expireOverdueReservations, 30000);
        expireOverdueReservations();

        app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
