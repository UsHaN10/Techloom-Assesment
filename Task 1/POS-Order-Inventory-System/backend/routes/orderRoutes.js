const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');
const { authenticateUser, requireRole } = require('../middleware/authMiddleware');

const RESERVATION_EXPIRY_MINUTES = 5;

// Protected Order routes
router.use(authenticateUser);

const formatOrder = (o) => ({
    _id: o.id,
    id: o.id,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    total: Number(o.total),
    status: o.status,
    reservationExpiresAt: o.reservation_expires_at,
    date: o.created_at,
    createdAt: o.created_at
});

// Endpoint: Checkout (Create Order -> Status: Reserved)
router.post('/checkout', requireRole('ADMIN', 'CASHIER'), async (req, res) => {
    const { items } = req.body;
    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let total = 0;
        const processItems = [];

        for (const item of items) {
            const pid = (item.id || item.productId).toString();
            const qty = parseInt(item.qty, 10);

            // Row-level lock to prevent concurrent checkout race condition
            const { rows: prodRows } = await client.query(
                'SELECT id, name, price, stock, reserved_stock FROM products WHERE id = $1 FOR UPDATE',
                [pid]
            );

            if (prodRows.length === 0) {
                throw new Error(`Product ${item.name || pid} not found`);
            }

            const product = prodRows[0];
            const available = Number(product.stock) - Number(product.reserved_stock);

            if (available < qty) {
                throw new Error(`Insufficient stock for product ${product.name}`);
            }

            // Reserve stock
            await client.query(
                'UPDATE products SET reserved_stock = reserved_stock + $1, updated_at = NOW() WHERE id = $2',
                [qty, pid]
            );

            const itemPrice = Number(product.price);
            total += itemPrice * qty;
            processItems.push({
                productId: product.id,
                id: product.id,
                name: product.name,
                qty: qty,
                price: itemPrice
            });
        }

        const orderId = Date.now().toString();
        const expiresAt = new Date(Date.now() + RESERVATION_EXPIRY_MINUTES * 60000);

        const { rows: orderRows } = await client.query(
            `INSERT INTO orders (id, items, total, status, reservation_expires_at, created_at, updated_at)
             VALUES ($1, $2, $3, 'Reserved', $4, NOW(), NOW())
             RETURNING *`,
            [orderId, JSON.stringify(processItems), total, expiresAt]
        );

        await client.query('COMMIT');

        const createdOrder = formatOrder(orderRows[0]);

        // Scheduled timeout fallback
        setTimeout(async () => {
            let timeoutClient;
            try {
                timeoutClient = await pool.connect();
                await timeoutClient.query('BEGIN');
                const { rows } = await timeoutClient.query(
                    `SELECT id, items, status FROM orders WHERE id = $1 FOR UPDATE`,
                    [orderId]
                );
                if (rows.length > 0 && rows[0].status === 'Reserved') {
                    const orderItems = typeof rows[0].items === 'string' ? JSON.parse(rows[0].items) : rows[0].items;
                    for (const i of orderItems) {
                        const pid = i.id || i.productId;
                        await timeoutClient.query(
                            'UPDATE products SET reserved_stock = GREATEST(0, reserved_stock - $1), updated_at = NOW() WHERE id = $2',
                            [Number(i.qty), pid]
                        );
                    }
                    await timeoutClient.query(
                        `UPDATE orders SET status = 'Expired', updated_at = NOW() WHERE id = $1`,
                        [orderId]
                    );
                }
                await timeoutClient.query('COMMIT');
            } catch (err) {
                if (timeoutClient) await timeoutClient.query('ROLLBACK');
                console.error(`Error auto-expiring order ${orderId}:`, err.message);
            } finally {
                if (timeoutClient) timeoutClient.release();
            }
        }, RESERVATION_EXPIRY_MINUTES * 60000);

        res.status(201).json(createdOrder);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally {
        client.release();
    }
});

// Endpoint: Process Payment Outcome
router.post('/:id/payment', requireRole('ADMIN', 'CASHIER'), async (req, res) => {
    const { outcome } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: orderRows } = await client.query(
            'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
            [req.params.id]
        );

        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderRows[0];
        if (order.status !== 'Reserved') {
            throw new Error(`Order has already been processed (Current status: ${order.status})`);
        }

        const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

        let newStatus;
        if (outcome === 'success') {
            newStatus = 'Paid';
            for (const item of orderItems) {
                const pid = item.id || item.productId;
                const qty = Number(item.qty);
                await client.query(
                    `UPDATE products 
                     SET stock = GREATEST(0, stock - $1),
                         reserved_stock = GREATEST(0, reserved_stock - $1),
                         updated_at = NOW()
                     WHERE id = $2`,
                    [qty, pid]
                );
            }
        } else if (outcome === 'failure') {
            newStatus = 'Failed';
            for (const item of orderItems) {
                const pid = item.id || item.productId;
                const qty = Number(item.qty);
                await client.query(
                    `UPDATE products 
                     SET reserved_stock = GREATEST(0, reserved_stock - $1),
                         updated_at = NOW()
                     WHERE id = $2`,
                    [qty, pid]
                );
            }
        } else if (outcome === 'timeout') {
            newStatus = 'Expired';
            for (const item of orderItems) {
                const pid = item.id || item.productId;
                const qty = Number(item.qty);
                await client.query(
                    `UPDATE products 
                     SET reserved_stock = GREATEST(0, reserved_stock - $1),
                         updated_at = NOW()
                     WHERE id = $2`,
                    [qty, pid]
                );
            }
        } else {
            throw new Error('Invalid payment outcome');
        }

        const { rows: updatedOrderRows } = await client.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [newStatus, req.params.id]
        );

        await client.query('COMMIT');
        res.json(formatOrder(updatedOrderRows[0]));
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally {
        client.release();
    }
});

// Endpoint: Cancel Order
router.post('/:id/cancel', requireRole('ADMIN', 'CASHIER', 'STAFF'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: orderRows } = await client.query(
            'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
            [req.params.id]
        );

        if (orderRows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderRows[0];
        if (order.status === 'Cancelled' || order.status === 'Failed' || order.status === 'Expired') {
            throw new Error(`Order is already ${order.status}`);
        }

        const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

        if (order.status === 'Paid') {
            for (const item of orderItems) {
                const pid = item.id || item.productId;
                const qty = Number(item.qty);
                await client.query(
                    'UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE id = $2',
                    [qty, pid]
                );
            }
        } else if (order.status === 'Reserved') {
            for (const item of orderItems) {
                const pid = item.id || item.productId;
                const qty = Number(item.qty);
                await client.query(
                    'UPDATE products SET reserved_stock = GREATEST(0, reserved_stock - $1), updated_at = NOW() WHERE id = $2',
                    [qty, pid]
                );
            }
        }

        const { rows: updatedOrderRows } = await client.query(
            "UPDATE orders SET status = 'Cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
            [req.params.id]
        );

        await client.query('COMMIT');
        res.json(formatOrder(updatedOrderRows[0]));
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally {
        client.release();
    }
});

// Endpoint: Get Orders
router.get('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(rows.map(formatOrder));
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Server error fetching orders' });
    }
});

module.exports = router;
