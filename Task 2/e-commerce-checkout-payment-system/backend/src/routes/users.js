import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All user routes protected, require authentication and ADMIN role
router.use(authenticateUser, requireRole('ADMIN'));

// 1. Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error retrieving users' });
    }
});

// 2. Add new user
router.post('/', async (req, res) => {
    try {
        const { email, password, name, role, isActive } = req.body;

        // Prevent accidental 'ADMIN' creation through UI if not explicitly allowed
        if (role === 'ADMIN' && req.user.role !== 'ADMIN') { // Just a double check
            return res.status(403).json({ error: 'Not authorized to create ADMIN accounts' });
        }

        // Default fallback to STAFF just in case
        const safeRole = ['ADMIN', 'CASHIER', 'STAFF'].includes(role) ? role : 'STAFF';

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const newUser = new User({
            email,
            password,
            name,
            role: safeRole,
            isActive: isActive !== undefined ? isActive : true
        });

        await newUser.save();
        res.status(201).json(newUser); // Password automatically filtered by schema model
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

// 3. Update User
router.put('/:id', async (req, res) => {
    try {
        const { email, name, role, isActive, password } = req.body;

        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

        // Prevent modification of the last Admin role to something else
        if (userToUpdate.role === 'ADMIN' && role !== 'ADMIN') {
            const adminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot demote the single remaining active ADMIN account.' });
            }
        }

        // Prevent deactivating the last Admin
        if (userToUpdate.role === 'ADMIN' && isActive === false) {
            const adminCount = await User.countDocuments({ role: 'ADMIN', isActive: true });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot deactivate the single remaining active ADMIN account.' });
            }
        }

        if (email) userToUpdate.email = email;
        if (name) userToUpdate.name = name;
        if (role && ['ADMIN', 'CASHIER', 'STAFF'].includes(role)) userToUpdate.role = role;
        if (isActive !== undefined) userToUpdate.isActive = isActive;

        // Optionally update password if provided
        if (password && password.length >= 6) {
            userToUpdate.password = password;
        }

        await userToUpdate.save();
        res.json(userToUpdate);
    } catch (error) {
        console.error(error);
        if (error.code === 11000) return res.status(400).json({ error: 'Email already in use' });
        res.status(500).json({ error: 'Error updating user' });
    }
});

// 4. Delete user
router.delete('/:id', async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) return res.status(404).json({ error: 'User not found' });

        if (userToDelete.role === 'ADMIN') {
            const adminCount = await User.countDocuments({ role: 'ADMIN' });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot delete the single remaining ADMIN account.' });
            }
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting user' });
    }
});

export default router;
