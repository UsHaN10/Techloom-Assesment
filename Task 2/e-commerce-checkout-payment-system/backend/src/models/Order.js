import crypto from 'crypto';
import { query } from '../config/db.js';
import { Product } from './Product.js';

function formatOrder(row) {
    if (!row) return null;
    let items = row.items;
    if (typeof items === 'string') {
        try {
            items = JSON.parse(items);
        } catch {
            items = [];
        }
    }
    return {
        _id: row._id,
        total: parseFloat(row.total),
        status: row.status,
        expiresAt: row.expires_at || row.expiresAt,
        items: items || [],
        createdAt: row.created_at || row.createdAt,
        updatedAt: row.updated_at || row.updatedAt
    };
}

export class Order {
    constructor(data = {}) {
        this._id = data._id || crypto.randomUUID();
        this.total = data.total !== undefined ? parseFloat(data.total) : 0;
        this.status = data.status || 'Pending';
        this.expiresAt = data.expiresAt || data.expires_at || null;
        let items = data.items || [];
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch { items = []; }
        }
        this.items = items;
        this.createdAt = data.createdAt || data.created_at || new Date();
        this.updatedAt = data.updatedAt || data.updated_at || new Date();
    }

    async save() {
        const sql = `
            INSERT INTO orders (_id, total, status, expires_at, items, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (_id) DO UPDATE
            SET total = EXCLUDED.total,
                status = EXCLUDED.status,
                expires_at = EXCLUDED.expires_at,
                items = EXCLUDED.items,
                updated_at = NOW()
            RETURNING *;
        `;
        const res = await query(sql, [
            this._id,
            this.total,
            this.status,
            this.expiresAt ? new Date(this.expiresAt) : null,
            JSON.stringify(this.items)
        ]);
        const formatted = formatOrder(res.rows[0]);
        Object.assign(this, formatted);
        return this;
    }

    static async findById(id) {
        const orderId = (id && typeof id === 'object' && id._id) ? id._id : id;
        const sql = `SELECT * FROM orders WHERE _id = $1;`;
        const res = await query(sql, [orderId]);
        if (res.rows.length === 0) return null;
        return new Order(formatOrder(res.rows[0]));
    }

    static find(filter = {}) {
        const chain = {
            _filter: filter,
            _sort: null,
            _populateFields: [],
            sort(sortObj) {
                this._sort = sortObj;
                return this;
            },
            populate(field) {
                this._populateFields.push(field);
                return this;
            },
            then(resolve, reject) {
                return this.exec().then(resolve, reject);
            },
            async exec() {
                let sql = `SELECT * FROM orders WHERE 1=1`;
                const params = [];

                if (filter.status) {
                    params.push(filter.status);
                    sql += ` AND status = $${params.length}`;
                }

                if (filter.expiresAt && filter.expiresAt.$lte) {
                    params.push(new Date(filter.expiresAt.$lte));
                    sql += ` AND expires_at <= $${params.length}`;
                }

                sql += ` ORDER BY created_at DESC;`;

                const res = await query(sql, params);
                const orders = res.rows.map(row => new Order(formatOrder(row)));

                // Handle population for items.productId
                if (this._populateFields.includes('items.productId')) {
                    // Fetch all relevant products in batch
                    const productMap = new Map();
                    const allProducts = await Product.find();
                    for (const p of allProducts) {
                        productMap.set(p._id, p);
                    }

                    for (const order of orders) {
                        for (const item of order.items) {
                            const rawId = (typeof item.productId === 'object' && item.productId?._id)
                                ? item.productId._id
                                : item.productId;
                            const prod = productMap.get(rawId);
                            if (prod) {
                                item.productId = prod;
                            } else {
                                item.productId = { _id: rawId, name: 'Unknown Product', price: item.price };
                            }
                        }
                    }
                }

                return orders;
            }
        };

        return chain;
    }

    static async findOneAndUpdate(filter, update, options = {}) {
        const orderId = (filter._id && typeof filter._id === 'object' && filter._id._id) ? filter._id._id : filter._id;
        const newStatus = update.$set?.status || update.status;

        if (!newStatus) return null;

        let sql = `UPDATE orders SET status = $1, updated_at = NOW() WHERE _id = $2`;
        const params = [newStatus, orderId];

        if (filter.status) {
            params.push(filter.status);
            sql += ` AND status = $${params.length}`;
        }

        sql += ` RETURNING *;`;

        const res = await query(sql, params);
        if (res.rows.length === 0) return null;
        return new Order(formatOrder(res.rows[0]));
    }
}
