import { initDB } from './src/config/db.js';
import { User } from './src/models/User.js';
import { Product } from './src/models/Product.js';
import bcrypt from 'bcryptjs';

async function run() {
    await initDB();
    const user = await User.create({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test',
        role: 'ADMIN'
    });
    const u = await User.findOne({ email: 'test@test.com' });
    console.log('Stored Password Hash exists:', Boolean(u.password));
    const valid = await bcrypt.compare('password123', u.password);
    console.log('Password valid:', valid);
    const prodCount = await Product.countDocuments();
    console.log('Products count:', prodCount);
    console.log('PostgreSQL test completed successfully!');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
