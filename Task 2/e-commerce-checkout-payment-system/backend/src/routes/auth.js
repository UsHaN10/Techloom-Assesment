import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me';

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Verify hashed password
        let isMatch = await bcrypt.compare(password, user.password);

        // Fallback migration: If it fails bcrypt but matches plain text, migrating them to hashed.
        if (!isMatch && password === user.password) {
            isMatch = true;
            user.password = password; // Trigger pre-save hook to hash this legacy plain-text password
            await user.save();
        }

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign(
            { _id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // The password is excluded automatically by the schema's toJSON transform
        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication processing error' });
    }
});

export default router;
