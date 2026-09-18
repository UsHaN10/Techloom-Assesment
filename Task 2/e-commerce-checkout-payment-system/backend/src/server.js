import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './config/db.js';

import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import { Order } from './models/Order.js';
import { Product } from './models/Product.js';
import { User } from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// In a real production app we'd secure /products, /orders etc as well.
// But as per specific requirements, /users is the critical protected part for RBAC setup.

// Serve frontend static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Ensure React Router handles client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// Background Job to expire reservations every 1 minute
setInterval(async () => {
    try {
        const now = new Date();
        // Only find ones that are still reserved
        const expiredOrders = await Order.find({ status: 'Reserved', expiresAt: { $lte: now } });

        for (const order of expiredOrders) {
            // Try to transition status safely
            const updatedOrder = await Order.findOneAndUpdate(
                { _id: order._id, status: 'Reserved' },
                { $set: { status: 'Expired' } },
                { new: true }
            );

            if (updatedOrder) {
                // Restore stock
                for (const item of updatedOrder.items) {
                    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
                }
            }
        }
    } catch (err) {
        console.error('Background job error:', err.message);
    }
}, 60 * 1000);

const start = async () => {
    try {
        await initDB();

        // Seed initial products if none exist
        const count = await Product.countDocuments();
        if (count === 0) {
            await Product.insertMany([
                { name: "Wireless Headphones", price: 99.99, stock: 10, category: "Electronics", imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2940&auto=format&fit=crop" },
                { name: "Smart Watch", price: 149.50, stock: 5, category: "Electronics", imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2899&auto=format&fit=crop" },
                { name: "Cotton T-Shirt", price: 19.99, stock: 50, category: "Clothing", imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2960&auto=format&fit=crop" },
                { name: "Running Shoes", price: 89.99, stock: 2, category: "Footwear", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2940&auto=format&fit=crop" }
            ]);
            console.log('Seeded database with initial products');
        }

        // Seed default admin user if none exists
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@paycart.com';
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';

            await User.create({
                email: defaultEmail,
                password: defaultPassword, // Gets hashed by pre-save hook
                name: 'System Admin',
                role: 'ADMIN',
                isActive: true
            });
            console.log(`Seeded default admin user: ${defaultEmail}`);
        }

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (err) {
        console.error('Error starting server', err);
    }
};

start();
