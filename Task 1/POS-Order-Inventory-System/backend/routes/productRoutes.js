const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');
const { authenticateUser, requireRole } = require('../middleware/authMiddleware');

router.use(authenticateUser);

const formatProduct = (p) => ({
    _id: p.id,
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stock: Number(p.stock) - Number(p.reserved_stock || 0),
    originalStock: Number(p.stock)
});

// Get all products
router.get('/', requireRole('ADMIN', 'CASHIER', 'STAFF'), async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(rows.map(formatProduct));
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error fetching products' });
    }
});

// Create product
router.post('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        const newId = Date.now().toString();

        const { rows } = await pool.query(
            `INSERT INTO products (id, name, price, stock, reserved_stock, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 0, NOW(), NOW())
             RETURNING *`,
            [newId, name, Number(price) || 0, parseInt(stock, 10) || 0]
        );

        res.status(201).json(formatProduct(rows[0]));
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Server error creating product' });
    }
});

// Update product
router.put('/:id', requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        const { rows } = await pool.query(
            `UPDATE products 
             SET name = COALESCE($1, name),
                 price = COALESCE($2, price),
                 stock = COALESCE($3, stock),
                 updated_at = NOW()
             WHERE id = $4
             RETURNING *`,
            [name, price !== undefined ? Number(price) : null, stock !== undefined ? parseInt(stock, 10) : null, req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(formatProduct(rows[0]));
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Server error updating product' });
    }
});

// Delete product
router.delete('/:id', requireRole('ADMIN', 'STAFF'), async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Server error deleting product' });
    }
});

module.exports = router;
