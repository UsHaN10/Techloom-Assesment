import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';

function formatUser(row, includePassword = false) {
    if (!row) return null;
    const userObj = {
        _id: row._id,
        email: row.email,
        name: row.name,
        role: row.role || 'STAFF',
        isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
        createdAt: row.created_at || row.createdAt,
        updatedAt: row.updated_at || row.updatedAt
    };
    if (includePassword && row.password) {
        userObj.password = row.password;
    }
    return userObj;
}

export class User {
    constructor(data = {}) {
        this._id = data._id || crypto.randomUUID();
        this.email = data.email ? data.email.toLowerCase().trim() : '';
        this.password = data.password;
        this.name = data.name;
        this.role = ['ADMIN', 'CASHIER', 'STAFF'].includes(data.role) ? data.role : 'STAFF';
        this.isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
        this.createdAt = data.createdAt || data.created_at || new Date();
        this.updatedAt = data.updatedAt || data.updated_at || new Date();
        this._originalPassword = data.password;
    }

    toJSON() {
        const copy = { ...this };
        delete copy.password;
        delete copy._originalPassword;
        return copy;
    }

    async save() {
        if (!this.email || !this.name) {
            throw new Error('Email and name are required');
        }

        // Hash password if newly set or modified and not already a bcrypt hash
        if (this.password && (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$'))) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }

        const sql = `
            INSERT INTO users (_id, email, password, name, role, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (_id) DO UPDATE
            SET email = EXCLUDED.email,
                password = EXCLUDED.password,
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                updated_at = NOW()
            RETURNING *;
        `;

        try {
            const res = await query(sql, [
                this._id,
                this.email,
                this.password,
                this.name,
                this.role,
                this.isActive
            ]);
            const row = res.rows[0];
            this.createdAt = row.created_at;
            this.updatedAt = row.updated_at;
            this._originalPassword = this.password;
            return this;
        } catch (err) {
            if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique')) {
                const error = new Error('Email already in use');
                error.code = 11000; // Mongoose duplicate key code compatibility
                throw error;
            }
            throw err;
        }
    }

    static async findOne(filter = {}) {
        if (filter.email) {
            const sql = `SELECT * FROM users WHERE email = $1;`;
            const res = await query(sql, [filter.email.toLowerCase().trim()]);
            if (res.rows.length === 0) return null;
            return new User(formatUser(res.rows[0], true));
        }
        if (filter._id) {
            return this.findById(filter._id);
        }
        return null;
    }

    static async findById(id) {
        const userId = (id && typeof id === 'object' && id._id) ? id._id : id;
        const sql = `SELECT * FROM users WHERE _id = $1;`;
        const res = await query(sql, [userId]);
        if (res.rows.length === 0) return null;
        return new User(formatUser(res.rows[0], true));
    }

    static find() {
        // Return a query chain helper supporting .select() and .sort()
        return {
            _select: null,
            _sort: null,
            select(fields) {
                this._select = fields;
                return this;
            },
            sort(sortObj) {
                this._sort = sortObj;
                return this;
            },
            then(resolve, reject) {
                return this.exec().then(resolve, reject);
            },
            async exec() {
                const sql = `SELECT * FROM users ORDER BY created_at DESC;`;
                const res = await query(sql);
                return res.rows.map(row => {
                    const u = new User(formatUser(row, false));
                    return u.toJSON();
                });
            }
        };
    }

    static async create(userData) {
        const user = new User(userData);
        await user.save();
        return user;
    }

    static async countDocuments(filter = {}) {
        let sql = `SELECT COUNT(*)::int AS count FROM users WHERE 1=1`;
        const params = [];

        if (filter.role) {
            params.push(filter.role);
            sql += ` AND role = $${params.length}`;
        }
        if (filter.isActive !== undefined) {
            params.push(Boolean(filter.isActive));
            sql += ` AND is_active = $${params.length}`;
        }

        const res = await query(sql, params);
        return parseInt(res.rows[0].count, 10);
    }

    static async findByIdAndDelete(id) {
        const userId = (id && typeof id === 'object' && id._id) ? id._id : id;
        const sql = `DELETE FROM users WHERE _id = $1 RETURNING *;`;
        const res = await query(sql, [userId]);
        return res.rows.length > 0;
    }
}
