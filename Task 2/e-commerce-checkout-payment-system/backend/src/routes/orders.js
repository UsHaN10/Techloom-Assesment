import express from 'express';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).populate('items.productId');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/reserve', async (req, res) => {
    const { items } = req.body; // Array of { productId, quantity }
    let total = 0;
    const orderItems = [];
    const successfulDecrements = [];

    try {
        for (const item of items) {
            // Concurrency safe check: find a product with enough stock and decrement it atomically.
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.productId, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            if (!updatedProduct) {
                throw new Error(`Insufficient stock for product ID: ${item.productId}`);
            }

            successfulDecrements.push({ productId: item.productId, quantity: item.quantity });
            total += updatedProduct.price * item.quantity;
            orderItems.push({
                productId: updatedProduct._id,
                quantity: item.quantity,
                price: updatedProduct.price
            });
        }

        // Lock for 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const order = new Order({
            items: orderItems,
            total,
            status: "Reserved",
            expiresAt
        });

        await order.save();
        res.status(201).json(order);
    } catch (error) {
        // Manual rollback if any step fails
        for (const dec of successfulDecrements) {
            await Product.findByIdAndUpdate(dec.productId, { $inc: { stock: dec.quantity } });
        }
        res.status(400).json({ error: error.message });
    }
});

router.post('/:id/cancel', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) throw new Error("Order not found");
        if (!["Pending", "Reserved", "Paid"].includes(order.status)) {
            throw new Error(`Cannot cancel order in ${order.status} state`);
        }

        const previousStatus = order.status;
        order.status = "Cancelled";
        await order.save();

        // Restore stock if it was reserved or paid
        if (previousStatus === 'Reserved' || previousStatus === 'Paid') {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { stock: item.quantity } }
                );
            }
        }

        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
