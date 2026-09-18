const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/postgres');
const { authenticateUser, requireRole } = require('../middleware/authMiddleware');

// All routes in this file require ADMIN role
router.use(authenticateUser);
router.use(requireRole('ADMIN'));

// Helper to format safe user
const formatUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.is_active,
    createdAt: u.created_at,
    updatedAt: u.updated_at
});

// GET all users
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        res.json(rows.map(formatUser));
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error fetching users' });
    }
});

// GET single user
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(formatUser(rows[0]));
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error fetching user' });
    }
});

// POST new user
router.post('/', async (req, res) => {
    try {
        const { name, email, password, role, isActive } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (role === 'ADMIN') {
            return res.status(403).json({ message: 'Cannot create an ADMIN through normal user creation API' });
        }

        const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newId = Date.now().toString();
        const activeStatus = isActive !== undefined ? isActive : true;

        const { rows } = await pool.query(
            `INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING *`,
            [newId, name, email, hashedPassword, role, activeStatus]
        );

        res.status(201).json(formatUser(rows[0]));
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server error creating user' });
    }
});

// PUT update user (except password)
router.put('/:id', async (req, res) => {
    try {
        const { name, email, role, isActive } = req.body;
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = rows[0];

        // Prevent changing role of the last ADMIN to CASHIER/STAFF
        if (user.role === 'ADMIN' && role !== 'ADMIN') {
            const { rows: adminRows } = await pool.query(
                `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true`
            );
            const activeAdmins = parseInt(adminRows[0].count, 10);
            if (activeAdmins <= 1) {
                return res.status(403).json({ message: 'Cannot change the role of the last active ADMIN' });
            }
        }

        if (email !== user.email) {
            const { rows: duplicate } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (duplicate.length > 0) {
                return res.status(409).json({ message: 'Email already exists' });
            }
        }

        const updatedActive = isActive !== undefined ? isActive : user.is_active;

        const { rows: updatedRows } = await pool.query(
            `UPDATE users 
             SET name = $1, email = $2, role = $3, is_active = $4, updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [name || user.name, email || user.email, role || user.role, updatedActive, req.params.id]
        );

        res.json(formatUser(updatedRows[0]));
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error updating user' });
    }
});

// PATCH change status
router.patch('/:id/status', async (req, res) => {
    try {
        const { isActive } = req.body;
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = rows[0];

        if (user.role === 'ADMIN' && !isActive) {
            const { rows: adminRows } = await pool.query(
                `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true`
            );
            const activeAdmins = parseInt(adminRows[0].count, 10);
            if (activeAdmins <= 1) {
                return res.status(403).json({ message: 'Cannot deactivate the last active ADMIN' });
            }
        }

        await pool.query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, req.params.id]);
        res.json({ message: 'Status updated successfully', isActive });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server error updating status' });
    }
});

// PATCH reset/change password
router.patch('/:id/password', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ message: 'Password is required' });

        const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.params.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Server error updating password' });
    }
});

// DELETE user
router.delete('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = rows[0];
        if (user.role === 'ADMIN') {
            const { rows: adminRows } = await pool.query(
                `SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND is_active = true`
            );
            const activeAdmins = parseInt(adminRows[0].count, 10);
            if (activeAdmins <= 1) {
                return res.status(403).json({ message: 'Cannot delete the last active ADMIN' });
            }
        }

        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error deleting user' });
    }
});

module.exports = router;
