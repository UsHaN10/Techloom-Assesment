import express from 'express';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';

const router = express.Router();

router.post('/process', async (req, res) => {
    try {
        const { orderId, outcome } = req.body; // outcome: 'SUCCESS', 'FAILED', 'TIMEOUT'

        // Find and update status to prevent duplicate processing using a concurrent-safe filter
        // Only process if status is 'Reserved'
        const statusUpdate = outcome === 'SUCCESS' ? 'Paid'
            : outcome === 'FAILED' ? 'Failed'
                : 'Expired';

        const order = await Order.findOneAndUpdate(
            { _id: orderId, status: "Reserved" },
            { $set: { status: statusUpdate } },
            { new: true }
        );

        if (!order) {
            throw new Error("Order not found or already processed (not in Reserved state).");
        }

        // Release stock on failures
        if (outcome === 'FAILED' || outcome === 'TIMEOUT') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
            }
        }

        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
