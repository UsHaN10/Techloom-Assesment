require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production' || 
    (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));

const useSsl = isProduction && connectionString && !connectionString.includes('railway.internal');

let activePool = null;

const createPgPool = () => {
    const p = new Pool({
        connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/pos-system',
        ssl: useSsl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000
    });
    p.on('error', (err) => {
        console.error('[PostgreSQL Pool] Idle client error:', err.message);
    });
    return p;
};

if (connectionString) {
    activePool = createPgPool();
}

// Proxy pool delegating to whichever pool is active (native PostgreSQL or fallback)
const pool = {
    query: (...args) => {
        if (!activePool) throw new Error('Database pool not initialized');
        return activePool.query(...args);
    },
    connect: () => {
        if (!activePool) throw new Error('Database pool not initialized');
        return activePool.connect();
    }
};

const setupInMemoryDb = async () => {
    const { newDb } = require('pg-mem');
    const db = newDb();
    const memPg = db.adapters.createPg();
    activePool = new memPg.Pool();
    activePool.on('error', (err) => {
        console.error('[pg-mem Pool] Idle client error:', err.message);
    });
    const client = await activePool.connect();
    console.log('[PostgreSQL] In-memory PostgreSQL engine ready.');
    return client;
};

const initialProducts = [
    { id: '1', name: 'Wireless Mouse', price: 8990.00, stock: 50, reserved_stock: 0 },
    { id: '2', name: 'Mechanical Keyboard', price: 29990.00, stock: 15, reserved_stock: 0 },
    { id: '3', name: '27-inch Monitor', price: 75000.00, stock: 10, reserved_stock: 0 },
    { id: '4', name: 'USB-C Hub', price: 11990.00, stock: 0, reserved_stock: 0 },
    { id: '5', name: 'Bluetooth Headphones', price: 23990.00, stock: 25, reserved_stock: 0 },
    { id: '6', name: 'Gaming Laptop', price: 389990.00, stock: 5, reserved_stock: 0 },
    { id: '7', name: 'Ergonomic Desk Chair', price: 59900.00, stock: 8, reserved_stock: 0 },
    { id: '8', name: '4K Web Camera', price: 26900.00, stock: 30, reserved_stock: 0 },
    { id: '9', name: 'Noise-Cancelling Earbuds', price: 44900.00, stock: 40, reserved_stock: 0 },
    { id: '10', name: 'External 1TB SSD', price: 32900.00, stock: 12, reserved_stock: 0 },
    { id: '11', name: 'RGB Mouse Pad', price: 7500.00, stock: 60, reserved_stock: 0 },
    { id: '12', name: 'Desktop Microphone', price: 20900.00, stock: 18, reserved_stock: 0 },
    { id: '13', name: 'Smart Home Speaker', price: 14900.00, stock: 22, reserved_stock: 0 },
    { id: '14', name: 'Dual Monitor Stand', price: 17900.00, stock: 0, reserved_stock: 0 },
    { id: '15', name: 'VR Headset', price: 119900.00, stock: 4, reserved_stock: 0 }
];

const initDatabase = async () => {
    let client;
    if (activePool) {
        try {
            client = await activePool.connect();
            console.log('[PostgreSQL] Connected to PostgreSQL server.');
        } catch (err) {
            console.warn(`[PostgreSQL] Warning: Connection to PostgreSQL failed: ${err.message}`);
            console.warn('[PostgreSQL] Falling back to in-memory PostgreSQL emulator (pg-mem) to keep system online.');
            client = await setupInMemoryDb();
        }
    } else {
        console.log('[PostgreSQL] No DATABASE_URL provided. Starting in-memory PostgreSQL emulator (pg-mem)...');
        client = await setupInMemoryDb();
    }

    try {
        console.log('[PostgreSQL] Initializing tables & seeding initial data...');

        // 1. Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 2. Products table
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                price NUMERIC(12, 2) NOT NULL,
                stock INT NOT NULL DEFAULT 0,
                reserved_stock INT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 3. Orders table
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(50) PRIMARY KEY,
                items JSONB NOT NULL,
                total NUMERIC(12, 2) NOT NULL,
                status VARCHAR(20) NOT NULL,
                reservation_expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Seed products if table is empty
        const { rows: prodCount } = await client.query('SELECT COUNT(*) FROM products');
        if (parseInt(prodCount[0].count, 10) === 0) {
            console.log('[PostgreSQL] Seeding initial product catalog...');
            for (const p of initialProducts) {
                await client.query(
                    `INSERT INTO products (id, name, price, stock, reserved_stock) VALUES ($1, $2, $3, $4, $5)`,
                    [p.id, p.name, p.price, p.stock, p.reserved_stock]
                );
            }
            console.log(`[PostgreSQL] Seeded ${initialProducts.length} default products.`);
        }

        // Seed default admin if no ADMIN exists
        const { rows: adminCount } = await client.query(`SELECT COUNT(*) FROM users WHERE role = 'ADMIN'`);
        if (parseInt(adminCount[0].count, 10) === 0) {
            console.log('[PostgreSQL] No ADMIN found. Creating default admin...');
            const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@paycart.com';
            const adminPasswordPlain = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
            const hashedPassword = await bcrypt.hash(adminPasswordPlain, 10);

            await client.query(
                `INSERT INTO users (id, name, email, password, role, is_active) VALUES ($1, $2, $3, $4, $5, $6)`,
                ['admin-1', 'System Admin', adminEmail, hashedPassword, 'ADMIN', true]
            );
            console.log(`[PostgreSQL] Default admin created successfully: ${adminEmail}`);
        }

        console.log('[PostgreSQL] Database schema and initial seeds ready.');
    } catch (error) {
        console.error('[PostgreSQL] Database initialization error:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

const expireOverdueReservations = async () => {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const { rows: expiredOrders } = await client.query(`
            SELECT id, items FROM orders 
            WHERE status = 'Reserved' AND reservation_expires_at < NOW() 
            FOR UPDATE
        `);

        for (const order of expiredOrders) {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            for (const item of items) {
                const pid = item.id || item.productId;
                const qty = Number(item.qty);
                await client.query(
                    `UPDATE products SET reserved_stock = GREATEST(0, reserved_stock - $1), updated_at = NOW() WHERE id = $2`,
                    [qty, pid]
                );
            }
            await client.query(
                `UPDATE orders SET status = 'Expired', updated_at = NOW() WHERE id = $1`,
                [order.id]
            );
            console.log(`[PostgreSQL Worker] Order ${order.id} expired; stock un-reserved.`);
        }

        await client.query('COMMIT');
    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('[PostgreSQL Worker] Overdue reservations error:', err.message);
    } finally {
        if (client) client.release();
    }
};

module.exports = {
    pool,
    initDatabase,
    expireOverdueReservations
};
