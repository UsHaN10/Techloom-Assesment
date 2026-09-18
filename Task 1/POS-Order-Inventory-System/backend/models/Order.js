const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Reserved', 'Paid', 'Cancelled', 'Expired', 'Failed'],
        default: 'Pending'
    },
    reservationExpiresAt: { type: Date }
}, {
    timestamps: true
});

// Index to automatically expire if TTL is needed, but we'll use a cron/timeout or check-on-read mechanism for explicitly handling reserved stock restoration.
module.exports = mongoose.model('Order', orderSchema);
