const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Product = require('../models/Product');

const connectDB = async () => {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        const conn = await mongoose.connect(mongoUri);
        console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);

        // Seed mock products for the test environment
        const count = await Product.countDocuments();
        if (count === 0) {
            await Product.insertMany([
                { name: 'Wireless Mouse', price: 29.99, stock: 50 },
                { name: 'Mechanical Keyboard', price: 99.99, stock: 15 },
                { name: '27-inch Monitor', price: 249.99, stock: 10 },
                { name: 'USB-C Hub', price: 39.99, stock: 0 },
                { name: 'Bluetooth Headphones', price: 79.99, stock: 25 },
            ]);
            console.log("Mock products seeded to database!");
        }

    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
