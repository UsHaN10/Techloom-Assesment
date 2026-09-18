import crypto from 'crypto';
import { query } from '../config/db.js';

function formatProduct(row) {
    if (!row) return null;
    return {
        _id: row._id,
        name: row.name,
        price: parseFloat(row.price),
        stock: parseInt(row.stock, 10),
        category: row.category,
        imageUrl: row.image_url || row.imageUrl,
        createdAt: row.created_at || row.createdAt,
        updatedAt: row.updated_at || row.updatedAt
    };
}

export class Product {
    constructor(data = {}) {
        this._id = data._id || crypto.randomUUID();
        this.name = data.name;
        this.price = data.price !== undefined ? parseFloat(data.price) : 0;
        this.stock = data.stock !== undefined ? parseInt(data.stock, 10) : 0;
        this.category = data.category;
        this.imageUrl = data.imageUrl || data.image_url;
        this.createdAt = data.createdAt || data.created_at || new Date();
        this.updatedAt = data.updatedAt || data.updated_at || new Date();
    }

    async save() {
        if (!this.name || this.price === undefined || this.stock === undefined || !this.category || !this.imageUrl) {
            throw new Error('Missing required product fields');
        }
        if (this.price < 0) throw new Error('Price cannot be negative');
        if (this.stock < 0) throw new Error('Stock cannot be negative');

        const sql = `
            INSERT INTO products (_id, name, price, stock, category, image_url, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (_id) DO UPDATE
            SET name = EXCLUDED.name,
                price = EXCLUDED.price,
                stock = EXCLUDED.stock,
                category = EXCLUDED.category,
                image_url = EXCLUDED.image_url,
                updated_at = NOW()
            RETURNING *;
        `;
        const res = await query(sql, [
            this._id,
            this.name,
            this.price,
            this.stock,
            this.category,
            this.imageUrl
        ]);
        const formatted = formatProduct(res.rows[0]);
        Object.assign(this, formatted);
        return this;
    }

    static async find() {
        const sql = `SELECT * FROM products ORDER BY created_at ASC;`;
        const res = await query(sql);
        return res.rows.map(formatProduct);
    }

    static async findById(id) {
        const prodId = (id && typeof id === 'object' && id._id) ? id._id : id;
        const sql = `SELECT * FROM products WHERE _id = $1;`;
        const res = await query(sql, [prodId]);
        return formatProduct(res.rows[0]);
    }

    static async findOneAndUpdate(filter, update, options = {}) {
        const prodId = (filter._id && typeof filter._id === 'object' && filter._id._id) ? filter._id._id : filter._id;

        // Support { stock: { $gte: quantity } } and { $inc: { stock: -quantity } }
        if (filter.stock && filter.stock.$gte !== undefined && update.$inc && update.$inc.stock !== undefined) {
            const decQty = parseInt(Math.abs(update.$inc.stock), 10);
            if (isNaN(decQty)) return null;

            const sql = `
                UPDATE products
                SET stock = stock - ${decQty}, updated_at = NOW()
                WHERE _id = $1 AND stock >= ${decQty}
                RETURNING *;
            `;
            const res = await query(sql, [prodId]);
            return formatProduct(res.rows[0]);
        }

        // Generic update fallback
        if (update.$inc && update.$inc.stock !== undefined) {
            return this.findByIdAndUpdate(prodId, update, options);
        }

        return null;
    }

    static async findByIdAndUpdate(id, update, options = {}) {
        const prodId = (id && typeof id === 'object' && id._id) ? id._id : id;

        if (update.$inc && update.$inc.stock !== undefined) {
            const incQty = parseInt(update.$inc.stock, 10);
            if (isNaN(incQty)) return null;

            const sql = `
                UPDATE products
                SET stock = stock + ${incQty}, updated_at = NOW()
                WHERE _id = $1
                RETURNING *;
            `;
            const res = await query(sql, [prodId]);
            return formatProduct(res.rows[0]);
        }

        return null;
    }

    static async countDocuments() {
        const sql = `SELECT COUNT(*)::int AS count FROM products;`;
        const res = await query(sql);
        return parseInt(res.rows[0].count, 10);
    }

    static async insertMany(productsArray) {
        const results = [];
        for (const item of productsArray) {
            const prod = new Product(item);
            await prod.save();
            results.push(prod);
        }
        return results;
    }
}
