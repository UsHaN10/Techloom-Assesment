import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

let pool = null;
let isInMemory = false;

export async function getPool() {
    if (pool) return pool;

    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
        console.log('Connecting to PostgreSQL using DATABASE_URL...');
        const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
        const isSslExplicitlyDisabled = connectionString.includes('sslmode=disable');
        const useSsl = !isLocalhost && !isSslExplicitlyDisabled;

        pool = new Pool({
            connectionString,
            ssl: useSsl ? { rejectUnauthorized: false } : false
        });

        try {
            await pool.query('SELECT 1');
            console.log('Successfully connected to PostgreSQL database via DATABASE_URL.');
            return pool;
        } catch (err) {
            console.error('Failed to connect via DATABASE_URL:', err.message);
            pool = null;
            throw err;
        }
    }

    if (process.env.PGHOST) {
        console.log('Connecting to PostgreSQL using PGHOST and related variables...');
        pool = new Pool({
            host: process.env.PGHOST,
            port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE || 'railway',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        try {
            await pool.query('SELECT 1');
            console.log('Successfully connected to PostgreSQL database via PGHOST.');
            return pool;
        } catch (err) {
            console.error('Failed to connect via PGHOST:', err.message);
            pool = null;
            throw err;
        }
    }

    // Try default local PostgreSQL if running
    try {
        const localPool = new Pool({
            connectionString: 'postgres://postgres:postgres@localhost:5432/pos_db',
            connectionTimeoutMillis: 1000
        });
        await localPool.query('SELECT 1');
        console.log('Connected to local PostgreSQL instance.');
        pool = localPool;
        return pool;
    } catch {
        // Local Postgres is not running, proceed to in-memory fallback
    }

    // Fallback to in-memory PostgreSQL (pg-mem) for offline / test local development
    console.log('No DATABASE_URL or PostgreSQL instance available.');
    console.log('Starting in-memory PostgreSQL emulator (pg-mem) for local development...');
    const { newDb } = await import('pg-mem');
    const memDb = newDb();
    const { Pool: MemPool } = memDb.adapters.createPg();
    pool = new MemPool();
    isInMemory = true;
    console.log('In-memory PostgreSQL emulator ready.');
    return pool;
}

export async function query(text, params) {
    const activePool = await getPool();
    return activePool.query(text, params);
}

export async function getClient() {
    const activePool = await getPool();
    return activePool.connect();
}

export async function initDB() {
    const activePool = await getPool();

    // 1. Users Table
    await activePool.query(`
        CREATE TABLE IF NOT EXISTS users (
            _id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'STAFF',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    // 2. Products Table
    await activePool.query(`
        CREATE TABLE IF NOT EXISTS products (
            _id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
            stock INT NOT NULL CHECK (stock >= 0),
            category VARCHAR(255) NOT NULL,
            image_url TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    // 3. Orders Table
    await activePool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            _id VARCHAR(36) PRIMARY KEY,
            total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
            status VARCHAR(50) NOT NULL DEFAULT 'Pending',
            expires_at TIMESTAMPTZ,
            items JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    // Indices for performance
    try {
        await activePool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
        await activePool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`);
    } catch {
        // In-memory or older versions might not support IF NOT EXISTS on indexes, safe to ignore
    }

    console.log('PostgreSQL database schema initialized successfully.');
}
